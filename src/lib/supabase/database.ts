/**
 * Numia v1.0 - Supabase Database Operations
 */

import { supabase } from '../supabase';
import { Entity, Movement, Loan, Projection, Category, Client, Subscription, EntitySubscription, Project, ServiceDefinition, ProjectList, Notification } from '@/types';
import * as mapper from './mapper';

// ========== ENTITIES ==========

export const getEntities = async (userId: string): Promise<Entity[]> => {
    console.log('🔍 Supabase DB: getEntities called for user:', userId);
    const { data, error } = await supabase
        .from('entities')
        .select('*')
        .eq('user_id', userId);

    if (error) {
        console.error('❌ Supabase DB: getEntities error:', error);
        throw error;
    }

    console.log(`✅ Supabase DB: getEntities found ${data?.length} records`);
    if (data && data.length > 0) {
        console.log('Sample entity raw:', data[0]);
    }

    try {
        const mapped = data.map(mapper.fromEntity);
        console.log('✅ Mapper success. Count:', mapped.length);
        return mapped;
    } catch (e) {
        console.error('❌ Mapper error:', e);
        throw e;
    }
};

export const getEntity = async (entityId: string): Promise<Entity | null> => {
    const { data, error } = await supabase
        .from('entities')
        .select('*')
        .eq('id', entityId)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null; // Not found code
        throw error;
    }
    return mapper.fromEntity(data);
};

export const createEntity = async (userId: string, data: Omit<Entity, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const payload = mapper.mapEntity(userId, data);
    const { data: inserted, error } = await supabase
        .from('entities')
        .insert(payload)
        .select('id')
        .single();

    if (error) throw error;
    return inserted.id;
};

export const updateEntity = async (entityId: string, data: Partial<Entity>): Promise<void> => {
    const payload = mapper.mapEntity(undefined, data);
    if (data.userId) payload.user_id = data.userId;

    const { error } = await supabase
        .from('entities')
        .update(payload)
        .eq('id', entityId);

    if (error) throw error;
};

export const deleteEntity = async (entityId: string): Promise<void> => {
    const { error } = await supabase
        .from('entities')
        .delete()
        .eq('id', entityId);

    if (error) throw error;
};

// ========== MOVEMENTS ==========

export const getMovements = async (
    userId: string,
    options?: string | { entityId?: string; startDate?: string; endDate?: string; projectId?: string }
): Promise<Movement[]> => {
    let entityId: string | undefined;
    let startDate: string | undefined;
    let endDate: string | undefined;
    let projectId: string | undefined;

    if (typeof options === 'string') {
        entityId = options;
    } else if (typeof options === 'object') {
        entityId = options.entityId;
        startDate = options.startDate;
        endDate = options.endDate;
        projectId = options.projectId;
    }

    let allMovements: Movement[] = [];
    let from = 0;
    const PAGE_SIZE = 1000;
    let hasMore = true;

    while (hasMore) {
        let query = supabase.from('movements').select('*').eq('user_id', userId);

        if (entityId) query = query.eq('entity_id', entityId);
        if (startDate) query = query.gte('date', startDate);
        if (endDate) query = query.lte('date', endDate);

        query = query.order('date', { ascending: false }).order('created_at', { ascending: false });
        query = query.range(from, from + PAGE_SIZE - 1);

        const { data, error } = await query;
        if (error) throw error;

        if (data && data.length > 0) {
            const mapped = data.map(mapper.fromMovement);
            allMovements = [...allMovements, ...mapped];

            if (data.length < PAGE_SIZE) {
                hasMore = false;
            } else {
                from += PAGE_SIZE;
            }
        } else {
            hasMore = false;
        }

        // Safety break
        if (from > 50000) hasMore = false;
    }

    if (projectId) {
        allMovements = allMovements.filter(m => m.projectId === projectId);
    }

    return allMovements;
};

export const createMovement = async (userId: string, data: Omit<Movement, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const payload = mapper.mapMovement(userId, data);
    const { data: inserted, error } = await supabase
        .from('movements')
        .insert(payload)
        .select('id')
        .single();

    if (error) throw error;
    return inserted.id;
};

