import express from 'express';
import { prompt_gemini, parse_api_response, sanitize_javascript, log, minify_html_snippet, take_screenshot, generateImage} from './util.mjs';
import crypto from 'crypto';
import { isProfane } from 'no-profanity';

import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

const router = express.Router();

router.post('/register', async (req, res) => {
    try {
        const username = req.body.username
        const username_exists_in_redis_client = await req.redis_client.exists(username) 
        if (username_exists_in_redis_client) {
            res.status(400).send('Username already exists');
            return;
        }

        let htmlSnippet = req.body.htmlSnippet;
        let cssSnippet = req.body.cssSnippet;
        let jsSnippet = req.body.jsSnippet;
    
        const prompt = req.body.prompt;
        const prompt_is_profane = isProfane(prompt)
        if(prompt_is_profane) {
            res.status(400).send('Prompt contains profanity');
            return;
        }

        const prompt_valid = prompt.length > 0 ? true : false;
        let promptResponse = "";
        if( prompt_valid ) {
            
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
        const image64 = await generateImage(`${username}: ${prompt}`, 'stabilityai/stable-diffusion-xl-base-1.0');

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


        const snippet = {
            image64: image64,
            screenshot: screenshot,
            promptResponse: promptResponse,
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


export default router;
    