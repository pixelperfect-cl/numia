import { Entity, Movement, Loan, Projection, Category, Client, Subscription, EntitySubscription, Project, ServiceDefinition } from '@/types';

// Helper to convert camelCase to snake_case
const toSnakeCase = (str: string) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

// Generic mapper for simple objects
const mapObject = (obj: any, overrides: Record<string, string> = {}) => {
    const newObj: any = {};
    Object.keys(obj).forEach(key => {
        const newKey = overrides[key] || toSnakeCase(key);
        if (obj[key] !== undefined) {
            newObj[newKey] = obj[key];
        }
    });
    return newObj;
};

// Specific mappers

// Helper to convert snake_case to camelCase
const toCamelCase = (str: string) => str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());

// Generic reverse mapper
const mapObjectFromSupabase = (obj: any, overrides: Record<string, string> = {}) => {
    const newObj: any = {};
    Object.keys(obj).forEach(key => {
        const newKey = overrides[key] || toCamelCase(key);
        if (obj[key] !== undefined && obj[key] !== null) {
            newObj[newKey] = obj[key];
        }
    });
    return newObj;
};

// ==========================================
// TO SUPABASE (Camel -> Snake)
// ==========================================

import { stringToUuid } from '@/lib/utils';

// Helper to safely convert string to UUID, handling empties
const safeStringToUuid = (val: any) => {
    if (!val || typeof val !== 'string' || val.trim() === '') return undefined;
    return stringToUuid(val);
}

export const mapEntity = (userId: string | undefined, data: Partial<Entity>) => {
    const obj: any = { ...data };
    obj.userId = userId; // Direct assignment (already Supabase UUID)

    // Convert ID to UUID (Firebase ID -> Hashed UUID)
    obj.id = safeStringToUuid(obj.id);

    // Remove unsupported columns (delete BEFORE mapping to avoid snake_case issues)
    delete obj.color;
    delete obj.icon;
    delete obj.type;

    return mapObject(obj, {
        userId: 'user_id',
        logoUrl: 'logo_url',
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });
};

export const mapCategory = (userId: string | undefined, data: Partial<Category>) => {
    const obj: any = { ...data };
    obj.userId = userId;
    obj.id = safeStringToUuid(obj.id);

    // Remove unsupported columns
    // Remove unsupported columns
    delete obj.icon;

    return mapObject(obj, {
        userId: 'user_id',
        subcategories: 'subcategories',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        order: 'order'
    });
};

export const mapClient = (userId: string | undefined, data: Partial<Client>) => {
    const obj: any = { ...data };
    obj.userId = userId;
    obj.id = safeStringToUuid(obj.id);
    obj.entityId = safeStringToUuid(obj.entityId);

    // Merge legacy fields into arrays if present
    if (obj.email) {
        // Ensure emails array exists and add email if not present
        const currentEmails = Array.isArray(obj.emails) ? obj.emails : [];
        if (!currentEmails.includes(obj.email)) {
            obj.emails = [...currentEmails, obj.email];
        }
    }

    if (obj.phone) {
        // Ensure phones array exists and add phone if not present
        const currentPhones = Array.isArray(obj.phones) ? obj.phones : [];
        if (!currentPhones.includes(obj.phone)) {
            obj.phones = [...currentPhones, obj.phone];
        }
    }

    // Remove legacy columns that don't exist in DB schemas to prevent "column not found" errors
    delete obj.email;
    delete obj.phone;

    return mapObject(obj, {
        userId: 'user_id',
        entityId: 'entity_id',
        emails: 'emails',
        phones: 'phones',
        rut: 'rut',
        website: 'website',
        status: 'status',
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });
};

export const mapServiceDefinition = (userId: string | undefined, data: Partial<ServiceDefinition>) => {
    const obj: any = { ...data };
    obj.userId = userId;
    obj.id = safeStringToUuid(obj.id);
    obj.categoryId = safeStringToUuid(obj.categoryId);

    // Remove unsupported columns
    // None - amount, currency, frequency are supported now

    return mapObject(obj, {
        userId: 'user_id',
        categoryId: 'category_id',
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });
};

