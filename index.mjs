// Made with the help of AI

//My Libraries
import { log, generate_user_key, sanitize_javascript, limiter  } from './js/util.mjs';
import get_routes from './js/get_routes.mjs';
import post_routes from './js/post_routes.mjs';

//Third Party Libraries
import path from 'path';
import dotenv from 'dotenv';
import express from 'express';
import bodyParser from 'body-parser';
import helmet from 'helmet';
import { createClient } from 'redis';


dotenv.config(); // Load environment variables from .env file

const app = express();

const port = process.env.PORT || 3000; // Use PORT from environment variables or default to 3000

const client = createClient({ url: process.env.REDIS_URL })

// Create a Redis JSON clientit looks like in
console.log("HERE")
client.on('connect', function() {
    log('Connected to Redis...');
});

client.on('error', function (err) {
    log('Redis error:', err);
});


app.use(helmet());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Internal Server Error');
});
app.use(async (req, res, next) => {
    try {
        /*
        // Check if the userKey cookie is set
        if (!req.cookies.userKey) {
            // If not, generate a unique key based on their IP address
            const userKey = await generate_user_key(req.ip);

            // Set the userKey cookie
            res.cookie('userKey', userKey, { maxAge: 900000, httpOnly: true });
        }
        */
        next();
    } catch (error) {
        next(error);
    }
});

app.use((req, res, next) => {
    req.redis_client = client;
    next();
});
//
app.set('view engine', 'ejs');


//
app.use(get_routes);
app.use(post_routes);


app.use('/prompt', limiter);
app.use('/register', limiter);

const startServer = async () => {
    try {
        await client.connect()

        app.listen(port, () => {
            log(`Server running at http://localhost:${port}`);
        });
    } catch (err) {
        log('Failed to connect to Redis:', err);
    }
};

// Call the function to start the server
startServer();