import { WorkflowEngine } from '../workflow-engine';
import { RedisStateManager } from '../../state/redis-state-manager';
import { Connection, Client } from '@temporalio/client';

// Mock dependencies
jest.mock('../../state/redis-state-manager');
jest.mock('@temporalio/client');

describe('WorkflowEngine', () => {
    let workflowEngine: WorkflowEngine;
    let stateManager: jest.Mocked<RedisStateManager>;
    let mockClient: jest.Mocked<Client>;

    beforeEach(async () => {
        // Clear all mocks before each test
        jest.clearAllMocks();
        
        // Create mock instance with required constructor args
        stateManager = new RedisStateManager('redis://localhost:6379') as jest.Mocked<RedisStateManager>;
        
        // Mock the methods we'll use
        stateManager.saveWorkflowState = jest.fn();
        stateManager.getWorkflowState = jest.fn();

        // Mock Temporal client
        mockClient = {
            connection: {
                close: jest.fn()
            },
            workflow: {
                start: jest.fn()
            }
        } as unknown as jest.Mocked<Client>;

        // Create workflow engine instance with mocked dependencies
        workflowEngine = new WorkflowEngine(mockClient, stateManager);
    });

    describe('workflow execution', () => {
        it('should execute a simple workflow successfully', async () => {
            // Define a sample workflow
            const workflow = {
                id: 'test-workflow-1',
                steps: [
                    {
                        id: 'step1',
                        type: 'task',
                        action: 'testAction'
                    }
                ]
            };

            // Mock state manager responses
            const mockState = { status: 'COMPLETED', result: { success: true } };
            stateManager.getWorkflowState.mockResolvedValue(mockState);
            stateManager.saveWorkflowState.mockResolvedValue(undefined);

            // Execute workflow
            const result = await workflowEngine.executeWorkflow(workflow);

            // Assertions
            expect(result).toEqual(mockState);
            expect(stateManager.saveWorkflowState).toHaveBeenCalledWith(workflow.id, { status: 'COMPLETED' });
            expect(stateManager.getWorkflowState).toHaveBeenCalledWith(workflow.id);
        });

        it('should handle workflow execution errors', async () => {
            const workflow = {
                id: 'test-workflow-2',
                steps: [
                    {
                        id: 'step1',
                        type: 'task',
                        action: 'failingAction'
                    }
                ]
            };

            // Mock state manager to simulate an error
            stateManager.getWorkflowState.mockRejectedValue(new Error('Failed to save state'));

            // Execute workflow and expect it to throw
            await expect(workflowEngine.executeWorkflow(workflow))
                .rejects
                .toThrow('Failed to save state');
        });

        it('should handle parallel workflow steps', async () => {
            const workflow = {
                id: 'test-workflow-3',
                steps: [
                    {
                        id: 'parallel-steps',
                        type: 'parallel',
                        branches: [
                            {
                                id: 'branch1',
                                steps: [{ id: 'step1', type: 'task', action: 'action1' }]
                            },
                            {
                                id: 'branch2',
                                steps: [{ id: 'step2', type: 'task', action: 'action2' }]
                            }
                        ]
                    }
                ]
            };

            stateManager.saveWorkflowState.mockResolvedValue(undefined);
            stateManager.getWorkflowState.mockResolvedValue({ status: 'PENDING' });

            const result = await workflowEngine.executeWorkflow(workflow);

            expect(result).toBeDefined();
            expect(stateManager.saveWorkflowState).toHaveBeenCalled();
        });
    });

    describe('workflow state management', () => {
        it('should retrieve workflow state correctly', async () => {
            const workflowId = 'test-workflow-4';
            const mockState = {
                status: 'COMPLETED',
                currentStep: 'step1',
                result: { data: 'test' }
            };

            stateManager.getWorkflowState.mockResolvedValue(mockState);

            const state = await workflowEngine.getWorkflowState(workflowId);

            expect(state).toEqual(mockState);
            expect(stateManager.getWorkflowState).toHaveBeenCalledWith(workflowId);
        });

        it('should handle state retrieval errors', async () => {
            const workflowId = 'test-workflow-5';
            
            stateManager.getWorkflowState.mockRejectedValue(new Error('State not found'));

            await expect(workflowEngine.getWorkflowState(workflowId))
                .rejects
                .toThrow('State not found');
        });
    });
}); 