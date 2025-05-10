import express, { Request, Response } from 'express';
import dotenv from 'dotenv'
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser'
const app = express();
dotenv.config()
app.use(express.json());
app.use(helmet())
app.use(cookieParser())
app.use(cors({
  origin: 'http://localhost:5173',
  // methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials:true
}))

const PORT = process.env.PORT || 4000;
const v1Endpoint='/api/v1'

app.get('/', (req: Request, res: Response) => {
  res.send('Hello, This is CloudyFile!');
});

import userRoute from './src/routes/user-route';
import uploadRoute from './src/routes/upload-route'
app.use(`${v1Endpoint}/user`, userRoute);
app.use(`${v1Endpoint}/file`, uploadRoute)


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});