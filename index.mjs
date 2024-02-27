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


async function generateImage(prompt,model) {
    try {
      const image = await hf.textToImage({
        inputs: prompt,
        model: model,
        parameters: {
          negative_prompt: 'blurry',
        }
      });
      const buffer = Buffer.from(await image.arrayBuffer());

      // Encode image data as base64
      const base64Image = buffer.toString('base64')
  
      // Create HTML response with image data
      const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Generated Image</title>
        </head>
        <body>
          <img src="data:image/png;base64,${base64Image}" alt="Generated Image">
        </body>
        </html>
      `;
  
      return html;
    } catch (error) {
      console.error("Error:", error);
      return "Error generating image";
    }
  }
  
  app.get("/test/hf", async (req, res) => {
    const prompt = "Mat Mice Site Test Two";
    const modelName = "stabilityai/stable-diffusion-xl-base-1.0";
  
    const html = await generateImage(prompt,modelName)
    res.send(html);
  });

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