// Helper to safely convert various date formats to ISO string
const safeDate = (val: any): string | undefined => {
    if (!val) return undefined;
    if (val.toDate && typeof val.toDate === 'function') return val.toDate().toISOString(); // Firestore Timestamp
    if (val instanceof Date) return val.toISOString();
    if (typeof val === 'string') {
        // If it's already a simple date string YYYY-MM-DD, preserve it to avoid timezone shifts
        if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;

        // Try parsing string
        const d = new Date(val);
        if (!isNaN(d.getTime())) return d.toISOString();
    }
    return undefined;
};

export const mapSubscription = (userId: string | undefined, clientId: string | undefined, data: Partial<Subscription>) => {
    const obj: any = { ...data };
    obj.userId = userId;
    obj.clientId = safeStringToUuid(clientId);
    obj.id = safeStringToUuid(obj.id);

    // Payments are included implicitly if passing through mapObject, assuming DB has 'payments' column (JSONB)
    // If DB doesn't have 'payments' column, this data will be lost or cause error.
    // Given previous error was about 'history', 'payments' might be fine.
    // Checking mapObject below... it maps specific keys. I need to make sure 'payments' is mapped correctly.
    // The mapObject call below maps specific keys. If 'payments' isn't there, it won't be mapped implicitly unless I add it.
    // Let's see mapObject implementation (line 59). It only uses `overrides` to key-change, but `mapObject` iterates over `obj` keys?
    // No, `mapObject` iterates `Object.keys(obj)`.
    // So if I leave `payments` in `obj`, `mapObject` will snake_case it to `payments` (if not overridden).
    // Does the DB have `payments` column? Based on `fromSubscription` (line 354, not showing payments mapping?), wait.
    // `fromSubscription` does NOT map `payments`.
    // Actually, `fromSubscription` uses `mapObjectFromSupabase`.
    // If I look at `Services.tsx`, `EnhancedSubscription` has `payments` array.
    // If the DB column is named `payments` (jsonb), then `mapObject` will convert key 'payments' to 'payments'.
    // I should just remove the delete line. And maybe `delete obj.notes` too if notes are needed?
    // User complaint is about payments history.

    // Removing the delete line is step 1.
    delete obj.notes;

    // Explicitly convert dates
    if (obj.startDate) obj.startDate = safeDate(obj.startDate);
    if (obj.nextBillingDate) obj.nextBillingDate = safeDate(obj.nextBillingDate);

    return mapObject(obj, {
        userId: 'user_id',
        clientId: 'client_id',
        startDate: 'start_date',
        nextBillingDate: 'next_billing_date',
        frequency: 'billing_period',
        archiveReason: 'archive_reason',
        archiveNotes: 'archive_notes',
        archivedAt: 'archived_at',
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });
};

export const mapEntitySubscription = (userId: string | undefined, entityId: string | undefined, data: Partial<EntitySubscription>) => {
    const obj: any = { ...data };
    obj.userId = userId;
    obj.entityId = safeStringToUuid(entityId);
    obj.id = safeStringToUuid(obj.id);
    obj.categoryId = safeStringToUuid(obj.categoryId);

    delete obj.box;

    return mapObject(obj, {
        userId: 'user_id',
        entityId: 'entity_id',
        billingCycle: 'billing_cycle',
        nextPaymentDate: 'next_payment_date',
        categoryId: 'category_id',
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });
};

export const mapProject = (userId: string | undefined, data: Partial<Project>) => {
    const obj: any = { ...data };
    obj.userId = userId;
    obj.id = safeStringToUuid(obj.id);
    obj.entityId = safeStringToUuid(obj.entityId);
    obj.clientId = safeStringToUuid(obj.clientId);

    delete obj.amount;
    delete obj.archived; // No 'archived' column in DB - archival is determined by archive_date presence

    // Ensure nulls for empty date strings
    if (obj.dueDate === '') obj.dueDate = null;
    if (obj.archiveDate === '') obj.archiveDate = null;
    if (obj.archiveReason === '') obj.archiveReason = null;

    return mapObject(obj, {
        userId: 'user_id',
        entityId: 'entity_id',
        clientId: 'client_id',
        logoUrl: 'logo_url',
        dueDate: 'due_date',
        archiveDate: 'archive_date',
        archiveReason: 'archive_reason',
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });
};

