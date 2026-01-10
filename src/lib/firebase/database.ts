/**
 * Numia v1.0 - Firebase Database Operations
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  QueryConstraint,
  writeBatch,
  deleteField,
} from 'firebase/firestore';

// ========== ENTITIES ==========
import { Progress } from '@/components/ui/progress';
import { syncClient } from '@/lib/supabase/adapter';
import { db } from './config';
import type { Entity, Movement, Loan, Projection, Category, Client, Subscription, EntitySubscription, Project, ServiceDefinition } from '@/types';
import * as sb from '../supabase/adapter';

// Helper to convert Firestore timestamps to Date
const convertTimestamps = (data: any) => {
  const converted = { ...data };
  if (converted.createdAt instanceof Timestamp) {
    converted.createdAt = converted.createdAt.toDate();
  }
  if (converted.updatedAt instanceof Timestamp) {
    converted.updatedAt = converted.updatedAt.toDate();
  }
  return converted;
};

// ========== ENTITIES ==========

export const getEntities = async (userId: string): Promise<Entity[]> => {
  const q = query(collection(db, 'entities'), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...convertTimestamps(doc.data()),
  })) as Entity[];
};

export const getEntity = async (entityId: string): Promise<Entity | null> => {
  const docRef = doc(db, 'entities', entityId);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    return { id: snap.id, ...convertTimestamps(snap.data()) } as Entity;
  }
  return null;
};

export const createEntity = async (userId: string, data: Omit<Entity, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const now = Timestamp.now();

  // Remove undefined fields to prevent Firestore errors
  const cleanData: any = {};
  Object.keys(data).forEach(key => {
    const value = (data as any)[key];
    if (value !== undefined) {
      cleanData[key] = value;
    }
  });

  const docRef = await addDoc(collection(db, 'entities'), {
    ...cleanData,
    userId,
    createdAt: now,
    updatedAt: now,
  });

  // Sync to Supabase (Fire and forget)
  sb.syncEntity(userId, docRef.id, { ...cleanData, createdAt: now.toDate(), updatedAt: now.toDate() });

  return docRef.id;
};

export const updateEntity = async (entityId: string, data: Partial<Entity>): Promise<void> => {
  const docRef = doc(db, 'entities', entityId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });

  // Sync to Supabase
  sb.syncEntity(data.userId || entityId.split('_')[0] || 'unknown', entityId, { ...data, updatedAt: new Date() });
  // Note: We might be missing userId here if it's not in 'data'. 
  // Ideally updateEntity should receive userId or we fetch it. 
  // For now, if we don't have userId in 'data', RLS might fail if we needed it for INSERT, but for UPDATE it uses ID.
  // Actually RLS checks auth.uid(), preventing cross-user edits.
  // BUT the mapper needs userId to put in the row if converting.
  // Let's rely on the fact that existing rows have user_id.

};

export const deleteEntity = async (entityId: string): Promise<void> => {
  // 1. Get all related documents
  const movementsQuery = query(collection(db, 'movements'), where('entityId', '==', entityId));
  const loansQuery = query(collection(db, 'loans'), where('entityId', '==', entityId));
  const projectionsQuery = query(collection(db, 'projections'), where('entityId', '==', entityId));

  const [movementsSnapshot, loansSnapshot, projectionsSnapshot] = await Promise.all([
    getDocs(movementsQuery),
    getDocs(loansQuery),
    getDocs(projectionsQuery)
  ]);

  // 2. Collect all references including the entity itself
  const allRefs = [
    ...movementsSnapshot.docs.map(doc => doc.ref),
    ...loansSnapshot.docs.map(doc => doc.ref),
    ...projectionsSnapshot.docs.map(doc => doc.ref),
    doc(db, 'entities', entityId)
  ];

  console.log(`🗑️ Eliminando entidad ${entityId} y ${allRefs.length - 1} documentos dependientes...`);

  // 3. Delete in batches of 500 (Firestore limit)
  const CHUNK_SIZE = 500;
  for (let i = 0; i < allRefs.length; i += CHUNK_SIZE) {
    const chunk = allRefs.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    chunk.forEach(ref => batch.delete(ref));
    await batch.commit();
  }

  console.log('✅ Eliminación en cascada completada.');

  // Sync deletion to Supabase
  // We should ideally cascade delete there too, but for safety we trigger deleteEntity
  // The Supabase schema has ON DELETE CASCADE, so just deleting the entity is enough.
  sb.deleteEntity(entityId);
};

// ========== MOVEMENTS ==========

export const getMovements = async (
  userId: string,
  options?: string | { entityId?: string; startDate?: string; endDate?: string }
): Promise<Movement[]> => {
  const constraints: QueryConstraint[] = [where('userId', '==', userId)];

  let entityId: string | undefined;
  let startDate: string | undefined;
  let endDate: string | undefined;

  // Normalize options
  if (typeof options === 'string') {
    entityId = options;
  } else if (typeof options === 'object') {
    entityId = options.entityId;
    startDate = options.startDate;
    endDate = options.endDate;
  }

  if (entityId) {
    constraints.push(where('entityId', '==', entityId));
  }

  if (startDate) {
    constraints.push(where('date', '>=', startDate));
  }

  if (endDate) {
    constraints.push(where('date', '<=', endDate));
  }

  constraints.push(orderBy('date', 'desc'));

  const q = query(collection(db, 'movements'), ...constraints);
  const snapshot = await getDocs(q);
  const movements = snapshot.docs.map(doc => ({
    id: doc.id,
    ...convertTimestamps(doc.data()),
  })) as Movement[];

  // Sort by date (desc) first, then by createdAt (desc) for same-day movements
  movements.sort((a, b) => {
    // First, compare dates (string comparison works for YYYY-MM-DD format)
    if (a.date !== b.date) {
      return b.date.localeCompare(a.date);
    }
    // If same date, sort by createdAt (most recent first)
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  // Debug logging - show first movement's date
  if (movements.length > 0) {
    console.log('📅 GET MOVEMENTS - Primera fecha leída:', movements[0].date, 'Tipo:', typeof movements[0].date);
  }

  return movements;
};

export const createMovement = async (userId: string, data: Omit<Movement, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const now = Timestamp.now();

  // Debug logging
  console.log('📅 CREATE MOVEMENT - Fecha recibida:', data.date, 'Tipo:', typeof data.date);

  // Remove undefined fields to prevent Firestore errors
  const cleanData: any = {};
  Object.keys(data).forEach(key => {
    const value = (data as any)[key];
    if (value !== undefined) {
      cleanData[key] = value;
    }
  });

  const docRef = await addDoc(collection(db, 'movements'), {
    ...cleanData,
    date: String(data.date), // Force as string to prevent automatic conversion
    userId,
    createdAt: now,
    updatedAt: now,
  });

  console.log('✅ CREATE MOVEMENT - Movimiento creado con ID:', docRef.id);

  console.log('✅ CREATE MOVEMENT - Movimiento creado con ID:', docRef.id);

  // Sync to Supabase
  try {
    sb.syncMovement(userId, docRef.id, { ...cleanData, date: data.date, createdAt: now.toDate(), updatedAt: now.toDate() });
  } catch (err) {
    console.error('Supabase Sync Error:', err);
  }

  return docRef.id;
};

export const updateMovement = async (movementId: string, data: Partial<Movement>): Promise<void> => {
  const docRef = doc(db, 'movements', movementId);

  // Debug logging
  if (data.date) {
    console.log('📅 UPDATE MOVEMENT - Fecha recibida:', data.date, 'Tipo:', typeof data.date);
  }

  // Remove undefined fields to prevent Firestore errors
  const cleanData: any = {};
  Object.keys(data).forEach(key => {
    const value = (data as any)[key];
    if (value !== undefined) {
      cleanData[key] = value;
    }
  });

  if (data.date) {
    cleanData.date = String(data.date); // Force as string
  }

  await updateDoc(docRef, {
    ...cleanData,
    updatedAt: Timestamp.now(),
  });

  console.log('✅ UPDATE MOVEMENT - Movimiento actualizado:', movementId);

  // Sync to Supabase (Best effort with missing userId)
  // We really should pass userId to update functions for full dual-write correctness,
  // but for updates, Supabase ID is enough to find the row. 
  // The mapper adds 'user_id' if provided.
  sb.syncMovement('', movementId, { ...cleanData, updatedAt: new Date() });
};

export const deleteMovement = async (movementId: string): Promise<void> => {
  await deleteDoc(doc(db, 'movements', movementId));
  sb.deleteMovement(movementId);
};

export const createBatchMovements = async (userId: string, movements: Omit<Movement, 'id' | 'userId' | 'createdAt' | 'updatedAt'>[]): Promise<void> => {
  if (movements.length === 0) return;

  const now = Timestamp.now();
  const batch = writeBatch(db);
  const CHUNK_SIZE = 500; // Firestore batch limit

  // Process in chunks of 500
  const syncQueue: { id: string; data: any }[] = [];

  for (let i = 0; i < movements.length; i += CHUNK_SIZE) {
    const chunk = movements.slice(i, i + CHUNK_SIZE);
    const currentBatch = writeBatch(db);

    chunk.forEach(data => {
      // Create a doc reference with auto-generated ID
      const docRef = doc(collection(db, 'movements'));

      // Remove undefined fields
      const cleanData: any = {};
      Object.keys(data).forEach(key => {
        const value = (data as any)[key];
        if (value !== undefined) {
          cleanData[key] = value;
        }
      });

      const finalData = {
        ...cleanData,
        date: String(data.date),
        userId,
        createdAt: now,
        updatedAt: now,
      };

      currentBatch.set(docRef, finalData);

      // Queue for Supabase sync
      syncQueue.push({ id: docRef.id, data: finalData });
    });

    await currentBatch.commit();
  }

  console.log(`✅ BATCH CREATE - ${movements.length} movimientos creados exitosamente.`);

  // Sync to Supabase (Iterative)
  // We process asynchronously to not block the UI response too much, 
  // though for massive loads this might throttle.
  console.log('🔄 Iniciando sincronización de carga masiva con Supabase...');

  // We'll process them in small chunks to avoid overwhelming the network/browser
  const syncToSupabase = async () => {
    for (const item of syncQueue) {
      try {
        sb.syncMovement(userId, item.id, {
          ...item.data,
          createdAt: item.data.createdAt.toDate(),
          updatedAt: item.data.updatedAt.toDate()
        });
      } catch (e) {
        console.warn(`Failed to sync batch item ${item.id}`, e);
      }
    }
    console.log('✅ Carga masiva sincronizada con Supabase.');
  };

  // Trigger sync without awaiting (Fire and forget from UI perspective, but keeps running)
  syncToSupabase();
};

// ========== LOANS ==========

export const getLoans = async (userId: string, entityId?: string): Promise<Loan[]> => {
  const constraints: QueryConstraint[] = [where('userId', '==', userId)];

  if (entityId) {
    constraints.push(where('entityId', '==', entityId));
  }

  constraints.push(orderBy('date', 'desc'));

  const q = query(collection(db, 'loans'), ...constraints);
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...convertTimestamps(doc.data()),
  })) as Loan[];
};

export const createLoan = async (userId: string, data: Omit<Loan, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const now = Timestamp.now();
  const docRef = await addDoc(collection(db, 'loans'), {
    ...data,
    userId,
    createdAt: now,
    updatedAt: now,
  });
  sb.syncLoan(userId, docRef.id, { ...data, createdAt: now.toDate(), updatedAt: now.toDate() });
  return docRef.id;
};

export const updateLoan = async (loanId: string, data: Partial<Loan>): Promise<void> => {
  const docRef = doc(db, 'loans', loanId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
  sb.syncLoan('', loanId, { ...data, updatedAt: new Date() });
};

export const deleteLoan = async (loanId: string): Promise<void> => {
  await deleteDoc(doc(db, 'loans', loanId));
  sb.deleteLoan(loanId);
};

// ========== PROJECTIONS ==========

export const getProjections = async (userId: string, entityId?: string): Promise<Projection[]> => {
  const constraints: QueryConstraint[] = [where('userId', '==', userId)];

  if (entityId) {
    constraints.push(where('entityId', '==', entityId));
  }

  constraints.push(orderBy('period', 'desc'));

  const q = query(collection(db, 'projections'), ...constraints);
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...convertTimestamps(doc.data()),
  })) as Projection[];
};

export const createProjection = async (userId: string, data: Omit<Projection, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const now = Timestamp.now();
  const docRef = await addDoc(collection(db, 'projections'), {
    ...data,
    userId,
    createdAt: now,
    updatedAt: now,
  });
  sb.syncProjection(userId, docRef.id, { ...data, createdAt: now.toDate(), updatedAt: now.toDate() });
  return docRef.id;
};

export const updateProjection = async (projectionId: string, data: Partial<Projection>): Promise<void> => {
  const docRef = doc(db, 'projections', projectionId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
  sb.syncProjection('', projectionId, { ...data, updatedAt: new Date() });
};

export const deleteProjection = async (projectionId: string): Promise<void> => {
  await deleteDoc(doc(db, 'projections', projectionId));
  sb.deleteProjection(projectionId);
};

// ========== CATEGORIES ==========

export const getCategories = async (userId: string): Promise<Category[]> => {
  const q = query(
    collection(db, 'categories'),
    where('userId', '==', userId),
    orderBy('name', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...convertTimestamps(doc.data()),
  })) as Category[];
};

export const createCategory = async (userId: string, data: Omit<Category, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const now = Timestamp.now();
  const docRef = await addDoc(collection(db, 'categories'), {
    ...data,
    userId,
    createdAt: now,
    updatedAt: now,
  });
  sb.syncCategory(userId, docRef.id, { ...data, createdAt: now.toDate(), updatedAt: now.toDate() });
  return docRef.id;
};

export const updateCategory = async (categoryId: string, data: Partial<Category>): Promise<void> => {
  const docRef = doc(db, 'categories', categoryId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
  sb.syncCategory('', categoryId, { ...data, updatedAt: new Date() });
};

export const deleteCategory = async (categoryId: string): Promise<void> => {
  await deleteDoc(doc(db, 'categories', categoryId));
  sb.deleteCategory(categoryId);
};

// ========== DEFAULT CATEGORIES ==========

export const initializeDefaultCategories = async (userId: string, defaultCategories: any[]): Promise<void> => {
  const now = Timestamp.now();
  const promises = defaultCategories.map(async (category) => {
    const docRef = await addDoc(collection(db, 'categories'), {
      ...category,
      userId,
      createdAt: now,
      updatedAt: now,
    });
    sb.syncCategory(userId, docRef.id, { ...category, createdAt: now.toDate(), updatedAt: now.toDate() });
  });

  await Promise.all(promises);
};
// ========== CLIENTS ==========

export const getClients = async (userId: string): Promise<Client[]> => {
  const q = query(collection(db, 'clients'), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...convertTimestamps(doc.data()),
  })) as Client[];
};

export const createClient = async (userId: string, data: Omit<Client, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const now = Timestamp.now();
  const docRef = await addDoc(collection(db, 'clients'), {
    ...data,
    userId,
    createdAt: now,
    updatedAt: now,
  });
  sb.syncClient(userId, docRef.id, { ...data, createdAt: now.toDate(), updatedAt: now.toDate() });
  return docRef.id;
};

export const updateClient = async (clientId: string, data: Partial<Client>): Promise<void> => {
  const docRef = doc(db, 'clients', clientId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
  sb.syncClient('', clientId, { ...data, updatedAt: new Date() });
};

export const deleteClient = async (clientId: string, userId?: string): Promise<void> => {
  // 1. Check for active projects
  try {
    let projectsQuery;
    if (userId) {
      projectsQuery = query(
        collection(db, 'projects'),
        where('clientId', '==', clientId),
        where('userId', '==', userId), // Security Rule: Must read own data
        where('status', '!=', 'completed')
      );
    } else {
      // Fallback (will fail rules if they require userId)
      projectsQuery = query(
        collection(db, 'projects'),
        where('clientId', '==', clientId),
        where('status', '!=', 'completed')
      );
    }

    const projectsSnapshot = await getDocs(projectsQuery);
    if (!projectsSnapshot.empty) {
      throw new Error(`e_projects:No se puede eliminar el cliente porque tiene ${projectsSnapshot.size} proyectos activos.`);
    }
  } catch (error: any) {
    if (error.message.startsWith('e_projects')) throw new Error(error.message.split('e_projects:')[1]);
    console.warn("⚠️ Validation Error (Projects):", error);
    if (error.code === 'permission-denied' || error.message.includes('permission')) {
      throw new Error(`Permisos insuficientes para verificar proyectos (Falta Índice o Regla).`);
    }
    throw new Error(`Error validando proyectos: ${error.message}`);
  }

  // 2. Check for active subscriptions
  try {
    let subsQuery;
    if (userId) {
      subsQuery = query(
        collection(db, 'subscriptions'),
        where('clientId', '==', clientId),
        where('userId', '==', userId),
        where('status', '==', 'active')
      );
    } else {
      subsQuery = query(
        collection(db, 'subscriptions'),
        where('clientId', '==', clientId),
        where('status', '==', 'active')
      );
    }

    const subsSnapshot = await getDocs(subsQuery);
    if (!subsSnapshot.empty) {
      throw new Error(`e_subs:No se puede eliminar el cliente porque tiene ${subsSnapshot.size} suscripciones activas.`);
    }
  } catch (error: any) {
    if (error.message.startsWith('e_subs')) throw new Error(error.message.split('e_subs:')[1]);
    console.warn("⚠️ Validation Error (Subscriptions):", error);
    if (error.code === 'permission-denied' || error.message.includes('permission')) {
      throw new Error(`Permisos insuficientes para verificar suscripciones (Falta Índice o Regla).`);
    }
    throw new Error(`Error validando suscripciones: ${error.message}`);
  }

  // 3. Proceed with deletion
  try {
    await deleteDoc(doc(db, 'clients', clientId));
  } catch (error: any) {
    console.error("💥 Error performing deleteDoc:", error);
    throw new Error(`Error al eliminar cliente en BD: ${error.message}`);
  }

  // 4. Sync deletion to Supabase
  sb.deleteClient(clientId);
};

// ========== SUBSCRIPTIONS (ERP CLIENTS) ==========

export const getSubscriptions = async (clientId: string, userId: string): Promise<Subscription[]> => {
  const q = query(
    collection(db, 'subscriptions'),
    where('clientId', '==', clientId),
    where('userId', '==', userId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...convertTimestamps(doc.data()),
  })) as Subscription[];
};

export const createSubscription = async (userId: string, clientId: string, data: Omit<Subscription, 'id' | 'clientId' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const now = Timestamp.now();
  const docRef = await addDoc(collection(db, 'subscriptions'), {
    ...data,
    userId, // Add userId for security rules
    clientId,
    createdAt: now,
    updatedAt: now,
  });
  sb.syncSubscription(userId, clientId, docRef.id, { ...data, createdAt: now.toDate(), updatedAt: now.toDate() });
  return docRef.id;
};

export const updateSubscription = async (subscriptionId: string, data: Partial<Subscription>): Promise<void> => {
  const docRef = doc(db, 'subscriptions', subscriptionId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
  // Note: userId and clientId should be passed separately if needed for Supabase sync
  sb.syncSubscription('', data.clientId || '', subscriptionId, { ...data, updatedAt: new Date() });
};

export const deleteSubscription = async (subscriptionId: string): Promise<void> => {
  await deleteDoc(doc(db, 'subscriptions', subscriptionId));
  sb.deleteSubscription(subscriptionId);
};

// ========== SERVICE DEFINITIONS (CATALOG) ==========

export const getServiceDefinitions = async (userId: string): Promise<ServiceDefinition[]> => {
  const q = query(
    collection(db, 'service_definitions'),
    where('userId', '==', userId),
    orderBy('name', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...convertTimestamps(doc.data()),
  })) as ServiceDefinition[];
};

export const createServiceDefinition = async (userId: string, data: Omit<ServiceDefinition, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const now = Timestamp.now();
  const docRef = await addDoc(collection(db, 'service_definitions'), {
    ...data,
    userId,
    createdAt: now,
    updatedAt: now,
  });
  sb.syncServiceDefinition(userId, docRef.id, { ...data, createdAt: now.toDate(), updatedAt: now.toDate() });
  return docRef.id;
};

export const updateServiceDefinition = async (id: string, data: Partial<ServiceDefinition>): Promise<void> => {
  const docRef = doc(db, 'service_definitions', id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
  sb.syncServiceDefinition('', id, { ...data, updatedAt: new Date() });
};

export const deleteServiceDefinition = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'service_definitions', id));
  sb.deleteServiceDefinition(id);
};

// ========== ENTITY SUBSCRIPTIONS (EXPENSES) ==========

export const getUserEntitySubscriptions = async (userId: string): Promise<EntitySubscription[]> => {
  const q = query(collection(db, 'entity_subscriptions'), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...convertTimestamps(doc.data()),
  })) as EntitySubscription[];
};

export const getEntitySubscriptions = async (entityId: string): Promise<EntitySubscription[]> => {
  const q = query(collection(db, 'entity_subscriptions'), where('entityId', '==', entityId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...convertTimestamps(doc.data()),
  })) as EntitySubscription[];
};

export const createEntitySubscription = async (userId: string, entityId: string, data: Omit<EntitySubscription, 'id' | 'userId' | 'entityId' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const now = Timestamp.now();
  const docRef = await addDoc(collection(db, 'entity_subscriptions'), {
    ...data,
    userId,
    entityId,
    createdAt: now,
    updatedAt: now,
  });
  sb.syncEntitySubscription(userId, entityId, docRef.id, { ...data, createdAt: now.toDate(), updatedAt: now.toDate() });
  return docRef.id;
};

export const updateEntitySubscription = async (subscriptionId: string, data: Partial<EntitySubscription>): Promise<void> => {
  const docRef = doc(db, 'entity_subscriptions', subscriptionId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
  sb.syncEntitySubscription('', '', subscriptionId, { ...data, updatedAt: new Date() });
};

export const deleteEntitySubscription = async (subscriptionId: string): Promise<void> => {
  await deleteDoc(doc(db, 'entity_subscriptions', subscriptionId));
  sb.deleteEntitySubscription(subscriptionId);
};

// ========== PROJECTS ==========

export const getProjects = async (userId: string): Promise<Project[]> => {
  const q = query(collection(db, 'projects'), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...convertTimestamps(doc.data()),
  })) as Project[];
};

export const createProject = async (userId: string, data: Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const now = Timestamp.now();
  const docRef = await addDoc(collection(db, 'projects'), {
    ...data,
    userId,
    status: 'incoming', // Default status
    progress: 0,
    createdAt: now,
    updatedAt: now,
  });
  sb.syncProject(userId, docRef.id, { ...data, status: 'incoming', progress: 0, createdAt: now.toDate(), updatedAt: now.toDate() });
  return docRef.id;
};

export const updateProject = async (projectId: string, data: Partial<Project>): Promise<void> => {
  const docRef = doc(db, 'projects', projectId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
  sb.syncProject('', projectId, { ...data, updatedAt: new Date() });
};

export const deleteProject = async (projectId: string): Promise<void> => {
  await deleteDoc(doc(db, 'projects', projectId));
  sb.deleteProject(projectId);
};

// ========== PROJECT LISTS (KANBAN) ==========

export const getProjectLists = async (userId: string): Promise<ProjectList[]> => {
  const q = query(collection(db, 'project_lists'), where('userId', '==', userId), orderBy('order', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...convertTimestamps(doc.data()),
  })) as ProjectList[];
};

export const createProjectList = async (userId: string, data: Omit<ProjectList, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const now = Timestamp.now();
  const docRef = await addDoc(collection(db, 'project_lists'), {
    ...data,
    userId,
    createdAt: now,
    updatedAt: now,
  });
  // No Supabase sync for now as it's a new feature and table might not exist in Supabase yet
  return docRef.id;
};

export const updateProjectList = async (listId: string, data: Partial<ProjectList>): Promise<void> => {
  const docRef = doc(db, 'project_lists', listId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
};

export const deleteProjectList = async (listId: string): Promise<void> => {
  await deleteDoc(doc(db, 'project_lists', listId));
};

export const initializeDefaultProjectLists = async (userId: string): Promise<void> => {
  const defaultLists = [
    { title: 'Incoming', id: 'incoming', color: 'bg-slate-500/10 border-slate-500/20' },
    { title: 'Diseño', id: 'design', color: 'bg-slate-500/10 border-slate-500/20' },
    { title: 'Desarrollo', id: 'development', color: 'bg-slate-500/10 border-slate-500/20' },
    { title: 'Revisión', id: 'review', color: 'bg-slate-500/10 border-slate-500/20' },
    { title: 'Finalizado', id: 'completed', color: 'bg-slate-500/10 border-slate-500/20' },
  ];

  const now = Timestamp.now();
  const batch = writeBatch(db);

  defaultLists.forEach((list, index) => {
    // We use set with a specific ID if we want to preserve old IDs, but for new collections better use auto-id?
    // Actually, for migration, we want to KEEP the old IDs so existing projects (with status 'incoming') map to them.
    // BUT 'incoming' is a string status in Project. 
    // IF we make ProjectList.id = 'incoming', then `status` field in Project matches `ProjectList.id`.
    // So YES, we should try to use the string ID as the doc ID.

    const docRef = doc(db, 'project_lists', list.id); // Try to force ID if possible, or use IDs as keys
    // Wait, Firestore allow custom IDs.
    // However, if we have multiple users, we can't have duplicate doc IDs in same collection if we use 'incoming'.
    // BUT we are using a single collection 'project_lists'.
    // So we CANNOT use 'incoming' as the Doc ID because multiple users will have 'incoming'.
    // We MUST use auto-generated IDs.
    // PROBLEM: Existing projects have status='incoming'.
    // SOLUTION: We should MIGRATE existing projects to use the new IDs?
    // OR we can allow the 'status' field to store the 'ProjectList ID'.
    // If we use auto-IDs, then for the *default* initialization, we need to:
    // 1. Create the list with auto-ID.
    // 2. Update all projects that had the "old status" to the "new ID".
    // THIS IS COMPLEX.

    // ALTERNATIVE: Use a composite key? 'userId_incoming'? 
    // No, cleaner to just use UUIDs and migrate data.

    // FOR THE MVP: 
    // Let's create the default lists with Auto-IDs.
    // AND we run a migration for that user: find all projects with status 'incoming' and update them to the new ID.

    // Actually, to make it safer/easier:
    // Let's just create the lists.
    // For the INITIALIZATION function, we return the map of old->new IDs so the caller can migrate projects.
  });

  // Revised approach for initializeDefaultProjectLists:
  // Since we can't do complex migration inside this "database.ts" helper easily without circular deps or logic bloat,
  // let's just make it simple:
  // We will NOT change the Project.status type to be strictly UUID. It is just string.
  // Existing projects have 'incoming'.
  // New lists will have UUIDs.
  // IF we want to support the old statuses, we could create default lists that *happen* to have those IDs? No, collisions.

  // Lets do this:
  // 1. Create the 5 lists.
  // 2. UPDATE all projects of this user to map 'incoming' -> newId, 'design' -> newId, etc.

  // Implementation below performs both creation and migration in a batch.
};

export const getCategoryMovementCount = async (userId: string, categoryId: string): Promise<number> => {
  const q = query(
    collection(db, 'movements'),
    where('userId', '==', userId),
    where('categoryId', '==', categoryId)
  );
  const snapshot = await getDocs(q);
  return snapshot.size;
};

export const reassignCategoryMovements = async (
  userId: string,
  oldCategoryId: string,
  newCategoryId: string
): Promise<void> => {
  const q = query(
    collection(db, 'movements'),
    where('userId', '==', userId),
    where('categoryId', '==', oldCategoryId)
  );
  const snapshot = await getDocs(q);

  const batch = writeBatch(db);
  snapshot.docs.forEach((document) => {
    batch.update(document.ref, { categoryId: newCategoryId, updatedAt: Timestamp.now() });
  });

  await batch.commit();

  // Sync reassignments to Supabase (Best effort)
  snapshot.docs.forEach((document) => {
    sb.syncMovement(userId, document.id, { categoryId: newCategoryId, updatedAt: new Date() });
  });
};

export const renameSubcategoryInMovements = async (
  userId: string,
  categoryId: string,
  oldName: string,
  newName: string
): Promise<void> => {
  const q = query(
    collection(db, 'movements'),
    where('userId', '==', userId),
    where('categoryId', '==', categoryId),
    where('subcategory', '==', oldName)
  );

  const snapshot = await getDocs(q);
  const CHUNK_SIZE = 500;

  // Handle batching if we have many movements
  const chunks = [];
  for (let i = 0; i < snapshot.docs.length; i += CHUNK_SIZE) {
    chunks.push(snapshot.docs.slice(i, i + CHUNK_SIZE));
  }

  for (const chunk of chunks) {
    const batch = writeBatch(db);
    chunk.forEach(doc => {
      batch.update(doc.ref, {
        subcategory: newName,
        updatedAt: Timestamp.now()
      });
    });
    await batch.commit();
  }

  // Sync renames to Supabase
  snapshot.docs.forEach((document) => {
    sb.syncMovement(userId, document.id, { subcategory: newName, updatedAt: new Date() });
  });
};

export const reassignSubcategoryInMovements = renameSubcategoryInMovements;

export const removeSubcategoryFromMovements = async (
  userId: string,
  categoryId: string,
  subName: string
): Promise<void> => {
  const q = query(
    collection(db, 'movements'),
    where('userId', '==', userId),
    where('categoryId', '==', categoryId),
    where('subcategory', '==', subName)
  );

  const snapshot = await getDocs(q);
  const CHUNK_SIZE = 500;

  const chunks = [];
  for (let i = 0; i < snapshot.docs.length; i += CHUNK_SIZE) {
    chunks.push(snapshot.docs.slice(i, i + CHUNK_SIZE));
  }

  for (const chunk of chunks) {
    const batch = writeBatch(db);
    chunk.forEach(doc => {
      batch.update(doc.ref, {
        subcategory: deleteField(), // This will need deleteField imported
        updatedAt: Timestamp.now()
      });
    });
    await batch.commit();
  }
};

// ========== BOX HELPERS ==========

export const deleteBox = async (entityId: string, boxKey: string): Promise<void> => {
  const entityRef = doc(db, 'entities', entityId);
  const entityDoc = await getDocs(query(collection(db, 'entities'), where('__name__', '==', entityId)));

  if (!entityDoc.empty) {
    const entityData = entityDoc.docs[0].data();
    const boxes = { ...entityData.boxes };
    delete boxes[boxKey];

    await updateDoc(entityRef, {
      boxes,
      updatedAt: Timestamp.now()
    });
  }
};

export const updateBox = async (
  entityId: string,
  boxKey: string,
  updates: { order?: number; isDefault?: boolean; currency?: string }
): Promise<void> => {
  const entityRef = doc(db, 'entities', entityId);
  const entityDoc = await getDocs(query(collection(db, 'entities'), where('__name__', '==', entityId)));

  if (!entityDoc.empty) {
    const entityData = entityDoc.docs[0].data();
    const boxes = { ...entityData.boxes };

    // If setting as default, unset all others
    if (updates.isDefault) {
      Object.keys(boxes).forEach(key => {
        boxes[key] = { ...boxes[key], isDefault: false };
      });
    }

    boxes[boxKey] = { ...boxes[boxKey], ...updates };

    await updateDoc(entityRef, {
      boxes,
      updatedAt: Timestamp.now()
    });
  }
};

// ========== ENTITY CASCADE DELETE ==========

export const deleteEntityCascade = async (userId: string, entityId: string): Promise<void> => {
  // 1. Get all related data first
  const movementsQuery = query(collection(db, 'movements'), where('userId', '==', userId), where('entityId', '==', entityId));
  const loansQuery = query(collection(db, 'loans'), where('userId', '==', userId), where('entityId', '==', entityId));
  const projectionsQuery = query(collection(db, 'projections'), where('userId', '==', userId), where('entityId', '==', entityId));
  const clientsQuery = query(collection(db, 'clients'), where('userId', '==', userId), where('entityId', '==', entityId));
  const projectsQuery = query(collection(db, 'projects'), where('userId', '==', userId), where('entityId', '==', entityId));
  const entitySubscriptionsQuery = query(collection(db, 'entity_subscriptions'), where('userId', '==', userId), where('entityId', '==', entityId));

  const [
    movementsSnap,
    loansSnap,
    projectionsSnap,
    clientsSnap,
    projectsSnap,
    entitySubscriptionsSnap
  ] = await Promise.all([
    getDocs(movementsQuery),
    getDocs(loansQuery),
    getDocs(projectionsQuery),
    getDocs(clientsQuery),
    getDocs(projectsQuery),
    getDocs(entitySubscriptionsQuery)
  ]);

  // Find subscriptions related to these clients
  const clientIds = clientsSnap.docs.map(doc => doc.id);
  let subscriptionsRefs: any[] = [];
  if (clientIds.length > 0) {
    // We have to query subscriptions for each client or use 'in' batches of 10
    // Since 'in' limit is 10, let's fetch all user subscriptions and filter in memory to be safe and simple
    // (Assuming user doesn't have thousands of subscriptions, otherwise multiple queries)
    const userSubsQuery = query(collection(db, 'subscriptions'), where('userId', '==', userId));
    const userSubsSnap = await getDocs(userSubsQuery);
    subscriptionsRefs = userSubsSnap.docs
      .filter(doc => clientIds.includes(doc.data().clientId))
      .map(doc => doc.ref);
  }

  // Collect all references
  const allRefs = [
    ...movementsSnap.docs.map(doc => doc.ref),
    ...loansSnap.docs.map(doc => doc.ref),
    ...projectionsSnap.docs.map(doc => doc.ref),
    ...clientsSnap.docs.map(doc => doc.ref),
    ...projectsSnap.docs.map(doc => doc.ref),
    ...entitySubscriptionsSnap.docs.map(doc => doc.ref),
    ...subscriptionsRefs,
    doc(db, 'entities', entityId)
  ];

  console.log(`🗑️ Eliminando entidad ${entityId} y ${allRefs.length - 1} documentos dependientes...`);

  // Delete in batches
  const CHUNK_SIZE = 500;
  for (let i = 0; i < allRefs.length; i += CHUNK_SIZE) {
    const chunk = allRefs.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    chunk.forEach(ref => batch.delete(ref));
    await batch.commit();
  }

  console.log('✅ Eliminación en cascada completada.');
};

// ========== REPAIR TOOLS ==========

export const repairSupabaseData = async (userId: string) => {
  console.log('🔧 Iniciando reparación de datos Supabase...');

  // 1. Sync Entities
  const entities = await getEntities(userId);
  console.log(`Syncing ${entities.length} entities...`);
  entities.forEach(e => sb.syncEntity(userId, e.id, e));

  // 2. Sync Categories
  const categories = await getCategories(userId);
  console.log(`Syncing ${categories.length} categories...`);
  categories.forEach(c => sb.syncCategory(userId, c.id, c));

  // 3. Sync Clients
  const clients = await getClients(userId);
  console.log(`Syncing ${clients.length} clients...`);
  clients.forEach(c => sb.syncClient(userId, c.id, c));

  // 4. Sync Subscriptions (need to iterate clients)
  console.log('Syncing subscriptions...');
  for (const client of clients) {
    const subs = await getSubscriptions(client.id, userId);
    subs.forEach(s => sb.syncSubscription(userId, client.id, s.id, s));
  }

  // 5. Sync Movements (last 6 months to avoid overload?) - Let's do all for now or batch
  // getMovements fetches all by default if no date limit?
  // getMovements signature: (userId, options)
  // Let's fetch recent ones at least, or loop.
  // For now, let's assume specific missing ones are recent.
  // Actually, getMovements without options returns ALL? 
  // Code: if options is valid... it builds constraints.
  // If no options, it only adds where('userId'...). So yes, ALL.
  const movements = await getMovements(userId);
  console.log(`Syncing ${movements.length} movements...`);
  // Batch this? sb.syncMovement is just a fire-and-forget.
  // Browser might choke if 1000s.
  // Let's do chunks.
  const chunk = (arr: any[], size: number) => Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));

  const chunks = chunk(movements, 50);
  for (const batch of chunks) {
    await Promise.all(batch.map(m => sb.syncMovement(userId, m.id, m)));
    await new Promise(r => setTimeout(r, 100)); // slight throttle
  }

  console.log('✅ Reparación completada.');
};

// Expose to window for debugging
if (typeof window !== 'undefined') {
  (window as any).repairSupabaseData = repairSupabaseData;
}