export const updateMovement = async (movementId: string, data: Partial<Movement>): Promise<void> => {
    const payload = mapper.mapMovement(undefined, data);
    const { error } = await supabase
        .from('movements')
        .update(payload)
        .eq('id', movementId);

    if (error) throw error;
};

export const deleteMovement = async (movementId: string): Promise<void> => {
    const { error } = await supabase
        .from('movements')
        .delete()
        .eq('id', movementId);

    if (error) throw error;
};

export const createBatchMovements = async (
    userId: string,
    movements: Omit<Movement, 'id' | 'userId' | 'createdAt' | 'updatedAt'>[]
): Promise<{ inserted: number; skipped: number }> => {
    if (movements.length === 0) return { inserted: 0, skipped: 0 };

    // Collect all bankTransactionIds from the incoming batch
    const incomingIds = movements
        .map(m => m.bankTransactionId)
        .filter((id): id is string => !!id && id.trim() !== '');

    // Query existing bankTransactionIds to detect duplicates
    let existingIds = new Set<string>();
    if (incomingIds.length > 0) {
        // Get unique entity IDs from the batch
        const entityIds = [...new Set(movements.map(m => m.entityId))];

        for (const entityId of entityIds) {
            const ids = await getExistingBankTransactionIds(userId, entityId);
            ids.forEach(id => existingIds.add(id));
        }
    }

    // Filter out duplicates
    const uniqueMovements = movements.filter(m => {
        if (!m.bankTransactionId || m.bankTransactionId.trim() === '') return true; // No ID = always insert
        return !existingIds.has(m.bankTransactionId);
    });

    const skipped = movements.length - uniqueMovements.length;

    if (uniqueMovements.length === 0) return { inserted: 0, skipped };

    const CHUNK_SIZE = 500;
    for (let i = 0; i < uniqueMovements.length; i += CHUNK_SIZE) {
        const chunk = uniqueMovements.slice(i, i + CHUNK_SIZE);
        const payload = chunk.map(m => mapper.mapMovement(userId, m));
        const { error } = await supabase.from('movements').insert(payload);
        if (error) throw error;
    }

    return { inserted: uniqueMovements.length, skipped };
};

/**
 * Get existing bank transaction IDs for a user+entity pair.
 * Used by the UI to pre-mark duplicates before import.
 */
export const getExistingBankTransactionIds = async (
    userId: string,
    entityId: string
): Promise<Set<string>> => {
    const { data, error } = await supabase
        .from('movements')
        .select('bank_transaction_id')
        .eq('user_id', userId)
        .eq('entity_id', entityId)
        .not('bank_transaction_id', 'is', null);

    if (error) throw error;

    const ids = new Set<string>();
    data?.forEach((row: any) => {
        if (row.bank_transaction_id) ids.add(row.bank_transaction_id);
    });
    return ids;
};

// ========== LOANS ==========

