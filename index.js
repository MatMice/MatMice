const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

app.use(bodyParser.text({ type: 'text/*' }));
app.use(express.static('public'));

const storedSnippets = {};

app.get('/:username', (req, res) => {
    const username = req.params.username;
    const snippet = storedSnippets[username];
    if (snippet) {
        res.send(snippet);
    } else {
        res.status(404).send('User not found');
    }
});

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

app.post('/register/:username', (req, res) => {
   const username = req.params.username;
   const snippet = req.query.snippet;

   if (storedSnippets[username]) {
      res.status(409).send('Username already taken');
   } else {
      storedSnippets[username] = snippet;
      res.redirect(`/${username}`);
   }
});


app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
