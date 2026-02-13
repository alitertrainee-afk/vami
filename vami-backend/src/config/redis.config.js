// libs imports
import { createClient } from "redis";

const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();

pubClient.on("error", (err) => console.error("Redis Pub Client Error", err));
subClient.on("error", (err) => console.error("Redis Sub Client Error", err));

const connectRedis = async () => {
  await Promise.all([pubClient.connect(), subClient.connect()]);
  console.log("✅ Redis Connected (Pub/Sub)");
  return { pubClient, subClient };
};

export { connectRedis, pubClient, subClient };