export const getLoans = async (userId: string, entityId?: string): Promise<Loan[]> => {
    let query = supabase.from('loans').select('*').eq('user_id', userId);
    if (entityId) query = query.eq('entity_id', entityId);
    query = query.order('date', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;
    return data.map(mapper.fromLoan);
};

export const createLoan = async (userId: string, data: Omit<Loan, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const payload = mapper.mapLoan(userId, data);
    const { data: inserted, error } = await supabase.from('loans').insert(payload).select('id').single();
    if (error) throw error;
    return inserted.id;
};

export const updateLoan = async (loanId: string, data: Partial<Loan>): Promise<void> => {
    const payload = mapper.mapLoan(undefined, data);
    const { error } = await supabase.from('loans').update(payload).eq('id', loanId);
    if (error) throw error;
};

export const deleteLoan = async (loanId: string): Promise<void> => {
    const { error } = await supabase.from('loans').delete().eq('id', loanId);
    if (error) throw error;
};

// ========== PROJECTIONS ==========

export const getProjections = async (userId: string, entityId?: string): Promise<Projection[]> => {
    let query = supabase.from('projections').select('*').eq('user_id', userId);
    if (entityId) query = query.eq('entity_id', entityId);
    query = query.order('period', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;
    return data.map(mapper.fromProjection);
};

export const createProjection = async (userId: string, data: Omit<Projection, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const payload = mapper.mapProjection(userId, data);
    const { data: inserted, error } = await supabase.from('projections').insert(payload).select('id').single();
    if (error) throw error;
    return inserted.id;
};

export const updateProjection = async (projectionId: string, data: Partial<Projection>): Promise<void> => {
    const payload = mapper.mapProjection(undefined, data);
    const { error } = await supabase.from('projections').update(payload).eq('id', projectionId);
    if (error) throw error;
};

export const deleteProjection = async (projectionId: string): Promise<void> => {
    const { error } = await supabase.from('projections').delete().eq('id', projectionId);
    if (error) throw error;
};

// ========== CATEGORIES ==========

export const getCategories = async (userId: string): Promise<Category[]> => {
    const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', userId)
        .order('order', { ascending: true, nullsFirst: false })
        .order('name', { ascending: true });

    if (error) throw error;
    return data.map(mapper.fromCategory);
};

export const createCategory = async (userId: string, data: Omit<Category, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const payload = mapper.mapCategory(userId, data);
    const { data: inserted, error } = await supabase.from('categories').insert(payload).select('id').single();
    if (error) throw error;
    return inserted.id;
};

export const updateCategory = async (categoryId: string, data: Partial<Category>): Promise<void> => {
    const payload = mapper.mapCategory(undefined, data);
    const { error } = await supabase.from('categories').update(payload).eq('id', categoryId);
    if (error) throw error;
};

export const deleteCategory = async (categoryId: string): Promise<void> => {
    const { error } = await supabase.from('categories').delete().eq('id', categoryId);
    if (error) throw error;
};

export const updateCategoryOrder = async (userId: string, categories: { id: string; order: number }[]): Promise<void> => {
    // Supabase doesn't have a direct batch update for different values in one go easily without RPC or loop.
    // For a small number of categories, a loop is acceptable. simpler.
    // Or upsert.
    const updates = categories.map(c => ({
        id: c.id,
        order: c.order,
        updated_at: new Date()
    }));

    // We can't use upsert easily with partial data if we want to avoid overwriting other fields?
    // Actually upsert updates columns specified.
    // But we need to make sure we don't wipe other fields if we only pass ID and order.
    // Supabase upsert requires all non-nullable columns if inserting, but for updating it might be fine if ID exists.
    // However, the mapper expects camelCase input and converts to snake_case.
    // Let's use loop for safety and simplicity for now as categories list is small (<100 usually).

    // Better approach: use `upsert` but we need to match the columns. 
    // Wait, updateCategory uses `update`.
    // Let's iterate. Promise.all for parallelism.

    const promises = categories.map(c =>
        supabase.from('categories').update({ order: c.order, updated_at: new Date() }).eq('id', c.id)
    );

    await Promise.all(promises);
};

export const initializeDefaultCategories = async (userId: string, defaultCategories: any[]): Promise<void> => {
    const payload = defaultCategories.map(c => mapper.mapCategory(userId, c));
    const { error } = await supabase.from('categories').insert(payload);
    if (error) throw error;
};

// ========== CLIENTS ==========

export const getClients = async (userId: string): Promise<Client[]> => {
    console.log('🔍 Supabase DB: getClients called for user:', userId);
    const { data, error } = await supabase.from('clients').select('*').eq('user_id', userId);

    if (error) {
        console.error('❌ Supabase DB: getClients error:', error);
        throw error;
    }

    console.log(`✅ Supabase DB: getClients found ${data?.length} records`);
    return data.map(mapper.fromClient);
};

export const createClient = async (userId: string, data: Omit<Client, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const payload = mapper.mapClient(userId, data);
    const { data: inserted, error } = await supabase.from('clients').insert(payload).select('id').single();
    if (error) throw error;
    return inserted.id;
};

export const getClient = async (clientId: string): Promise<Client | null> => {
    const { data, error } = await supabase.from('clients').select('*').eq('id', clientId).single();
    if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
    }
    return mapper.fromClient(data);
};

export const updateClient = async (clientId: string, data: Partial<Client>): Promise<void> => {
    const payload = mapper.mapClient(undefined, data);
    const { error } = await supabase.from('clients').update(payload).eq('id', clientId);
    if (error) throw error;
};

export const deleteClient = async (clientId: string, userId: string): Promise<void> => {
    // 1. Projects Validation
    const { count: projectCount, error: projError } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .neq('status', 'completed');

    if (projError) throw projError;
    if (projectCount && projectCount > 0) {
        throw new Error(`e_projects:No se puede eliminar el cliente porque tiene ${projectCount} proyectos activos.`);
    }

    // 2. Subscriptions Validation
    const { count: subsCount, error: subsError } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .eq('status', 'active');

    if (subsError) throw subsError;
    if (subsCount && subsCount > 0) {
        throw new Error(`e_subs:No se puede eliminar el cliente porque tiene ${subsCount} suscripciones activas.`);
    }

    // 3. Delete
    const { error } = await supabase.from('clients').delete().eq('id', clientId);
    if (error) throw error;
};

// ========== SUBSCRIPTIONS (ERP CLIENTS) ==========

export const getSubscriptions = async (clientId: string, userId: string): Promise<Subscription[]> => {
    const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('client_id', clientId)
        .eq('user_id', userId);

    if (error) throw error;
    return data.map(mapper.fromSubscription);
};

export const getAllSubscriptions = async (userId: string): Promise<Subscription[]> => {
    const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId);

    if (error) throw error;
    return data.map(mapper.fromSubscription);
};

