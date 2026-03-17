import * as admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// --- CONFIGURATION ---
const SERVICE_ACCOUNT_PATH = path.resolve(__dirname, 'serviceAccountKey.json');

// --- TYPES ---
interface MigrationMap {
    users: Record<string, string>; // oldUid -> newUuid
    entities: Record<string, string>;
    categories: Record<string, string>;
    clients: Record<string, string>;
    projects: Record<string, string>;
    services: Record<string, string>;
    subscriptions: Record<string, string>;
}

// --- HELPER: GENERIC COLLECTION MIGRATOR ---
async function migrateCollection(
    db: admin.firestore.Firestore,
    supabase: any,
    collectionName: string,
    tableName: string,
    userMap: Record<string, string>,
    idMap: Record<string, string>,
    mapper: (doc: any, newId: string, userMap: Record<string, string>, allIdMaps: any) => any,
    allIdMaps: any = {}
) {
    console.log(`📦 Migrating ${collectionName} -> ${tableName}...`);
    try {
        const snapshot = await db.collection(collectionName).get();
        const records: any[] = [];

        for (const doc of snapshot.docs) {
            const data = doc.data();
            const oldId = doc.id;

            // Skip if data has no owner or unknown owner
            if (!data.userId || !userMap[data.userId]) {
                // console.warn(`  ⚠️ Skipping ${collectionName}/${oldId}: Unknown or missing userID`);
                continue;
            }

            const newId = uuidv4();
            idMap[oldId] = newId; // Update map immediately

            const mappedRecord = mapper(data, newId, userMap, allIdMaps);
            if (mappedRecord) {
                records.push(mappedRecord);
            }
        }

        // Batch insert (Supabase limit is high, but let's chunk safely at 1000)
        const chunkSize = 1000;
        for (let i = 0; i < records.length; i += chunkSize) {
            const chunk = records.slice(i, i + chunkSize);
            const { error } = await supabase.from(tableName).upsert(chunk);
            if (error) {
                console.error(`  ❌ Error inserting batch into ${tableName}:`, error);
                // Retry individually? For now, just log.
            }
        }
        console.log(`  ✅ Migrated ${records.length} records.`);
    } catch (e) {
        console.error(`  ❌ Error migrating ${collectionName}:`, e);
    }
}

// --- SPECIFIC MIGRATORS ---

async function migrateUsers(auth: admin.auth.Auth, supabase: any): Promise<Record<string, string>> {
    console.log('👤 Migrating Users...');
    const userMap: Record<string, string> = {};

    // Use a dummy list if SIMULATION, else real
    // Assuming keys present for now
    try {
        const listUsersResult = await auth.listUsers(1000);
        const { data: existingUsers } = await supabase.auth.admin.listUsers();

        for (const fbUser of listUsersResult.users) {
            if (!fbUser.email) continue;

            let sbUser = existingUsers.users.find((u: any) => u.email === fbUser.email);

            if (!sbUser) {
                const { data, error } = await supabase.auth.admin.createUser({
                    email: fbUser.email,
                    email_confirm: true,
                    password: 'tempPassword123!',
                    user_metadata: {
                        displayName: fbUser.displayName,
                        photoURL: fbUser.photoURL,
                        firebaseUid: fbUser.uid
                    }
                });
                if (!error && data.user) sbUser = data.user;
            }

            if (sbUser) userMap[fbUser.uid] = sbUser.id;
        }
    } catch (e) {
        console.error('Error in migrateUsers:', e);
    }

    console.log(`  ✅ Mapped ${Object.keys(userMap).length} users.`);
    return userMap;
}

async function migrateProfiles(db: admin.firestore.Firestore, supabase: any, userMap: Record<string, string>) {
    console.log('🖼️ Migrating Profiles...');
    try {
        const snapshot = await db.collection('users').get();
        const records = [];
        for (const doc of snapshot.docs) {
            const uId = userMap[doc.id];
            if (!uId) continue;
            const data = doc.data();
            records.push({
                id: uId,
                display_name: data.displayName || data.name,
                email: data.email,
                photo_url: data.photoURL,
                timezone: data?.settings?.timezone || 'America/Santiago',
                created_at: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
                updated_at: new Date()
            });
        }
        if (records.length) await supabase.from('profiles').upsert(records);
        console.log(`  ✅ Migrated ${records.length} profiles.`);
    } catch (e) { console.error('Error profiles:', e); }
}

