/**
 * Numia v1.0 - Notification Types
 */

export type NotificationType = 'info' | 'warning' | 'success';
export type NotificationCategory = 'service' | 'project' | 'billing' | 'scheduled' | 'general';
export type NotificationAudience = 'client' | 'admin' | 'all';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  date: string; // ISO date string
  type: NotificationType;
  category?: NotificationCategory;
  targetAudience?: NotificationAudience;
  createdAt: Date;
}

export interface NotificationPreferences {
  enabled: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
}
