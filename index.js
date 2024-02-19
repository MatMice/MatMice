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
                <title>MatMice-like Web Maker</title>
                <style>
                    /* Your styles here */
                </style>
            </head>
            <body>
                <div id="${username}">
                    ${snippet}
                </div>
                <button onclick="goToRandomPage()">Go to random page</button>
                <script>
                    // Function to navigate to a random page
                     function goToRandomPage() {
        fetch('/random/page')
            .then(response => {
            	console.log(response);
                if (response.ok) {
               		return response.url;
                    //return response.text();
                } else {
                    throw new Error('Failed to fetch random page');
                }
            })
            .then(url => {
            	//console.log(username);
                if (url !== '') {
                    // Redirect to the randomly selected page
                    window.location.href = url;
                } else {
                    alert('No pages available');
                }
            })
            .catch(error => {
                console.error(error);
                alert('Failed to fetch random page');
            });
    }
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
console.log(req)
      const username = req.body.username;
    let snippet = req.body.snippet;
    // Sanitize the snippet using DOMPurify
    snippet = DOMPurify.sanitize(snippet);

console.log("text")
console.log(username)
console.log(snippet)
    if (storedSnippets[username]) {
        res.status(409).send('Username already taken');
    } else {
        storedSnippets[username] = snippet;
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
