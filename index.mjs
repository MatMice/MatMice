// Made with the help of ChatGPT 3.5
import dotenv from 'dotenv';
import express from 'express';
import bodyParser from 'body-parser';
import createDOMPurify from 'dompurify';
import validator from 'validator';
import helmet from 'helmet';
import { JSDOM } from 'jsdom';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import { createClient } from 'redis';
import { minify as minifyHtml } from 'html-minifier';
import postcss from 'postcss';
import cssnano from 'cssnano';
import { minify } from 'terser'; // Corrected import for terser
import { ESLint } from 'eslint';

dotenv.config(); // Load environment variables from .env file

const client = createClient({
    url: process.env.REDIS_URL
});

client.on('connect', function() {
    console.log('Connected to Redis...');
});

client.on('error', function (err) {
    console.error('Redis error:', err);
});

const app = express();
const port = process.env.PORT || 3000; // Use PORT from environment variables or default to 3000

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

app.use(helmet());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Internal Server Error');
});


//
const eslint = new ESLint({
    useEslintrc: false,
    baseConfig: {
        extends: ['eslint:recommended'],
        rules: {
            "no-unused-vars": "warn",
            "no-undef": "off"
        }
    },
});
const sanitizeJs = async (js) => {
    const results = await eslint.lintText(js);
    const formatter = await eslint.loadFormatter('stylish');
    const resultText = formatter.format(results);

    const hasCriticalIssue = results.some(result => result.messages.some(message => message.severity === 2));
    if (hasCriticalIssue) {
        console.log(`JavaScript code has critical issues:\n${resultText}`);
        return '';
    }
    if (results.some(result => result.errorCount > 0)) {
        console.log(`JavaScript code has errors:\n${resultText}`);
    }

    return js.replace(/\s/g, '');
};

// Apply rate limiting for /prompt and /register routes
const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 3, // Limit each IP to 1 requests per minute
    message: 'Too many requests from this IP, please try again after a minute.',
});


//
const minifyHtmlSnippet = (html) => {
    const minifiedHtml = minifyHtml(html, {
        collapseWhitespace: true,
        removeComments: true,
        removeOptionalTags: true,
        removeRedundantAttributes: true,
        removeScriptTypeAttributes: true,
        removeStyleLinkTypeAttributes: true,
        useShortDoctype: true
    });

    // Remove all newline characters
    const htmlWithoutNewlines = minifiedHtml.replace(/\n/g, '');
    return htmlWithoutNewlines;
};
const minifyCss = async (css) => {
    const result = await postcss([cssnano]).process(css);
    return result.css;
};

const minifyJs = (js) => {
    const result = minify(js);
    if (result.error) throw result.error;
    return result.code;
};
//
app.use('/prompt', limiter);
app.use('/register', limiter);

const storedSnippets = {};

app.get('/:username', async (req, res) => {
    const username = req.params.username;
    let snippet = storedSnippets[username];
    try {
        snippet = await client.get(username);
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

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

app.post('/register', async (req, res) => {
    
    const username = req.body.username;

    let htmlSnippet = req.body.htmlSnippet;
    let cssSnippet = req.body.cssSnippet;
    let jsSnippet = req.body.jsSnippet;

    let prompt = req.body.prompt;
    if(prompt.length > 0 ) {
        console.log("HERE");
        let prompt = req.body.prompt;
        let apiData = await promptGemini(prompt);
        console.log(apiData);
        let parsedData = parseApiResponse(apiData);
        console.log(parsedData);
        htmlSnippet = parsedData.htmlCode;
        cssSnippet = parsedData.cssCode;
        jsSnippet = parsedData.jsCode;
    }
    
    cssSnippet = DOMPurify.sanitize(cssSnippet) || '';
    jsSnippet = await sanitizeJs(jsSnippet) || '';
    
    console.log(jsSnippet)
    // Calculate SHA-256 hash for CSS snippet
    const cssHash = crypto.createHash('sha256').update(cssSnippet).digest('base64');
    
    const jsHash = crypto.createHash('sha256').update(jsSnippet).digest('base64');

    // Create the snippet object
    const snippet = {
        htmlSnippet: minifyHtmlSnippet(DOMPurify.sanitize(htmlSnippet)),
        cssSnippet: cssSnippet,
        jsSnippet: jsSnippet,
        cssHash: cssHash,
        jsHash: jsHash
    };

    try {
        await client.set(username, JSON.stringify(snippet));
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
        return;
    }

    res.redirect(`/${username}`);
});

// New endpoint to handle random page request
app.get('/random/page', (req, res) => {
    const usernames = Object.keys(storedSnippets);
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
});


// Define an async function to start the server
const startServer = async () => {
    try {
        // Wait for the Redis client to connect
        await client.connect();
        console.log('Connected to Redis...');

        // Start the Express server
        app.listen(port, () => {
            console.log(`Server running at http://localhost:${port}`);
        });
    } catch (err) {
        console.error('Failed to connect to Redis:', err);
    }
};
async function promptGemini(prompt) {
    console.log(prompt)
    const apiKey = process.env.GOOGLE_API_KEY;

try {
    const apiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            contents: [{
                parts: [{
                    text: `Please respond with three code blocks html,css,and js to make a website with the following prompt:${prompt}`,
                }],
            }],
        }),
    });

    if (apiResponse.ok) {
        const apiData = await apiResponse.json();
        // Handle the API response as needed

        return apiData;
        //res.status(200).json(apiData); // Send the API response back to the client or perform further processing
    } else {
        throw new Error(`API request failed with status: ${apiResponse.status}`);
    }
} catch (error) {
    console.error('Error making API request:', error);
    res.status(500).send('Internal Server Error');
}
}
app.post('/prompt',async (request, res) => {
//
})

function parseApiResponse(apiData) {
    const text = apiData.candidates[0].content.parts[0].text;

    const htmlMatch = text.match(/```html\n([\s\S]*?)```/);
    const cssMatch = text.match(/```css\n([\s\S]*?)```/);
    const jsMatch = text.match(/```javascript\n([\s\S]*?)```/);

    const htmlCode = htmlMatch ? htmlMatch[1] : '';
    const cssCode = cssMatch ? cssMatch[1] : '';
    const jsCode = jsMatch ? jsMatch[1] : '';

    return {
        htmlCode,
        cssCode,
        jsCode,
    };
}
// Call the function to start the server
startServer();