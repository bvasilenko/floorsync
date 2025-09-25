/* Default checklist template */
export const DEFAULT_CHECKLIST = {
  name: 'Standard Construction Task',
  defaultItems: [
    { text: 'Review specifications', order: 1 },
    { text: 'Prepare materials', order: 2 },
    { text: 'Set up work area', order: 3 },
    { text: 'Execute task', order: 4 },
    { text: 'Quality check', order: 5 },
    { text: 'Clean up', order: 6 },
  ],
} as const;

/* FloorPlan rendering constants */
export const FLOOR_PLAN_CONSTANTS = {
  DEFAULT_WIDTH: 800,
  DEFAULT_HEIGHT: 600,
  MARKER_RADIUS: 12,
  FLOOR_PLAN_SCALE_FACTOR: 0.9,
  MARKER_BORDER_WIDTH: 2,
  BACKGROUND_COLOR: 0xf5f5f5,
  MARKER_BORDER_COLOR: 0xffffff,
  STATUS_COLORS: {
    done: 0x10b981, // green
    in_progress: 0xf59e0b, // yellow
    blocked: 0xef4444, // red
    final_check_awaiting: 0x3b82f6, // blue
    not_started: 0x6b7280, // gray
  },
} as const;