export const createSubscription = async (userId: string, clientId: string, data: Omit<Subscription, 'id' | 'clientId' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const payload = mapper.mapSubscription(userId, clientId, data);
    const { data: inserted, error } = await supabase.from('subscriptions').insert(payload).select('id').single();
    if (error) throw error;
    return inserted.id;
};

export const updateSubscription = async (subscriptionId: string, data: Partial<Subscription>): Promise<void> => {
    const payload = mapper.mapSubscription(undefined, undefined, data);
    const { error } = await supabase.from('subscriptions').update(payload).eq('id', subscriptionId);
    if (error) throw error;
};

export const deleteSubscription = async (subscriptionId: string): Promise<void> => {
    const { error } = await supabase.from('subscriptions').delete().eq('id', subscriptionId);
    if (error) throw error;
};

// ========== SERVICE DEFINITIONS (CATALOG) ==========

export const getServiceDefinitions = async (userId: string): Promise<ServiceDefinition[]> => {
    const { data, error } = await supabase
        .from('service_definitions')
        .select('*')
        .eq('user_id', userId)
        .order('name', { ascending: true });

    if (error) throw error;
    return data.map(mapper.fromServiceDefinition);
};

export const createServiceDefinition = async (userId: string, data: Omit<ServiceDefinition, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const payload = mapper.mapServiceDefinition(userId, data);
    const { data: inserted, error } = await supabase.from('service_definitions').insert(payload).select('id').single();
    if (error) throw error;
    return inserted.id;
};

export const updateServiceDefinition = async (id: string, data: Partial<ServiceDefinition>): Promise<void> => {
    const payload = mapper.mapServiceDefinition(undefined, data);
    const { error } = await supabase.from('service_definitions').update(payload).eq('id', id);
    if (error) throw error;
};

export const deleteServiceDefinition = async (id: string): Promise<void> => {
    const { error } = await supabase.from('service_definitions').delete().eq('id', id);
    if (error) throw error;
};

// ========== ENTITY SUBSCRIPTIONS (EXPENSES) ==========

export const getUserEntitySubscriptions = async (userId: string): Promise<EntitySubscription[]> => {
    const { data, error } = await supabase.from('entity_subscriptions').select('*').eq('user_id', userId);
    if (error) throw error;
    return data.map(mapper.fromEntitySubscription);
};

export const getEntitySubscriptions = async (entityId: string): Promise<EntitySubscription[]> => {
    const { data, error } = await supabase.from('entity_subscriptions').select('*').eq('entity_id', entityId);
    if (error) throw error;
    return data.map(mapper.fromEntitySubscription);
};

export const createEntitySubscription = async (userId: string, entityId: string, data: Omit<EntitySubscription, 'id' | 'userId' | 'entityId' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const payload = mapper.mapEntitySubscription(userId, entityId, data);
    const { data: inserted, error } = await supabase.from('entity_subscriptions').insert(payload).select('id').single();
    if (error) throw error;
    return inserted.id;
};

