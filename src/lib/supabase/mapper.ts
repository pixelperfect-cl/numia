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
export const mapEntity = (userId: string | undefined, data: Partial<Entity>) => {
    const obj: any = { ...data };
    if (userId) obj.userId = userId;
    return mapObject(obj, {
        userId: 'user_id',
        logoUrl: 'logo_url',
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });
};

export const mapCategory = (userId: string | undefined, data: Partial<Category>) => {
    const obj: any = { ...data };
    if (userId) obj.userId = userId;
    return mapObject(obj, {
        userId: 'user_id',
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });
};

export const mapClient = (userId: string | undefined, data: Partial<Client>) => {
    const obj: any = { ...data };
    if (userId) obj.userId = userId;
    return mapObject(obj, {
        userId: 'user_id',
        entityId: 'entity_id',
        emails: 'emails',    // Manual map for clarity, matches new DB column
        phones: 'phones',    // Manual map for clarity, matches new DB column
        rut: 'rut',          // Matches new DB column
        status: 'status',    // Matches new DB column
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });
};

export const mapServiceDefinition = (userId: string | undefined, data: Partial<ServiceDefinition>) => {
    const obj: any = { ...data };
    if (userId) obj.userId = userId;
    return mapObject(obj, {
        userId: 'user_id',
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });
};

export const mapSubscription = (userId: string | undefined, clientId: string | undefined, data: Partial<Subscription>) => {
    const obj: any = { ...data };
    if (userId) obj.userId = userId;
    if (clientId) obj.clientId = clientId;
    // Payments array is for internal app use, not stored in subscription table
    if (obj.payments) delete obj.payments;

    return mapObject(obj, {
        userId: 'user_id',
        clientId: 'client_id',
        startDate: 'start_date',
        nextBillingDate: 'next_billing_date',
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });
};

export const mapEntitySubscription = (userId: string | undefined, entityId: string | undefined, data: Partial<EntitySubscription>) => {
    const obj: any = { ...data };
    if (userId) obj.userId = userId;
    if (entityId) obj.entityId = entityId;
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
    if (userId) obj.userId = userId;
    return mapObject(obj, {
        userId: 'user_id',
        entityId: 'entity_id',
        clientId: 'client_id',
        dueDate: 'due_date',
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });
};

export const mapMovement = (userId: string | undefined, data: Partial<Movement>) => {
    const obj: any = { ...data };
    if (userId) obj.userId = userId;

    const mapped = mapObject(obj, {
        userId: 'user_id',
        entityId: 'entity_id',
        categoryId: 'category_id',
        clientId: 'client_id',
        subscriptionId: 'subscription_id',
        billingPeriod: 'billing_period',
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    // Make sure date is YYYY-MM-DD string
    if (data.date) {
        mapped.date = String(data.date);
    }

    return mapped;
};

export const mapLoan = (userId: string | undefined, data: Partial<Loan>) => {
    const obj: any = { ...data };
    if (userId) obj.userId = userId;
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
    if (userId) obj.userId = userId;
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
