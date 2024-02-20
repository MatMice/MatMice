	// Made with the help of ChatGPT 3.5
	
	const express = require('express');
	const bodyParser = require('body-parser');
	const createDOMPurify = require('dompurify');
	const validator = require('validator');
	const helmet = require('helmet');
	const { JSDOM } = require('jsdom');
	
	
	const app = express();
	const port = 3000;
	
	const window = new JSDOM('').window;
	const DOMPurify = createDOMPurify(window);
	
	app.use(helmet());
	app.use(bodyParser.urlencoded({ extended: true })); 
	app.use(express.static('public'));
	app.use((err, req, res, next) => {
    	console.error(err.stack);
    	res.status(500).send('Internal Server Error');
	});
	
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
            html: htmlSnippet,
            css: cssSnippet,
            js: jsSnippet
        };
        res.redirect(`/${username}`);
    }
});/*
	app.post('/register', (req, res) => {
	console.log(req)
      	const username = req.body.username;
    	let snippet = req.body.snippet;
    	console.log("HERE")
    	console.log(snippet);
    	// Sanitize the snippet using DOMPurify
    	snippet = DOMPurify.sanitize(snippet, {
    		ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a','style'],
    		ALLOWED_ATTR: ['href', 'style'], // Allow the 'style' attribute for CSS
    		FORBID_ATTR: ['onerror', 'onload'], // Forbid specific attributes
		});
	console.log("text")
	console.log(username)
	console.log(snippet)
    	if (storedSnippets[username]) {
        	res.status(409).send('Username already taken');
    	} else {
        	storedSnippets[username] = snippet;
        	res.redirect(`/${username}`);
    	}
	});*/
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
	
