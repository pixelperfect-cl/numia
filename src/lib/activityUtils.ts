import { db } from "@/lib/firebase/config";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export type ActivityType =
    | 'comment'
    | 'milestone_completed'
    | 'task_completed'
    | 'payment_registered'
    | 'payment_updated'
    | 'payment_deleted'
    | 'status_change'
    | 'description_update'
    | 'member_added'
    | 'credential_added';

export interface ActivityLog {
    id?: string;
    projectId: string;
    type: ActivityType;
    message: string;
    metadata?: any;
    userId?: string;
    userName?: string;
    createdAt?: any;
}

export const logProjectActivity = async (
    projectId: string,
    type: ActivityType,
    message: string,
    userId?: string,
    userName?: string,
    metadata?: any
) => {
    try {
        const activitiesRef = collection(db, `projects/${projectId}/activities`);
        await addDoc(activitiesRef, {
            type,
            message,
            metadata: metadata || {},
            userId: userId || 'system',
            userName: userName || 'System',
            createdAt: serverTimestamp()
        });
        console.log(`Activity logged [${type}]:`, message);
    } catch (error) {
        console.error("Error logging activity:", error);
    }
};
