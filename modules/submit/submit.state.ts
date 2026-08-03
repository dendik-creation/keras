export type SubmitState = 
  | "QUEUED"
  | "PRIORITY_RESERVED"
  | "DISCOVERING"
  | "SUBMITTING"
  | "WAITING_RESPONSE"
  | "UNKNOWN_COMMIT_STATE"
  | "VERIFYING"
  | "SUCCESS"
  | "FAILED"
  | "RETRYING"
  | "BACKGROUND_VERIFYING"
  | "COMPLETED"
  | "UPSTREAM_BUSY";

export class StateMachine {
  private state: SubmitState;
  
  constructor(initialState: SubmitState = "QUEUED") {
    this.state = initialState;
  }
  
  transition(next: SubmitState): SubmitState {
    // We could add strict transition rules here, but for now we trust the controller
    // and use this to emit clean state changes to the telemetry/UI.
    this.state = next;
    return this.state;
  }
  
  getState(): SubmitState {
    return this.state;
  }
}
