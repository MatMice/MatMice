	// Made with the help of ChatGPT 3.5
	require('dotenv').config(); // Load environment variables from .env file

	const express = require('express');
	const bodyParser = require('body-parser');
	const createDOMPurify = require('dompurify');
	const validator = require('validator');
	const helmet = require('helmet');
	const { JSDOM } = require('jsdom');
	const rateLimit = require('express-rate-limit');
	
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
	
	// Apply rate limiting for /prompt and /register routes
const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 1, // Limit each IP to 1 requests per minute
    message: 'Too many requests from this IP, please try again after a minute.',
});

app.use('/prompt', limiter);
app.use('/register', limiter);

	const storedSnippets = {};
	
	app.get('/:username', (req, res) => {
    	const username = req.params.username;
    	const snippet = storedSnippets[username];
    	console.log(snippet)
    	if (snippet) {
        	res.send(`
            	<!DOCTYPE html>
            	<html lang="en">
            	<head>
                	<meta charset="UTF-8">
                	<meta http-equiv="X-UA-Compatible" content="IE=edge">
                	<meta name="viewport" content="width=device-width, initial-scale=1.0">
                	<title>${username}</title>
                	<style>
                		${snippet.css}
                	</style>
            	</head>
            	<body>
                	<div id="${username}">
                    	${snippet.html}
                	</div>
                	<style>
                		${snippet.css}
                	</style>
                	<script>
                		${snippet.js}
                	</script>
            	</body>
            	</html>
        	`);
    	} else {
        	res.status(404).send('User not found');
    	}
	});
	
	app.get('/', (req, res) => {
    	res.sendFile(__dirname + '/public/index.html');
	});
	app.post('/prompt',async (request, res) => {
		const prompt = request.body.prompt;
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
                        text: prompt,
                    }],
                }],
            }),
        });

        if (apiResponse.ok) {
            const apiData = await apiResponse.json();
            // Handle the API response as needed

            res.status(200).json(apiData); // Send the API response back to the client or perform further processing
        } else {
            throw new Error(`API request failed with status: ${apiResponse.status}`);
        }
    } catch (error) {
        console.error('Error making API request:', error);
        res.status(500).send('Internal Server Error');
    }
	})
	app.post('/register', (req, res) => {
    const username = req.body.username;
    let htmlSnippet = req.body.htmlSnippet;
    let cssSnippet = req.body.cssSnippet;
    let jsSnippet = req.body.jsSnippet;

    // Sanitize the snippets using DOMPurify if necessary

    // Your existing validation and storage logic here

    if (storedSnippets[username]) {
        res.status(409).send('Username already taken');
    } else {
        storedSnippets[username] = {
            html: DOMPurify.sanitize(htmlSnippet, {
    		ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a','style'],
    		ALLOWED_ATTR: ['href', 'style'], // Allow the 'style' attribute for CSS
    		FORBID_ATTR: ['onerror', 'onload'], // Forbid specific attributes
		}),
            css:  DOMPurify.sanitize(cssSnippet, {
    		ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a','style'],
    		ALLOWED_ATTR: ['href', 'style'], // Allow the 'style' attribute for CSS
    		FORBID_ATTR: ['onerror', 'onload'], // Forbid specific attributes
		}),
            js: jsSnippet
        };
        res.redirect(`/${username}`);
    }
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
	
	
	app.listen(port, () => {
    	console.log(`Server running at http://localhost:${port}`);
	});
	
