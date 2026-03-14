import Redis from "ioredis";
import { BaseCheckpointSaver, Checkpoint, CheckpointTuple, CheckpointMetadata } from "@langchain/langgraph";
import { RunnableConfig } from "@langchain/core/runnables";

export class RedisCheckpointer extends BaseCheckpointSaver {
  redis: Redis;

  constructor() {
    super();
    this.redis = new Redis("redis://localhost:6379", {
      retryStrategy: (times) => {
        // Stop retrying after 3 attempts
        if (times > 3) {
          console.warn("⚠️  Redis connection failed. Checkpointing disabled. To enable, ensure Redis is running on localhost:6379");
          return null; // Stop retrying
        }
        return Math.min(times * 100, 2000);
      },
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: true,
    });

    // Handle connection errors gracefully
    this.redis.on("error", (err) => {
      // Silently ignore repeated connection errors after initial warning
      if (err.message.includes("ECONNREFUSED") || err.message.includes("AggregateError")) {
        // Already warned in retryStrategy
      } else {
        console.error("Redis error:", err.message);
      }
    });

    // Attempt to connect
    this.redis.connect().catch(() => {
      // Connection failed, but we already handled it in retryStrategy
    });
  }

  async getTuple(config: RunnableConfig): Promise<CheckpointTuple | undefined> {
    const threadId = config.configurable?.thread_id;
    if (!threadId) return undefined;

    try {
      const data = await this.redis.get(`langgraph:checkpoint:${threadId}`);
      if (!data) return undefined;

      const checkpoint = JSON.parse(data);
      return {
        config,
        checkpoint,
        metadata: {
          source: "input" as const,
          step: 0,
          parents: {},
        },
        parentConfig: undefined,
      };
    } catch (error) {
      // Redis not available, return undefined (no checkpoint)
      return undefined;
    }
  }

  async *list(config: RunnableConfig, options?: { limit?: number; before?: RunnableConfig }): AsyncGenerator<CheckpointTuple> {
    const threadId = config.configurable?.thread_id;
    if (!threadId) return;

    try {
      const data = await this.redis.get(`langgraph:checkpoint:${threadId}`);
      if (!data) return;

      const checkpoint = JSON.parse(data);
      yield {
        config,
        checkpoint,
        metadata: {
          source: "input" as const,
          step: 0,
          parents: {},
        },
        parentConfig: undefined,
      };
    } catch (error) {
      // Redis not available, return empty
      return;
    }
  }

  async put(config: RunnableConfig, checkpoint: Checkpoint, metadata: CheckpointMetadata): Promise<RunnableConfig> {
    const threadId = config.configurable?.thread_id;
    if (!threadId) throw new Error("thread_id is required");

    try {
      await this.redis.set(
        `langgraph:checkpoint:${threadId}`,
        JSON.stringify(checkpoint)
      );
    } catch (error) {
      // Redis not available, silently skip checkpointing
    }

    return config;
  }

  async putWrites(config: RunnableConfig, writes: any[], taskId: string): Promise<void> {
    // Optional: implement if you need to store intermediate writes
  }

  async deleteThread(threadId: string): Promise<void> {
    try {
      await this.redis.del(`langgraph:checkpoint:${threadId}`);
    } catch (error) {
      // Redis not available, silently skip
    }
  }
}
