import express from 'express';
import validator from 'validator';

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
                'xi-api-key':  process.env.ELEVENLAB_API_KEY,
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
        console.log(snippet);
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
        return;
    }

    if (snippet) {
        snippet = JSON.parse(snippet);
        res.setHeader('Content-Security-Policy', `style-src 'sha256-${snippet.cssHash}' script-src 'sha256-${snippet.jsHash}'`);
        res.send(`
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
                    <style integrity='sha256-${snippet.cssHash}'>${snippet.cssSnippet}</style>
                </head>
                <body>
                    <img src="data:image/png;base64,${snippet.image64}" alt="">
                    <div id='${username}'>
                        ${snippet.htmlSnippet}
                    </div>
                    <script integrity='sha256-${snippet.jsHash}'>
                        ${snippet.jsSnippet}
                    </script>
                </body>
            </html>
`);
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
        for (const key of keys) {
            const snippet = JSON.parse(await req.redis_client.get(key));
            snippets.push({ username: key, ...snippet });
        }

        // Render the 'sites' view, passing the snippets
        res.render('sites', { snippets: snippets });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});
export default router;