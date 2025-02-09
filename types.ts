import { Message } from 'ai';

export interface WorkflowState {
  conversationId: string;
  currentStep: string;
  messages: Message[];
  context: Record<string, any>;
  metadata: Record<string, any>;
}

export interface WorkflowStep {
  id: string;
  name: string;
  description?: string;
  execute: (state: WorkflowState) => Promise<WorkflowState>;
  validate?: (state: WorkflowState) => Promise<boolean>;
  next?: (state: WorkflowState) => Promise<string | null>;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  initialStep: string;
  steps: Record<string, WorkflowStep>;
} 