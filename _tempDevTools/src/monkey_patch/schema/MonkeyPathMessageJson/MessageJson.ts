import { z } from 'zod';

export type MessageJson<Action extends string, Payload> = {
  id: string;
  timestamp?: number;
  action: Action;
  payload: Payload;
};

export const getMessageJsonSchema = <TPayload extends z.ZodTypeAny>(action: string, payloadSchema: TPayload) => {
  return z.object({
    action: z.literal(action),
    id: z.string(),
    payload: payloadSchema,
    timestamp: z.number().optional(),
  });
};
