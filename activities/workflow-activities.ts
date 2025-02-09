import { RedisStateManager } from '../state/redis-state-manager';
import { WorkflowState } from '../types';

export class WorkflowActivities {
  constructor(private stateManager: RedisStateManager) {}

  async saveState(state: WorkflowState): Promise<void> {
    await this.stateManager.saveState(state);
  }

  async loadState(conversationId: string): Promise<WorkflowState | null> {
    return this.stateManager.loadState(conversationId);
  }
} 