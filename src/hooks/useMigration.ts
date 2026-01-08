import { useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { supabase } from '@/lib/supabase';
import * as mapper from '@/lib/supabase/mapper';
import { useData } from '@/contexts/DataContext';

export type MigrationState = 'idle' | 'running' | 'completed' | 'error';

export function useMigration() {
    const [state, setState] = useState<MigrationState>('idle');
    const [progress, setProgress] = useState(0);
    const [logs, setLogs] = useState<string[]>([]);
    const { entities } = useData(); // We can use this to get current userId reference if needed, but better to migrate everything found in DB or filtered by logged user.
    // Ideally, valid migration should be done by an admin or for the currently logged user's data.
    // Assuming the user is logged in, we should migrate data accessible to them.
    // However, since this is a client-side tool, we'll iterate collections.

    const addLog = (msg: string) => setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);

    const migrateCollection = async (
        firebaseCollection: string,
        supabaseTable: string,
        mapFn: (userId: string | undefined, id: string, data: any) => any,
        label: string
    ) => {
        addLog(`Reading ${label} from Firebase...`);
        const snapshot = await getDocs(collection(db, firebaseCollection));
        const total = snapshot.size;

        if (total === 0) {
            addLog(`No ${label} found.`);
            return;
        }

        addLog(`Found ${total} ${label}. Syncing to Supabase...`);

        let processed = 0;
        const batchSize = 50;
        const docs = snapshot.docs;

        // Process in batches
        for (let i = 0; i < total; i += batchSize) {
            const chunk = docs.slice(i, i + batchSize);
            const rows = chunk.map(doc => {
                const data = doc.data();
                // Convert timestamps if necessary to Date objects expected by mapper, 
                // actually mapper handles Partial<T> where dates might be Timestamp or Date strings.
                // The mappers in `mapper.ts` expect `createdAt` etc.
                // We'll trust the mapper or cast accordingly.
                // Our existing mappers take (userId, data). 
                // We need to extract userId from data if it exists.
                return mapFn(data.userId, doc.id, {
                    ...data,
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
                    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
                    // For other date fields, we might need specific handling if they are Timestamps
                });
            });

            const { error } = await supabase.from(supabaseTable).upsert(rows);

            if (error) {
                addLog(`Error syncing batch of ${label}: ${error.message}`);
                console.error(error);
            } else {
                processed += chunk.length;
            }
        }

        addLog(`✅ Synced ${processed}/${total} ${label}.`);
    };

    const startMigration = async () => {
        if (state === 'running') return;
        setState('running');
        setProgress(0);
        setLogs([]);
        addLog('Starting migration sequence...');

        try {
            // 1. Entities
            await migrateCollection('entities', 'entities', (uid, id, data) => mapper.mapEntity(uid, { ...data, id }), 'Entities');
            setProgress(10);

            // 2. Categories
            await migrateCollection('categories', 'categories', (uid, id, data) => mapper.mapCategory(uid, { ...data, id }), 'Categories');
            setProgress(20);

            // 3. Service Definitions
            await migrateCollection('service_definitions', 'service_definitions', (uid, id, data) => mapper.mapServiceDefinition(uid, { ...data, id }), 'Services Catalog');
            setProgress(30);

            // 4. Clients
            await migrateCollection('clients', 'clients', (uid, id, data) => mapper.mapClient(uid, { ...data, id }), 'Clients');
            setProgress(45);

            // 5. Projects
            await migrateCollection('projects', 'projects', (uid, id, data) => mapper.mapProject(uid, { ...data, id }), 'Projects');
            setProgress(60);

            // 6. Subscriptions
            // Note: mapper.mapSubscription signature is (userId, clientId, data)
            // We need to extract clientId from data
            await migrateCollection('subscriptions', 'subscriptions', (uid, id, data) => mapper.mapSubscription(uid, data.clientId, { ...data, id }), 'Subscriptions');
            setProgress(75);

            // 7. Entity Subscriptions (Expenses)
            // mapper.mapEntitySubscription signature is (userId, entityId, data)
            await migrateCollection('entity_subscriptions', 'entity_subscriptions', (uid, id, data) => mapper.mapEntitySubscription(uid, data.entityId, { ...data, id }), 'Recurring Expenses');
            setProgress(85);

            // 8. Movements
            await migrateCollection('movements', 'movements', (uid, id, data) => {
                // Special handling for date field which might be string or timestamp in firebase
                // In mapper it expects string YYYY-MM-DD
                return mapper.mapMovement(uid, { ...data, id });
            }, 'Movements');
            setProgress(100);

            addLog('Migration completed successfully!');
            setState('completed');
        } catch (error: any) {
            addLog(`CRITICAL ERROR: ${error.message}`);
            setState('error');
        }
    };

    return { state, progress, logs, startMigration };
}
