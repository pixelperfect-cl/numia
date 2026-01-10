import { supabase } from '../supabase';
import * as mapper from './mapper';
import { Entity, Movement, Loan, Projection, Category, Client, Subscription, EntitySubscription, Project, ServiceDefinition } from '@/types';

// Generic writer that catches errors silently
const safeWrite = async (table: string, data: any, id: string) => {
    try {
        // Try UPDATE first (for partial updates), fallback to UPSERT for full records
        // Check if this looks like a partial update (missing critical fields)
        const isFull = data.name !== undefined || data.amount !== undefined || data.user_id !== undefined;

        if (isFull) {
            // Full record - use upsert
            const { error } = await supabase
                .from(table)
                .upsert({ ...data, id });

            if (error) {
                console.warn(`⚠️ Supabase Dual-Write Error [${table}]:`, error.message);
            }
        } else {
            // Partial update - use update only
            const { error } = await supabase
                .from(table)
                .update(data)
                .eq('id', id);

            if (error) {
                console.warn(`⚠️ Supabase Dual-Write Error [${table}]:`, error.message);
            }
        }
    } catch (err) {
        console.error(`💥 Supabase Dual-Write Exception [${table}]:`, err);
    }
};

const safeDelete = async (table: string, id: string) => {
    try {
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (error) console.warn(`⚠️ Supabase Delete Error [${table}]:`, error.message);
    } catch (err) {
        console.error(`💥 Supabase Delete Exception [${table}]:`, err);
    }
};

// ========== EXPORTED ADAPTERS ==========

export const syncEntity = (userId: string | undefined, id: string, data: Partial<Entity>) => {
    const mapped = mapper.mapEntity(userId, data);
    return safeWrite('entities', mapped, id);
};

export const syncCategory = (userId: string | undefined, id: string, data: Partial<Category>) => {
    const mapped = mapper.mapCategory(userId, data);
    return safeWrite('categories', mapped, id);
};

export const syncClient = (userId: string | undefined, id: string, data: Partial<Client>) => {
    const mapped = mapper.mapClient(userId, data);
    return safeWrite('clients', mapped, id);
};

export const syncServiceDefinition = (userId: string | undefined, id: string, data: Partial<ServiceDefinition>) => {
    const mapped = mapper.mapServiceDefinition(userId, data);
    safeWrite('service_definitions', mapped, id);
};

export const syncSubscription = (userId: string | undefined, clientId: string | undefined, id: string, data: Partial<Subscription>) => {
    const mapped = mapper.mapSubscription(userId, clientId, data);
    safeWrite('subscriptions', mapped, id);
};

export const syncEntitySubscription = (userId: string | undefined, entityId: string | undefined, id: string, data: Partial<EntitySubscription>) => {
    const mapped = mapper.mapEntitySubscription(userId, entityId, data);
    safeWrite('entity_subscriptions', mapped, id);
};

export const syncProject = (userId: string | undefined, id: string, data: Partial<Project>) => {
    const mapped = mapper.mapProject(userId, data);
    safeWrite('projects', mapped, id);
};

export const syncMovement = (userId: string | undefined, id: string, data: Partial<Movement>) => {
    const mapped = mapper.mapMovement(userId, data);
    safeWrite('movements', mapped, id);
};

export const syncLoan = (userId: string | undefined, id: string, data: Partial<Loan>) => {
    const mapped = mapper.mapLoan(userId, data);
    safeWrite('loans', mapped, id);
};

export const syncProjection = (userId: string | undefined, id: string, data: Partial<Projection>) => {
    const mapped = mapper.mapProjection(userId, data);
    safeWrite('projections', mapped, id);
};

// ========== DELETERS ==========

export const deleteEntity = (id: string) => safeDelete('entities', id);
export const deleteCategory = (id: string) => safeDelete('categories', id);
export const deleteClient = (id: string) => safeDelete('clients', id);
export const deleteServiceDefinition = (id: string) => safeDelete('service_definitions', id);
export const deleteSubscription = (id: string) => safeDelete('subscriptions', id);
export const deleteEntitySubscription = (id: string) => safeDelete('entity_subscriptions', id);
export const deleteProject = (id: string) => safeDelete('projects', id);
export const deleteMovement = (id: string) => safeDelete('movements', id);
export const deleteLoan = (id: string) => safeDelete('loans', id);
export const deleteProjection = (id: string) => safeDelete('projections', id);
