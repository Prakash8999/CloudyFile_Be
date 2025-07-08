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
  origin: ['http://localhost:5173','http://localhost:4173','https://cloudy-file.vercel.app'],
  // methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}))

const PORT = process.env.PORT || 4000;
const v1Endpoint = '/api/v1'

// import redisClient, { connectRedis } from './';


app.get('/', (req: Request, res: Response) => {
  res.send('Hello, This is CloudyFile!');
});
import redisClient, { connectRedis } from './src/utils/redis';
async function initApp() {
  try {
    await connectRedis();
    const result = await redisClient.ping();
    console.log('Redis is working! PING =>', result);
  } catch (err) {
    console.error('Redis connection failed:', err);
  }
}

initApp();

import userRoute from './src/routes/user-route';
import uploadRoute from './src/routes/file-route'
import FolderRoute from './src/routes/folder-route'
import shareFileRoute from './src/routes/share-file-route';
import StatsRoute from './src/routes/stats-route'
app.use(`${v1Endpoint}/user`, userRoute);
app.use(`${v1Endpoint}/file`, uploadRoute)
app.use(`${v1Endpoint}/folder`, FolderRoute)
app.use(`${v1Endpoint}/share-file`, shareFileRoute)
app.use(`${v1Endpoint}/stats`, StatsRoute)

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});