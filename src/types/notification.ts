/**
 * Numia v1.0 - Notification Types
 */

export type NotificationType = 'info' | 'warning' | 'success';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  date: string; // ISO date string
  type: NotificationType;
  createdAt: Date;
}

export interface NotificationPreferences {
  enabled: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
}
