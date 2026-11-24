import { validateInstruct } from "seance-core/transports/phone-bridge";

export interface InstructInput {
  spiritId: string;
  text: string;
  step?: number;
}

export interface InstructResult {
  success: boolean;
  spiritId: string;
  text: string;
  step?: number;
  error?: string;
}

export function instructTool(input: InstructInput): InstructResult {
  const validation = validateInstruct({
    type: "instruct",
    to: input.spiritId,
    text: input.text,
    step: input.step,
  });

  if (!validation.valid) {
    return {
      success: false,
      spiritId: input.spiritId,
      text: input.text,
      step: input.step,
      error: validation.reason,
    };
  }

  return {
    success: true,
    spiritId: input.spiritId,
    text: input.text,
    step: input.step,
  };
}
