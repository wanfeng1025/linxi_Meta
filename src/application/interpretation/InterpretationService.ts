import {
  runDeterministicInterpretation,
  type InterpretationOutput,
  type RunInterpretationInput,
} from '../../domain/interpretation';

export class InterpretationService {
  public interpret(request: RunInterpretationInput): InterpretationOutput {
    return runDeterministicInterpretation(request);
  }
}
