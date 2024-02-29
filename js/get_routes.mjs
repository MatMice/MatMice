import express from 'express';
import validator from 'validator';
import { log } from './util.mjs';
const router = express.Router();

router.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

router.get('/generateAudio', async (req, res) => {
    const { text, voice_id, model_id, pronunciation_dictionary_locators } = req.body;

    try {
        const options = {
            method: 'POST',
            headers: {
                'xi-api-key': process.env.ELEVENLAB_API_KEY,
                'Content-Type': 'routerlication/json'
            },
            body: ``` {
                "model_id":"eleven_monolingual_v1",
                "text":"test",
                "voice_settings": {
                    "stability":0.5,
                    "similarity_boost":0.5
                }
            }```
        };

        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}`, options);
        log(response);
        res.send(response)

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to generate audio' });
    }
});

router.get('/:username', async (req, res) => {
    const username = req.params.username;
    let snippet;
    try {
        snippet = await req.redis_client.get(username);
        log(snippet);
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
        return;
    }

    if (snippet) {
        snippet = JSON.parse(snippet);
        switch (snippet.type) {
            case 'image':
                res.setHeader('Content-Security-Policy', `img-src 'self' ${snippet.url}`);
                res.send(`
                    <!DOCTYPE html>
                    <html lang="en">
                    <head>
                        <meta charset="UTF-8">
                        <meta http-equiv="X-UA-Compatible" content="IE=edge">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>${username}</title>
                                </head>
                                <body>
                                    <img src="${snippet.url}" alt="">
                                </body>
                            </html>
                `);
                break;
            case 'site':
                //I need the content policy to include the css and js hashes as well

                res.setHeader('Content-Security-Policy', `img-src 'self' ${snippet.image_one}`);
                res.render('site', { snippet: snippet });
                break;
            case 'audio':
                break;
            case 'video':
                break;
            case 'story':
                break;
            case 'template':
                break;

            default:
                res.status(500).send('Invalid snippet type');
                return;
        }
        if (snippet.url) {

        } else {

        }

    } else {
        res.status(404).send('Not found');
    }
});

router.get('/random/page', async (req, res) => {
    try {
        const usernames = await req.redis_client.keys('*');
        if (usernames.length > 0) {
            const randomUsername = usernames[Math.floor(Math.random() * usernames.length)];

            // Validate the randomUsername before redirection
            if (validator.isAlphanumeric(randomUsername)) {
                res.redirect(`/${randomUsername}`);
            } else {
                res.status(500).send('Invalid username for redirection');
            }
        } else {
            res.status(404).send('No pages available');
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

router.get('/all/sites', async (req, res) => {
    try {
        // Get all keys from Redis
        const keys = await req.redis_client.keys('*');

        // Get all snippets from Redis
        const snippets = [];
        let cspUrls = ['self']; // start with 'self'

        for (const key of keys) {
            const snippet = JSON.parse(await req.redis_client.get(key));
            snippets.push({ username: key, ...snippet });

            // Add the puppeteer_screenshot_url to the CSP URLs
            if (snippet.puppeteer_screenshot_url) {
                cspUrls.push(snippet.puppeteer_screenshot_url);
            }
        }


        // Set the Content-Security-Policy header
        res.setHeader('Content-Security-Policy', `img-src ${cspUrls.join(' ')};`);
        // Render the 'sites' view, passing the snippets
        res.render('sites', { snippets: snippets });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

router.get('/redis/memory-info', (req, res) => {
    req.redis_client.info('memory', function (err, reply) {
        if (err) {
            res.status(500).send(err);
        } else {
            const memoryInfo = reply.split('\n').reduce((info, line) => {
                const parts = line.split(':');
                if (parts[1]) {
                    info[parts[0]] = parts[1];
                }
                return info;
            }, {});

            res.send(memoryInfo);
        }
    });
});

export default router;