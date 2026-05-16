import { supabase } from '@/lib/supabase';

type TriggerType = 'service_due' | 'billing_generated' | 'scheduled' | 'project_status';

interface InvokeOptions {
    subscriptionId?: string;
    projectId?: string;
    installmentId?: string;
    statusId?: string;
    templateId?: string;
    triggerType: TriggerType;
    toOverride?: string[];
}

interface InvokeResult {
    ok: boolean;
    recipients?: string[];
    results?: Array<{ templateId: string; status: 'sent' | 'failed' | 'alreadySent'; error?: string }>;
    reason?: string;
    error?: string;
}

/**
 * Wrapper around the send-billing-email edge function.
 * Used for fire-and-forget notification triggers from the UI (status changes, manual sends).
 * Failures are logged but never thrown — UI flows must not be blocked by email issues.
 */
export async function sendTriggerEmail(opts: InvokeOptions): Promise<InvokeResult | null> {
    try {
        const { data, error } = await supabase.functions.invoke('send-billing-email', { body: opts });
        if (error) {
            console.warn('[triggers] send-billing-email error', error);
            return { ok: false, error: error.message };
        }
        return data as InvokeResult;
    } catch (err: any) {
        console.warn('[triggers] send-billing-email threw', err);
        return null;
    }
}
