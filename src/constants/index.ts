import { defaultSchema } from 'rehype-sanitize';

export const API = '';

export const MODEL_NAMES: Record<string, string> = {
  'xenon-1.0': 'Xenon 1.0',
  'yuruzu-1.0': 'Yuruzu 1.0',
};

export const PERSONA_NAMES: Record<string, string> = {
  default: 'Default',
  formal: 'Formal',
  concise: 'Concise',
  precise: 'Precise',
  creative: 'Creative',
};

export const GUEST_LIMIT = 5;
export const GUEST_WINDOW_MS = 60_000;
export const CHAR_WARN = 8000;
export const MAX_MESSAGE_LENGTH = 10000;

export const SANITIZE_SCHEMA = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    '*': [...(defaultSchema.attributes?.['*'] ?? []), 'className', 'style'],
  },
};

export const COLOR_THEME_DOTS: Record<string, string> = {
  rose: '#f43f6e',
  matcha: '#6dbf5a',
  purple: '#a855f7',
  skyblue: '#38bdf8',
  monochrome: '#c8c8d8',
  'sunset-yellow': '#fbbf24',
};