export const mapMovement = (userId: string | undefined, data: Partial<Movement>) => {
    const obj: any = { ...data };
    obj.userId = userId;
    obj.id = safeStringToUuid(obj.id);

    // Foreign Keys to UUID
    obj.entityId = safeStringToUuid(obj.entityId);
    obj.categoryId = safeStringToUuid(obj.categoryId);
    obj.clientId = safeStringToUuid(obj.clientId);
    obj.subscriptionId = safeStringToUuid(obj.subscriptionId);

    if (obj.category) delete obj.category;
    delete obj.box;
    delete obj.history;
    delete obj.subcategory;
    delete obj.subCategory;

    const mapped = mapObject(obj, {
        userId: 'user_id',
        entityId: 'entity_id',
        categoryId: 'category_id',
        clientId: 'client_id',
        subscriptionId: 'subscription_id',
        billingPeriod: 'billing_period',
        bankTransactionId: 'bank_transaction_id',
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    // Validate final object keys to prevents DB errors
    if ('box' in mapped) delete mapped['box'];
    if ('box_id' in mapped) delete mapped['box_id'];
    if ('history' in mapped) delete mapped['history'];

    if (data.date) {
        mapped.date = String(data.date);
    }

    // Force remove subcategory if it leaked through mapObject (just in case)
    delete mapped.subcategory;

    return mapped;
};

export const mapLoan = (userId: string | undefined, data: Partial<Loan>) => {
    const obj: any = { ...data };
    obj.userId = userId;
    obj.id = safeStringToUuid(obj.id);
    obj.entityId = safeStringToUuid(obj.entityId);

    return mapObject(obj, {
        userId: 'user_id',
        entityId: 'entity_id',
        personName: 'person_name',
        amountPaid: 'amount_paid',
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });
};

export const mapProjection = (userId: string | undefined, data: Partial<Projection>) => {
    const obj: any = { ...data };
    obj.userId = userId;
    obj.id = safeStringToUuid(obj.id);
    obj.entityId = safeStringToUuid(obj.entityId);

    delete obj.expense_items;
    delete obj.expenseItems;
    delete obj.income_items;
    delete obj.incomeItems;
    delete obj.totals;

    return mapObject(obj, {
        userId: 'user_id',
        entityId: 'entity_id',
        periodType: 'period_type',
        fixedIncome: 'fixed_income',
        fixedExpenses: 'fixed_expenses',
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });
};

export const mapProjectList = (userId: string | undefined, data: Partial<any>) => {
    const obj: any = { ...data };
    if (userId) obj.userId = safeStringToUuid(userId);
    return mapObject(obj, {
        userId: 'user_id',
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });
};




// ==========================================
// FROM SUPABASE (Snake -> Camel)
// ==========================================

export const fromEntity = (data: any): Entity => {
    const mapped = mapObjectFromSupabase(data, {
        user_id: 'userId',
        logo_url: 'logoUrl',
        created_at: 'createdAt',
        updated_at: 'updatedAt'
    });
    // Ensure dates are Dates
    mapped.createdAt = new Date(mapped.createdAt);
    mapped.updatedAt = new Date(mapped.updatedAt);
    return mapped as Entity;
};

export const fromCategory = (data: any): Category => {
    const mapped = mapObjectFromSupabase(data, {
        user_id: 'userId',
        subcategories: 'subcategories',
        created_at: 'createdAt',
        updated_at: 'updatedAt',
        order: 'order'
    });
    mapped.createdAt = new Date(mapped.createdAt);
    mapped.updatedAt = new Date(mapped.updatedAt);
    return mapped as Category;
};

export const fromClient = (data: any): Client => {
    const mapped = mapObjectFromSupabase(data, {
        user_id: 'userId',
        entity_id: 'entityId',
        created_at: 'createdAt',
        updated_at: 'updatedAt'
    });
    mapped.createdAt = new Date(mapped.createdAt);
    mapped.updatedAt = new Date(mapped.updatedAt);

    // Backfill legacy fields for UI compatibility
    if (!mapped.email && mapped.emails && Array.isArray(mapped.emails) && mapped.emails.length > 0) {
        mapped.email = mapped.emails[0];
    }
    if (!mapped.phone && mapped.phones && Array.isArray(mapped.phones) && mapped.phones.length > 0) {
        mapped.phone = mapped.phones[0];
    }

    return mapped as Client;
};

export const fromProject = (data: any): Project => {
    const mapped = mapObjectFromSupabase(data, {
        user_id: 'userId',
        entity_id: 'entityId',
        client_id: 'clientId',
        logo_url: 'logoUrl',
        due_date: 'dueDate',
        archive_date: 'archiveDate',
        archive_reason: 'archiveReason',
        created_at: 'createdAt',
        updated_at: 'updatedAt'
    });
    mapped.createdAt = new Date(mapped.createdAt);
    mapped.updatedAt = new Date(mapped.updatedAt);
    // Compute archived from archiveDate since there's no 'archived' column in DB
    mapped.archived = !!data.archive_date;
    // Note: ProjectStatus is just string, so no conversion needed
    return mapped as Project;
};

export const fromSubscription = (data: any): Subscription => {
    const mapped = mapObjectFromSupabase(data, {
        user_id: 'userId',
        client_id: 'clientId',
        start_date: 'startDate',
        next_billing_date: 'nextBillingDate',
        billing_period: 'frequency',
        archive_reason: 'archiveReason',
        archive_notes: 'archiveNotes',
        archived_at: 'archivedAt',
        created_at: 'createdAt',
        updated_at: 'updatedAt'
    });
    mapped.createdAt = new Date(mapped.createdAt);
    mapped.updatedAt = new Date(mapped.updatedAt);
    return mapped as Subscription;
};

export const fromMovement = (data: any): Movement => {
    const mapped = mapObjectFromSupabase(data, {
        user_id: 'userId',
        entity_id: 'entityId',
        category_id: 'categoryId',
        client_id: 'clientId',
        subscription_id: 'subscriptionId',
        billing_period: 'billingPeriod',
        bank_transaction_id: 'bankTransactionId',
        created_at: 'createdAt',
        updated_at: 'updatedAt'
    });
    mapped.createdAt = new Date(mapped.createdAt);
    mapped.updatedAt = new Date(mapped.updatedAt);
    // Determine status backward compatibility if checked logic exists
    return mapped as Movement;
};

export const fromServiceDefinition = (data: any): ServiceDefinition => {
    const mapped = mapObjectFromSupabase(data, {
        user_id: 'userId',
        category_id: 'categoryId',
        created_at: 'createdAt',
        updated_at: 'updatedAt'
    });
    mapped.createdAt = new Date(mapped.createdAt);
    mapped.updatedAt = new Date(mapped.updatedAt);
    return mapped as ServiceDefinition;
};

export const fromEntitySubscription = (data: any): EntitySubscription => {
    const mapped = mapObjectFromSupabase(data, {
        user_id: 'userId',
        entity_id: 'entityId',
        billing_cycle: 'billingCycle',
        next_payment_date: 'nextPaymentDate',
        category_id: 'categoryId',
        created_at: 'createdAt',
        updated_at: 'updatedAt'
    });
    mapped.createdAt = new Date(mapped.createdAt);
    mapped.updatedAt = new Date(mapped.updatedAt);
    return mapped as EntitySubscription;
};

export const fromLoan = (data: any): Loan => {
    const mapped = mapObjectFromSupabase(data, {
        user_id: 'userId',
        entity_id: 'entityId',
        person_name: 'personName',
        amount_paid: 'amountPaid',
        created_at: 'createdAt',
        updated_at: 'updatedAt'
    });
    mapped.createdAt = new Date(mapped.createdAt);
    mapped.updatedAt = new Date(mapped.updatedAt);
    return mapped as Loan;
};

export const fromProjection = (data: any): Projection => {
    const mapped = mapObjectFromSupabase(data, {
        user_id: 'userId',
        entity_id: 'entityId',
        period_type: 'periodType',
        fixed_income: 'fixedIncome',
        fixed_expenses: 'fixedExpenses',
        created_at: 'createdAt',
        updated_at: 'updatedAt'
    });
    mapped.createdAt = new Date(mapped.createdAt);
    mapped.updatedAt = new Date(mapped.updatedAt);
    return mapped as Projection;
};

export const fromProjectList = (data: any): any => {
    const mapped = mapObjectFromSupabase(data, {
        user_id: 'userId',
        created_at: 'createdAt',
        updated_at: 'updatedAt'
    });
    mapped.createdAt = new Date(mapped.createdAt);
    mapped.updatedAt = new Date(mapped.updatedAt);
    return mapped;
};