export const updateEntitySubscription = async (subscriptionId: string, data: Partial<EntitySubscription>): Promise<void> => {
    const payload = mapper.mapEntitySubscription(undefined, undefined, data);
    const { error } = await supabase.from('entity_subscriptions').update(payload).eq('id', subscriptionId);
    if (error) throw error;
};

export const deleteEntitySubscription = async (subscriptionId: string): Promise<void> => {
    const { error } = await supabase.from('entity_subscriptions').delete().eq('id', subscriptionId);
    if (error) throw error;
};

// ========== PROJECTS ==========

export const getProjects = async (userId: string): Promise<Project[]> => {
    const { data, error } = await supabase.from('projects').select('*').eq('user_id', userId);
    if (error) throw error;
    return data.map(mapper.fromProject);
};

export const createProject = async (userId: string, data: Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const payload = mapper.mapProject(userId, data);
    const { data: inserted, error } = await supabase.from('projects').insert(payload).select('id').single();
    if (error) throw error;
    return inserted.id;
};

export const updateProject = async (projectId: string, data: Partial<Project>): Promise<void> => {
    const payload = mapper.mapProject(undefined, data);
    const { error } = await supabase.from('projects').update(payload).eq('id', projectId);
    if (error) throw error;
};

export const getProject = async (projectId: string): Promise<Project | null> => {
    const { data, error } = await supabase.from('projects').select('*').eq('id', projectId).single();
    if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
    }
    return mapper.fromProject(data);
};

export const subscribeToProject = (projectId: string, callback: (project: Project | null) => void) => {
    // Fetch initial project data
    getProject(projectId).then(callback);

    // Set up realtime subscription for updates
    const channel = supabase
        .channel(`project-${projectId}`)
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'projects', filter: `id=eq.${projectId}` },
            (payload) => {
                if (payload.eventType === 'DELETE') {
                    callback(null);
                } else {
                    callback(mapper.fromProject(payload.new));
                }
            }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
};

export const deleteProject = async (projectId: string): Promise<void> => {
    const { error } = await supabase.from('projects').delete().eq('id', projectId);
    if (error) throw error;
};

// ========== PROJECT LISTS (KANBAN) ==========

export const getProjectLists = async (userId: string): Promise<ProjectList[]> => {
    const { data, error } = await supabase
        .from('project_lists')
        .select('*')
        .eq('user_id', userId)
        .order('order', { ascending: true });

    if (error) throw error;
    return data.map(mapper.fromProjectList);
};

export const createProjectList = async (userId: string, data: Omit<ProjectList, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const payload = mapper.mapProjectList(userId, data);
    const { data: inserted, error } = await supabase.from('project_lists').insert(payload).select('id').single();
    if (error) throw error;
    return inserted.id;
};

export const updateProjectList = async (listId: string, data: Partial<ProjectList>): Promise<void> => {
    const payload = mapper.mapProjectList(undefined, data);
    const { error } = await supabase.from('project_lists').update(payload).eq('id', listId);
    if (error) throw error;
};

export const deleteProjectList = async (listId: string): Promise<void> => {
    const { error } = await supabase.from('project_lists').delete().eq('id', listId);
    if (error) throw error;
};

export const initializeDefaultProjectLists = async (userId: string): Promise<void> => {
    const defaultLists = [
        { title: 'Incoming', id: 'incoming', color: 'bg-slate-500/10 border-slate-500/20', order: 0 },
        { title: 'Diseño', id: 'design', color: 'bg-slate-500/10 border-slate-500/20', order: 1 },
        { title: 'Desarrollo', id: 'development', color: 'bg-slate-500/10 border-slate-500/20', order: 2 },
        { title: 'Revisión', id: 'review', color: 'bg-slate-500/10 border-slate-500/20', order: 3 },
        { title: 'Finalizado', id: 'completed', color: 'bg-slate-500/10 border-slate-500/20', order: 4 },
    ];

    // Check if lists exist or create with generated IDs (since we can't force string IDs unless UUID-compatible)
    // UUIDs required in Supabase if 'id' is uuid. 
    // If 'id' in schema is uuid, we cannot use 'incoming'.
    // We must generate UUIDs or let Supabase do it.
    // So we just insert.
    const payload = defaultLists.map(l => {
        const { id, ...rest } = l; // Remove 'incoming' etc ID if we cannot use it
        return mapper.mapProjectList(userId, rest);
    });

    const { error } = await supabase.from('project_lists').insert(payload);
    if (error) throw error;
};

