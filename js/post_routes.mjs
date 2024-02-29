import express from 'express';
import { prompt_gemini, parse_api_response, sanitize_javascript, log, minify_html_snippet, take_screenshot, generate_image, upload_image } from './util.mjs';
import crypto from 'crypto';
import { isProfane } from 'no-profanity';
import emojiShortName from 'emoji-short-name';
import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

const router = express.Router();
const delay = ms => new Promise(res => setTimeout(res, ms));

router.post('/register', async (req, res) => {
    try {
        const username = req.body.username ? req.body.username.trim() : crypto.randomBytes(10).toString('hex');

        const username_exists_in_redis_client = await req.redis_client.exists(username)
        if (username_exists_in_redis_client) {
            res.status(400).send('Username already exists');
            return;
        }

        let htmlSnippet = req.body.htmlSnippet;
        let cssSnippet = req.body.cssSnippet;
        let jsSnippet = req.body.jsSnippet;

        const prompt = req.body.site_prompt;
        const prompt_is_profane = isProfane(prompt)
        if (prompt_is_profane) {
            res.status(400).send('Prompt contains profanity');
            return;
        }

        const prompt_valid = prompt.length > 0 ? true : false;
        let promptResponse = "";
        if (prompt_valid) {

            //const pre_prompt = `My current code is: html ${htmlSnippet} css ${cssSnippet} js ${jsSnippet} id like to: `
            let apiData = await prompt_gemini(prompt);
            promptResponse = apiData;
            let parsedData = await parse_api_response(apiData);
            htmlSnippet = parsedData.htmlCode;
            cssSnippet = parsedData.cssCode;
            jsSnippet = parsedData.jsCode;
        }

        cssSnippet = DOMPurify.sanitize(cssSnippet) || '';
        jsSnippet = await sanitize_javascript(jsSnippet) || '';

        log(jsSnippet)
        const cssHash = crypto.createHash('sha256').update(cssSnippet).digest('base64');
        const jsHash = crypto.createHash('sha256').update(jsSnippet).digest('base64');

        let replacedPrompt = "";
        //for each character in prompt, check if it is an emoji, if it is, replace it with the shortname
        for (let char of prompt) {
            if (emojiShortName.hasOwnProperty(char)) {
                replacedPrompt += emojiShortName[char] + " ";
            } else {
                replacedPrompt += char;
            }
        }
        log(replacedPrompt)
        const image64 = req.body.imageName ? await generate_image(`${username}: ${replacedPrompt}`, 'stabilityai/stable-diffusion-xl-base-1.0') : '';
        const image_upload_response = req.body.imageName ? await upload_image(image64) : '';

        const screenshot = await take_screenshot(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta http-equiv="X-UA-Compatible" content="IE=edge">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${username}</title>
                        <meta charset='UTF-8'>
                        <meta http-equiv='X-UA-Compatible' content='IE=edge'>
                        <meta name='viewport' content='width=device-width, initial-scale=1.0'>
                        <style integrity='sha256-${cssHash}'>${cssSnippet}</style>
                    </head>
                    <body>
                        <img src="data:image/png;base64,${image64}" alt="Generated Image">
                        <div id='${username}'>
                            ${htmlSnippet}
                        </div>
                        <script integrity='sha256-${jsHash}'>
                            ${jsSnippet}
                        </script>
                    </body>
                </html>
        `);
        delay(2000);// No no no..... but like for now i guess
        const screenshot_upload_response = await upload_image(screenshot)


        const snippet = {
            type: 'site',
            username: username,
            image_one: image_upload_response ? image_upload_response.data.url : '',
            puppeteer_screenshot_url: screenshot_upload_response.data.url,
            prompt_response: promptResponse,
            prompt: prompt,
            htmlSnippet: await minify_html_snippet(DOMPurify.sanitize(htmlSnippet)),
            cssSnippet: cssSnippet,
            jsSnippet: jsSnippet,
            cssHash: cssHash,
            jsHash: jsHash
        };


        await req.redis_client.set(username, JSON.stringify(snippet));

        res.redirect(`/${username}`)
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
        return;
    }
});

router.post('/prompt_image', async (req, res) => {
    try {
        const image_name = req.body.image_name ? req.body.image_name.trim() : crypto.randomBytes(10).toString('hex');

        const prompt = req.body.image_prompt;
        const prompt_is_profane = isProfane(prompt)
        if (prompt_is_profane) {
            res.status(400).send('Prompt contains profanity');
            return;
        }
        //i need to convert the prompt to a shortname if
        let replacedPrompt = "";
        //for each character in prompt, check if it is an emoji, if it is, replace it with the shortname
        for (let char of prompt) {
            if (emojiShortName.hasOwnProperty(char)) {
                replacedPrompt += emojiShortName[char] + " ";
            } else {
                replacedPrompt += char;
            }
        }
        const image64 = await generate_image(`${image_name} ${replacedPrompt}`, 'stabilityai/stable-diffusion-xl-base-1.0');

        console.log(JSON.stringify(image64, null, 2))
        const upload_response = await upload_image(image64)

        console.log(JSON.stringify(upload_response, null, 2))
        const url = upload_response["data"]["url"];
        log(url)

        await req.redis_client.set(image_name, JSON.stringify({ type: "image", puppeteer_screenshot_url: url, url: url }));

        res.redirect(`/${image_name}`)//res.send(image64);
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
        return;
    }
})



export default router;
