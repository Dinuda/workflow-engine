import { Connection, Client } from '@temporalio/client';
import { Worker } from '@temporalio/worker';
import { RedisStateManager } from '../state/redis-state-manager';
import { WorkflowActivities } from '../activities/workflow-activities';
import { WorkflowDefinition, WorkflowState } from '../types';
import { conversationWorkflow } from '../workflow/conversation-workflow';

export interface Workflow {
    id: string;
    steps: WorkflowStep[];
}

export interface WorkflowStep {
    id: string;
    type: string;
    action?: string;
    branches?: WorkflowBranch[];
}

export interface WorkflowBranch {
    id: string;
    steps: WorkflowStep[];
}

export class WorkflowEngine {
    private stateManager: RedisStateManager;

    constructor(
        private client: Client,
        stateManager: RedisStateManager
    ) {
        this.stateManager = stateManager;
    }

    static async create(
        temporalUrl: string,
        redisUrl: string,
        namespace = 'default'
    ): Promise<WorkflowEngine> {
        const connection = await Connection.connect({
            address: temporalUrl,
        });
        const client = new Client({
            connection,
            namespace
        });
        return new WorkflowEngine(client, new RedisStateManager(redisUrl));
    }

    async startWorker() {
        const activities = new WorkflowActivities(this.stateManager);

        const worker = await Worker.create({
            workflowsPath: require.resolve('../workflow/conversation-workflow'),
            activities,
            taskQueue: 'ai-workflow'
        });

        await worker.run();
    }

    async startConversation(
        workflowDef: WorkflowDefinition,
        initialContext: Record<string, any> = {}
    ): Promise<string> {
        const conversationId = crypto.randomUUID();

        await this.client.workflow.start(conversationWorkflow, {
            args: [conversationId, workflowDef, initialContext],
            taskQueue: 'ai-workflow',
            workflowId: `conversation-${conversationId}`
        });

        return conversationId;
    }

    async getState(conversationId: string): Promise<WorkflowState | null> {
        return this.stateManager.loadState(conversationId);
    }

    async updateContext(
        conversationId: string,
        context: Record<string, any>
    ): Promise<void> {
        const state = await this.stateManager.loadState(conversationId);
        if (state) {
            state.context = { ...state.context, ...context };
            await this.stateManager.saveState(state);
        }
    }

    async shutdown() {
        await this.client.connection.close();
    }

    async executeWorkflow(workflow: Workflow): Promise<any> {
        try {
            const state = await this.stateManager.getWorkflowState(workflow.id);
            // Add your workflow execution logic here
            await this.stateManager.saveWorkflowState(workflow.id, { status: 'COMPLETED' });
            return state;
        } catch (error) {
            throw error;
        }
    }

    async getWorkflowState(workflowId: string): Promise<any> {
        try {
            return await this.stateManager.getWorkflowState(workflowId);
        } catch (error) {
            throw error;
        }
    }
} 