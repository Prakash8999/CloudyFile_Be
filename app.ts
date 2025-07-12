// app.ts
import express, { NextFunction, Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
// import helmet from 'helmet';

import userRoute from './src/routes/user-route';
import uploadRoute from './src/routes/file-route';
import FolderRoute from './src/routes/folder-route';
import shareFileRoute from './src/routes/share-file-route';
import StatsRoute from './src/routes/stats-route';

import redisClient, { connectRedis } from './src/utils/redis';

dotenv.config();

const app = express();
const v1Endpoint = '/api/v1';

app.use(express.json());
app.use(cookieParser());

// app.use(helmet());
app.use(cors({
  origin: "https://cloudy-file.vercel.app",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));

app.use((req: Request, res: Response, next: NextFunction) => {
  res.header("Access-Control-Allow-Origin", "https://cloudy-file.vercel.app");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.get('/', (req: Request, res: Response) => {
  res.send('Hello, This is CloudyFile!');
});

app.use(`${v1Endpoint}/user`, userRoute);
app.use(`${v1Endpoint}/file`, uploadRoute);
app.use(`${v1Endpoint}/folder`, FolderRoute);
app.use(`${v1Endpoint}/share-file`, shareFileRoute);
app.use(`${v1Endpoint}/stats`, StatsRoute);

(async () => {
  try {
    await connectRedis();
    const result = await redisClient.ping();
    console.log('Redis is working! PING =>', result);
  } catch (err) {
    console.error('Redis connection failed:', err);
  }
})();

export default app;
