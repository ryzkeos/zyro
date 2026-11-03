export type Persona = 'default' | 'formal' | 'concise' | 'precise' | 'creative';
export type InterfaceTheme = 'dark' | 'dim' | 'light';
export type ColorTheme = 'rose' | 'matcha' | 'purple' | 'skyblue' | 'monochrome' | 'sunset-yellow';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isError?: boolean;
  model?: string;
  image?: string;
  imageType?: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  lastUpdated: number;
  pinned?: boolean;
  hasMessages?: boolean;
}

export interface User {
  id: string;
  username: string;
  email: string;
  email_verified: boolean;
  isLoggedIn?: boolean;
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

export interface SearchResult {
  messageId: string;
  conversationId: string;
  conversationTitle: string;
  role: string;
  snippet: string;
  timestamp: number;
}

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

export type SettingsView = 'main' | 'edit-profile' | 'change-password' | 'delete-account' | 'ai-instructions' | 'model-select';

export interface AuthForm {
  username: string;
  email: string;
  password: string;
}

export interface ProfileForm {
  username: string;
  email: string;
}

export interface PasswordForm {
  current: string;
  next: string;
  confirm: string;
}

export interface DeleteForm {
  password: string;
}

export interface PendingImage {
  base64: string;
  type: string;
  preview: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  image?: string;
  imageType?: string;
}

export interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface PushSubscriptionData {
  endpoint: string;
  keys: PushSubscriptionKeys;
}

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface PreProps {
  children?: React.ReactNode;
}

export interface TdProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  children?: React.ReactNode;
}

export interface AbortSignalWithAny extends AbortSignal {
  any?: (signals: AbortSignal[]) => AbortSignal;
}