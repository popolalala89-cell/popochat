export interface UserData {
  uid: string;
  email: string;
  displayName: string;
  avatarUrl: string;
  statusMood: string;
  tokenFCM: string;
  role: 'member' | 'broadcaster' | 'admin';
  preferences: UserPreferences;
  badges: string[];
  points: number;
  createdAt: number;
}

export interface UserPreferences {
  theme: 'default' | 'santai' | 'dark';
  wallpaper: string;
  notificationSound: string;
}

export interface Group {
  id: string;
  name: string;
  members: string[];
  type: 'broadcast' | 'discussion';
  createdBy: string;
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  groupId: string;
  senderId: string;
  senderName: string;
  type: 'text' | 'image' | 'sticker';
  content: string;
  timestamp: number;
  reactions: Record<string, string[]>;
  isBroadcast: boolean;
  template?: 'formal' | 'santai' | 'lucu';
}

export interface Sticker {
  id: string;
  name: string;
  imageUrl: string;
  uploadedBy: string;
  createdAt: number;
}
