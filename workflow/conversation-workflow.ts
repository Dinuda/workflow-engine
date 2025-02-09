import { proxyActivities } from '@temporalio/workflow';
import { WorkflowState, WorkflowDefinition } from '../types';

const { saveState, loadState } = proxyActivities({
  startToCloseTimeout: '1 minute',
});

export async function conversationWorkflow(
  conversationId: string,
  workflowDef: WorkflowDefinition,
  initialContext: Record<string, any> = {}
): Promise<WorkflowState> {
  // Initialize or load existing state
  let state = await loadState(conversationId);
  
  if (!state) {
    state = {
      conversationId,
      currentStep: workflowDef.initialStep,
      messages: [],
      context: initialContext,
      metadata: {}
    };
  }

  while (true) {
    const currentStep = workflowDef.steps[state.currentStep];
    if (!currentStep) {
      throw new Error(`Step ${state.currentStep} not found in workflow`);
    }

    // Execute current step
    state = await currentStep.execute(state);
    
    // Validate step result if validator exists
    if (currentStep.validate) {
      const isValid = await currentStep.validate(state);
      if (!isValid) {
        throw new Error(`Validation failed for step ${currentStep.id}`);
      }
    }

    // Save state after each step
    await saveState(state);

    // Determine next step
    const nextStepId = currentStep.next ? await currentStep.next(state) : null;
    if (!nextStepId) {
      break; // Workflow complete
    }

    state.currentStep = nextStepId;
  }

  return state;
} 