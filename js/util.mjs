import { minify as minifyHtml } from 'html-minifier';
import postcss from 'postcss';
import cssnano from 'cssnano';
import { minify } from 'terser'; // Corrected import for terser
import { ESLint } from 'eslint';
import rateLimit from 'express-rate-limit';

//unused?
import cookieParser from 'cookie-parser';

export async function generate_user_key(ip) {
    return new Promise((resolve, reject) => {
        try {
            const salt = crypto.randomBytes(16).toString('hex'); // Generate a random salt
            const pepper = process.env.PEPPER; // A secret key stored in your server
            const hash = crypto.createHmac('sha256', salt + ip + pepper).digest('hex');
            resolve({ hash, salt });
        } catch (error) {
            reject(error);
        }
    });
}

export async function sanitize_javascript(js) {
    //This is not really doing what it is saying... we need to implement a VM to run this stuff
    const results = await eslint.lintText(js);
    const formatter = await eslint.loadFormatter('stylish');
    const resultText = formatter.format(results);

    const hasCriticalIssue = results.some(result => result.messages.some(message => message.severity === 2));
    if (hasCriticalIssue) {
        console.log(`JavaScript code has critical issues:\n${resultText}`);
        //return '';
    }
    if (results.some(result => result.errorCount > 0)) {
        console.log(`JavaScript code has errors:\n${resultText}`);
    }

    return js;
}

export async function log(message, ...critical) {
    if(process.env.NODE_ENV === 'production' && !critical) return;
    console.log( critical ? 
        `[${critical}]: ${message}` : 
        `[LOG]: ${message}`
    );
}

export async function prompt_gemini(prompt) {
    log(prompt)
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
                    text: `Please respond with three code blocks html,css,and js without any comments to make a website with the following prompt:${prompt}`,
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

export async function minify_html_snippet (html) {
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
}

export const minifyCss = async (css) => {
    const result = await postcss([cssnano]).process(css);
    return result.css;
}

export const minifyJs = (js) => {
    const result = minify(js);
    if (result.error) throw result.error;
    return result.code;
}

export const eslint = new ESLint({
    useEslintrc: false,
    baseConfig: {
        extends: ['eslint:recommended'],
        rules: {
            "no-unused-vars": "warn",
            "no-undef": "off"
        }
    },
})

export const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: process.env.RATE_LIMIT, // Limit each IP to 1 requests per minute
    message: 'Too many requests from this IP, please try again after a minute.',
})

export async function parse_api_response(api_data) {
    const text = api_data.candidates[0].content.parts[0].text;

    const htmlMatch = text.match(/```html\n([\s\S]*?)```/);
    const cssMatch = text.match(/```css\n([\s\S]*?)```/);
    const jsMatch = text.match(/```javascript\n([\s\S]*?)```/) || text.match(/```js\n([\s\S]*?)```/);

    const htmlCode = htmlMatch ? htmlMatch[1] : '';
    const cssCode = cssMatch ? cssMatch[1] : '';
    const jsCode = jsMatch ? jsMatch[1] : '';

    return {
        htmlCode,
        cssCode,
        jsCode,
    };
}