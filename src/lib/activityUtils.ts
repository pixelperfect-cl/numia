import { supabase } from "@/lib/supabase";

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
    | 'credential_added'
    | 'expense_registered'
    | 'expense_updated';

export interface ActivityLog {
    id: string;
    projectId: string;
    type: ActivityType;
    message: string;
    metadata?: any;
    userId?: string;
    userName?: string;
    createdAt?: string; // Changed from any/Timestamp to string (ISO)
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
        const { error } = await supabase.from('project_activities').insert({
            project_id: projectId,
            type,
            message,
            metadata: metadata || {},
            user_id: userId || 'system',
            user_name: userName || 'System',
            created_at: new Date().toISOString()
        });

        if (error) throw error;
        console.log(`Activity logged [${type}]:`, message);
    } catch (error) {
        console.error("Error logging activity:", error);
    }
};

export const getProjectActivities = async (projectId: string): Promise<ActivityLog[]> => {
    const { data, error } = await supabase
        .from('project_activities')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) {
        console.error("Error fetching activities:", error);
        return [];
    }

    return data.map((d: any) => ({
        id: d.id,
        projectId: d.project_id,
        type: d.type,
        message: d.message,
        metadata: d.metadata,
        userId: d.user_id,
        userName: d.user_name,
        createdAt: d.created_at
    }));
};
