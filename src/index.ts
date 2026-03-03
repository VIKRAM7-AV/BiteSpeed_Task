import express from 'express';
import dotenv from 'dotenv';
import { identify } from './routes/identify.js';

dotenv.config();
const app = express();

app.use(express.json());

app.post('/identify', identify);

app.get('/test', (req, res) => {
  res.send('BiteSpeed API is working!');
})

app.listen(process.env.PORT || 3000, () => {
    console.log(`Server is running on port ${process.env.PORT || 3000}`);
})
