import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6375';

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  lazyConnect: true, // Evita travar a inicialização do app se o Redis estiver offline
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

redis.on('connect', () => {
  console.log('Connected to Redis successfully!');
});
