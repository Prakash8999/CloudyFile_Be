import { createClient } from 'redis';

const redisClient = createClient({
  url:process.env.REDIS_URI
});

redisClient.on('error', (err) => {
  console.error('Redis error:', err);
});

redisClient.on('ready', () => {
  console.log('Redis client ready');
});

const connectRedis = async () => {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
};

export { connectRedis };
export default redisClient;