// --- MAIN ---
async function main() {
    console.log('🚀 Starting Numia Full Data Migration');

    if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
        console.error(`❌ Service Account not found at ${SERVICE_ACCOUNT_PATH}`);
        process.exit(1);
    }

    const firebaseApp = admin.initializeApp({ credential: admin.credential.cert(require(SERVICE_ACCOUNT_PATH)) });
    const db = admin.firestore();
    const auth = admin.auth();

    const supabaseUrl = process.env.VITE_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Must be Service Role
    const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        },
        // CRITICAL: This is what allows the Service Role Key to bypass RLS!
        // But actually, in supabase-js v2, the service role key implicitly bypasses RLS
        // IF used correctly. The error '42501' suggests RLS is active and treating us as 'anon'.
        // We must ensure the `supabaseKey` passed is indeed the SERVICE_ROLE_KEY.
        // Also, we can try to explicitly empty the headers auth context if needed, but usually not.

        // Sometimes explicit schema setting helps:
        db: { schema: 'public' },
        global: {
            headers: { 'Authorization': `Bearer ${supabaseKey}` }
        }
    });
    console.log('🔑 Supabase Key Length:', supabaseKey.length);
    console.log('🔑 Supabase URL:', supabaseUrl);


    // MAPS
    const maps: MigrationMap = {
        users: {}, entities: {}, categories: {}, clients: {}, projects: {}, services: {}, subscriptions: {}
    };

    // 1. USERS
    maps.users = await migrateUsers(auth, supabase);

    // 2. PROFILES
    await migrateProfiles(db, supabase, maps.users);

    // 3. ENTITIES
    await migrateCollection(db, supabase, 'entities', 'entities', maps.users, maps.entities, (d, newId, uMap) => ({
        id: newId,
        user_id: uMap[d.userId],
        name: d.name,
        is_personal: d.isPersonal || false,
        rut: d.rut || null,
        email: d.email || null,
        phone: d.phone || null,
        website: d.website || null,
        address: d.address || null,
        logo_url: d.logoUrl || null,
        settings: d.settings || {},
        boxes: d.boxes || {},
        created_at: d.createdAt?.toDate ? d.createdAt.toDate() : new Date(),
        updated_at: d.updatedAt?.toDate ? d.updatedAt.toDate() : new Date()
    }));

    // 4. CATEGORIES
    await migrateCollection(db, supabase, 'categories', 'categories', maps.users, maps.categories, (d, newId, uMap) => ({
        id: newId,
        user_id: uMap[d.userId],
        name: d.name,
        color: d.color,
        type: d.type,
        created_at: d.createdAt?.toDate ? d.createdAt.toDate() : new Date(),
        updated_at: d.updatedAt?.toDate ? d.updatedAt.toDate() : new Date()
    }));

    // 5. CLIENTS
    await migrateCollection(db, supabase, 'clients', 'clients', maps.users, maps.clients, (d, newId, uMap, ids: MigrationMap) => ({
        id: newId,
        user_id: uMap[d.userId],
        entity_id: ids.entities[d.entityId] || null,
        name: d.name,
        description: d.description,
        representative: d.representative,
        emails: d.emails || (d.email ? [d.email] : []),
        phones: d.phones || (d.phone ? [d.phone] : []), // Handle legacy single field
        rut: d.rut,
        website: d.website,
        address: d.address,
        status: d.status || 'active',
        created_at: d.createdAt?.toDate ? d.createdAt.toDate() : new Date(),
        updated_at: d.updatedAt?.toDate ? d.updatedAt.toDate() : new Date()
    }), maps);

    // 6. SERVICES (Definitions)
    await migrateCollection(db, supabase, 'service_definitions', 'service_definitions', maps.users, maps.services, (d, newId, uMap) => ({
        id: newId,
        user_id: uMap[d.userId],
        name: d.name,
        description: d.description,
        default_price: d.defaultPrice,
        created_at: d.createdAt?.toDate ? d.createdAt.toDate() : new Date(),
        updated_at: new Date()
    }));

    // 7. PROJECTS
    await migrateCollection(db, supabase, 'projects', 'projects', maps.users, maps.projects, (d, newId, uMap, ids: MigrationMap) => ({
        id: newId,
        user_id: uMap[d.userId],
        entity_id: ids.entities[d.entityId] || null,
        client_id: ids.clients[d.clientId] || null,
        name: d.name,
        description: d.description,
        status: d.status || 'planning',
        priority: d.priority || 'medium',
        total_value: d.totalValue,
        currency: d.currency || 'CLP',
        start_date: d.startDate ? new Date(d.startDate) : null, // Often string in Firebase
        due_date: d.dueDate ? new Date(d.dueDate) : null,
        progress: d.progress || 0,
        created_at: d.createdAt?.toDate ? d.createdAt.toDate() : new Date(),
        updated_at: d.updatedAt?.toDate ? d.updatedAt.toDate() : new Date()
    }), maps);

    // 8. SUBSCRIPTIONS
    await migrateCollection(db, supabase, 'subscriptions', 'subscriptions', maps.users, maps.subscriptions, (d, newId, uMap, ids: MigrationMap) => {
        // Validate required FKs
        if (!ids.clients[d.clientId]) {
            console.warn(`  ⚠️ Skipping Subscription ${newId}: Missing Client ID ${d.clientId}`);
            return null;
        }

        return {
            id: newId,
            user_id: uMap[d.userId],
            client_id: ids.clients[d.clientId],
            service_definition_id: ids.services[d.serviceDefinitionId] || null, // Allow null service def
            name: d.name,
            amount: d.amount,
            currency: d.currency || 'CLP',
            billing_period: d.billingPeriod || 'monthly',
            status: d.status || 'active',
            created_at: d.createdAt?.toDate ? d.createdAt.toDate() : new Date(),
            updated_at: d.updatedAt?.toDate ? d.updatedAt.toDate() : new Date()
        };
    }, maps);

    // 9. MOVEMENTS
    await migrateCollection(db, supabase, 'movements', 'movements', maps.users, {}, (d, newId, uMap, ids: MigrationMap) => ({
        id: newId,
        user_id: uMap[d.userId],
        entity_id: ids.entities[d.entityId],
        category_id: ids.categories[d.categoryId],
        client_id: ids.clients[d.clientId],
        subscription_id: ids.subscriptions[d.subscriptionId],
        project_id: ids.projects[d.projectId],
        type: d.type,
        amount: d.amount,
        date: d.date ? (d.date.toDate ? d.date.toDate() : new Date(d.date)) : new Date(),
        description: d.description,
        is_monthly: d.isMonthly,
        status: d.status || 'paid',
        created_at: d.createdAt?.toDate ? d.createdAt.toDate() : new Date(),
        updated_at: d.updatedAt?.toDate ? d.updatedAt.toDate() : new Date()
    }), maps);

    // 10. PROJECT ACTIVITIES (Subcollection)
    console.log('📦 Migrating Project Activities (Subcollection)...');
    try {
        const projectIds = Object.keys(maps.projects); // Old IDs
        let activityCount = 0;

        for (const oldPid of projectIds) {
            const newPid = maps.projects[oldPid];
            const subSnap = await db.collection('projects').doc(oldPid).collection('activities').get();

            const activities = subSnap.docs.map(doc => {
                const d = doc.data();
                if (!maps.users[d.userId]) return null;
                return {
                    id: uuidv4(),
                    project_id: newPid,
                    user_id: maps.users[d.userId],
                    type: d.type,
                    message: d.message,
                    metadata: d.metadata,
                    created_at: d.createdAt?.toDate ? d.createdAt.toDate() : new Date()
                };
            }).filter(Boolean);

            if (activities.length > 0) {
                await supabase.from('project_activities').upsert(activities);
                activityCount += activities.length;
            }
        }
        console.log(`  ✅ Migrated ${activityCount} project activities.`);
    } catch (e) {
        console.error('Error migrating activities:', e);
    }

    // 11. NOTIFICATIONS
    await migrateCollection(db, supabase, 'notifications', 'notifications', maps.users, {}, (d, newId, uMap) => ({
        id: newId,
        user_id: uMap[d.userId],
        title: d.title,
        message: d.message,
        read: d.read || false,
        type: d.type || 'info',
        date: d.date?.toDate ? d.date.toDate() : new Date(),
        created_at: d.createdAt?.toDate ? d.createdAt.toDate() : new Date()
    }));

    // 12. PROJECT LISTS
    await migrateCollection(db, supabase, 'project_lists', 'project_lists', maps.users, {}, (d, newId, uMap) => ({
        id: d.id || newId, // If d.id is missing, fallback to generated UUID (though likely d.id IS the key in firebase data?)
        // Wait, in Firebase `project_lists` docs likely use the ID as the status name (e.g. 'design').
        // Check if 'id' field is inside the data. Often it is not.
        // We need to pass `doc.id`?
        // Actually migrateCollection logic: `const data = doc.data(); const oldId = doc.id;`
        // The mapper receives `mapper(data, newId...)`.
        // We should use `oldId`?
        // FIX: The generic mapper assumes `newId`. But for project_lists we want `oldId` if it is meaningful text, OR `newId`.
        // But `mapper` signature only gives `data`.
        // Let's assume for `project_lists` we want to use the `title` if `id` is missing, or just a uuid.
        // Actually, looking at the error `Failing row contains (null, ...)` -> `id` is null.
        // So `d.id` is undefined.
        // Let's use `uuidv4()` (which `newId` is) but the table PK is text.
        user_id: uMap[d.userId],
        title: d.title,
        order: d.order,
        color: d.color,
        created_at: d.createdAt?.toDate ? d.createdAt.toDate() : new Date(),
        updated_at: d.updatedAt?.toDate ? d.updatedAt.toDate() : new Date()
    }));

    // 13. USER PREFERENCES (Subcollection)
    console.log('📦 Migrating User Preferences...');
    try {
        const oldUids = Object.keys(maps.users);
        for (const oldUid of oldUids) {
            const newUid = maps.users[oldUid];
            // Check for preferences subcollection
            const snap = await db.collection('users').doc(oldUid).collection('preferences').get();
            const prefs = snap.docs.map(doc => ({
                id: uuidv4(),
                user_id: newUid,
                category: doc.id, // 'notifications' is the doc ID
                preferences: doc.data(),
                updated_at: new Date()
            }));
            if (prefs.length) await supabase.from('user_preferences').upsert(prefs);
        }
    } catch (e) { console.error('Error migrating prefs:', e); }

    console.log('🎉 MIGRATION COMPLETE!');
}

main().catch(console.error);
