/**
 * Numia v1.0 - Notification Context
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import type { Notification, NotificationPreferences } from '@/types/notification';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  preferences: NotificationPreferences;
  loading: boolean;
  createNotification: (notification: Omit<Notification, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  updatePreferences: (preferences: NotificationPreferences) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    enabled: true,
    emailNotifications: false,
    pushNotifications: false,
  });
  const [loading, setLoading] = useState(true);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Subscribe to notifications
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notificationsData: Notification[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId,
          title: data.title,
          message: data.message,
          read: data.read || false,
          date: data.date,
          type: data.type || 'info',
          createdAt: data.createdAt?.toDate() || new Date(),
        };
      });
      setNotifications(notificationsData);
      setLoading(false);
    }, (error) => {
      console.warn("Notifications listener error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const createNotification = async (notification: Omit<Notification, 'id' | 'userId' | 'createdAt'>) => {
    if (!user) return;

    try {
      await addDoc(collection(db, 'notifications'), {
        userId: user.uid,
        title: notification.title,
        message: notification.message,
        read: notification.read || false,
        date: notification.date,
        type: notification.type,
        createdAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), {
        read: true,
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter((n) => !n.read);
      await Promise.all(
        unreadNotifications.map((notification) =>
          updateDoc(doc(db, 'notifications', notification.id), {
            read: true,
          })
        )
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  };

  // Load preferences
  useEffect(() => {
    if (!user) return;

    const loadPreferences = async () => {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        // We use referencing to the user document for preferences
        const unsubscribe = onSnapshot(userDocRef, (docSnapshot) => {
          if (docSnapshot.exists()) {
            const data = docSnapshot.data();
            if (data.notificationPreferences) {
              setPreferences(data.notificationPreferences);
            }
          }
        }, (error) => {
          console.warn("User preferences listener error:", error);
        });
        return unsubscribe;
      } catch (error) {
        console.error('Error loading preferences:', error);
      }
    };

    const cleanupPromise = loadPreferences();
    return () => {
      cleanupPromise.then(cleanup => cleanup && cleanup());
    };
  }, [user]);

  const updatePreferences = async (newPreferences: NotificationPreferences) => {
    setPreferences(newPreferences);
    if (user) {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        // Use setDoc with merge to ensure document exists
        const { setDoc } = await import('firebase/firestore');
        await setDoc(userDocRef, {
          notificationPreferences: newPreferences
        }, { merge: true });
      } catch (error) {
        console.error('Error saving preferences:', error);
      }
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        preferences,
        loading,
        createNotification,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        updatePreferences,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
