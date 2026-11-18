export const LINES = ['western', 'central', 'harbour'] as const;
export type Line = (typeof LINES)[number];

export const CROWD_LEVELS = ['green', 'yellow', 'red'] as const;
export type CrowdLevel = (typeof CROWD_LEVELS)[number];

export const DELAY_CATEGORIES = ['on-time', '1-5', '5-10', '10-plus', 'not-arrived', 'cancelled'] as const;
export type DelayCategory = (typeof DELAY_CATEGORIES)[number];

export interface AuthUser {
  id: string;
  role: 'user' | 'admin';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