// ========== CATEGORY HELPERS ==========

export const getCategoryMovementCount = async (userId: string, categoryId: string): Promise<number> => {
    const { count, error } = await supabase
        .from('movements')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('category_id', categoryId);

    if (error) throw error;
    return count || 0;
};

export const reassignCategoryMovements = async (userId: string, oldCategoryId: string, newCategoryId: string): Promise<void> => {
    const { error } = await supabase
        .from('movements')
        .update({ category_id: newCategoryId, updated_at: new Date() })
        .eq('user_id', userId)
        .eq('category_id', oldCategoryId);

    if (error) throw error;
};

export const renameSubcategoryInMovements = async (userId: string, categoryId: string, oldName: string, newName: string): Promise<void> => {
    const { error } = await supabase
        .from('movements')
        .update({ subcategory: newName, updated_at: new Date() })
        .eq('user_id', userId)
        .eq('category_id', categoryId)
        .eq('subcategory', oldName);

    if (error) throw error;
};

export const reassignSubcategoryInMovements = renameSubcategoryInMovements;

export const removeSubcategoryFromMovements = async (userId: string, categoryId: string, subName: string): Promise<void> => {
    const { error } = await supabase
        .from('movements')
        .update({ subcategory: null as any, updated_at: new Date() }) // Casting null to match type
        .eq('user_id', userId)
        .eq('category_id', categoryId)
        .eq('subcategory', subName);

    if (error) throw error;
};

// ========== BOX HELPERS ==========

export const deleteBox = async (entityId: string, boxKey: string): Promise<void> => {
    // 1. Fetch
    const entity = await getEntity(entityId);
    if (!entity) return;

    // 2. Modify
    const boxes = { ...entity.boxes };
    delete boxes[boxKey];

    // 3. Update
    await updateEntity(entityId, { boxes });
};

export const updateBox = async (entityId: string, boxKey: string, updates: { order?: number; isDefault?: boolean; currency?: string }): Promise<void> => {
    // 1. Fetch
    const entity = await getEntity(entityId);
    if (!entity) return;

    const boxes = { ...entity.boxes };

    // If setting as default, unset all others
    if (updates.isDefault) {
        Object.keys(boxes).forEach(key => {
            boxes[key] = { ...boxes[key], isDefault: false };
        });
    }

    boxes[boxKey] = { ...boxes[boxKey], ...updates };

    // 3. Update
    await updateEntity(entityId, { boxes });
};


// ========== ENTITY CASCADE DELETE ==========

export const deleteEntityCascade = async (userId: string, entityId: string): Promise<void> => {
    const { error } = await supabase
        .from('entities')
        .delete()
        .eq('id', entityId); // Cascade handled by FKs

    if (error) throw error;
};

// ========== NOTIFICATIONS ==========

export const getNotifications = async (userId: string): Promise<Notification[]> => {
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw error;

    // Map to Notification interface
    return data.map((n: any) => ({
        id: n.id,
        userId: n.user_id,
        title: n.title,
        message: n.message,
        read: n.read,
        type: n.type,
        date: n.date,
        createdAt: n.created_at
    }));
};

export const createNotification = async (userId: string, data: Omit<Notification, 'id' | 'userId' | 'createdAt'>): Promise<string> => {
    const { data: inserted, error } = await supabase
        .from('notifications')
        .insert({
            user_id: userId,
            title: data.title,
            message: data.message,
            read: data.read || false,
            type: data.type || 'info',
            date: data.date,
            created_at: new Date()
        })
        .select('id')
        .single();

    if (error) throw error;
    return inserted.id;
};

export const markNotificationAsRead = async (id: string): Promise<void> => {
    const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);

    if (error) throw error;
};

export const markAllNotificationsAsRead = async (userId: string): Promise<void> => {
    const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId);

    if (error) throw error;
};

export const deleteNotification = async (id: string): Promise<void> => {
    const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

    if (error) throw error;
};

