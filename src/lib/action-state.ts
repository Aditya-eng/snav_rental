export type ActionState = {
  ok?: boolean;
  error?: string;
  message?: string;
} | null;

export const fail = (error: string): ActionState => ({ ok: false, error });
export const done = (message?: string): ActionState => ({ ok: true, message });
