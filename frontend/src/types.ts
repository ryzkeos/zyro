export type Persona = 'default' | 'formal' | 'concise' | 'precise' | 'creative';
export type InterfaceTheme = 'dark' | 'dim' | 'light';
export type ColorTheme = 'rose' | 'matcha' | 'purple' | 'skyblue' | 'monochrome' | 'sunset-yellow';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isError?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  lastUpdated: number;
  pinned?: boolean;
}

export interface User {
  id: string;
  username: string;
  email: string;
  isLoggedIn: boolean;
}

export interface Settings {
  model: string;
  persona: Persona;
  personaName: string;
  memoryEnabled: boolean;
  interfaceTheme: InterfaceTheme;
  colorTheme: ColorTheme;
  aiInstructions: string;
}
