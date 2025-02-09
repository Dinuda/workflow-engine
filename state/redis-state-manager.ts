import Redis from 'ioredis';
import { WorkflowState } from '../types';

export class RedisStateManager {
  private redis: Redis;
  private prefix: string;

  constructor(redisUrl: string, prefix = 'ai-workflow:') {
    this.redis = new Redis(redisUrl);
    this.prefix = prefix;
  }

  private getKey(conversationId: string): string {
    return `${this.prefix}${conversationId}`;
  }

  async saveState(state: WorkflowState): Promise<void> {
    const key = this.getKey(state.conversationId);
    await this.redis.set(key, JSON.stringify(state));
  }

  async loadState(conversationId: string): Promise<WorkflowState | null> {
    const key = this.getKey(conversationId);
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  async deleteState(conversationId: string): Promise<void> {
    const key = this.getKey(conversationId);
    await this.redis.del(key);
  }

  async saveWorkflowState(workflowId: string, state: any): Promise<void> {
    const key = `${this.prefix}${workflowId}`;
    await this.redis.set(key, JSON.stringify(state));
  }

  async getWorkflowState(workflowId: string): Promise<any> {
    const key = `${this.prefix}${workflowId}`;
    const state = await this.redis.get(key);
    return state ? JSON.parse(state) : null;
  }
} 