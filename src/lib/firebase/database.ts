/**
 * Numia v1.0 - Firebase Database Operations
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
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
import { db } from './config';
import type { Entity, Movement, Loan, Projection, Category, Client, Subscription, EntitySubscription, Project, ServiceDefinition } from '@/types';

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
  return docRef.id;
};

export const updateEntity = async (entityId: string, data: Partial<Entity>): Promise<void> => {
  const docRef = doc(db, 'entities', entityId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
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
};

// ========== MOVEMENTS ==========

export const getMovements = async (userId: string, entityId?: string): Promise<Movement[]> => {
  const constraints: QueryConstraint[] = [where('userId', '==', userId)];

  if (entityId) {
    constraints.push(where('entityId', '==', entityId));
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
};

export const deleteMovement = async (movementId: string): Promise<void> => {
  await deleteDoc(doc(db, 'movements', movementId));
};

export const createBatchMovements = async (userId: string, movements: Omit<Movement, 'id' | 'userId' | 'createdAt' | 'updatedAt'>[]): Promise<void> => {
  if (movements.length === 0) return;

  const now = Timestamp.now();
  const batch = writeBatch(db);
  const CHUNK_SIZE = 500; // Firestore batch limit

  // Process in chunks of 500
  for (let i = 0; i < movements.length; i += CHUNK_SIZE) {
    const chunk = movements.slice(i, i + CHUNK_SIZE);

    // Create a new batch for each chunk if we have more than 500 (though typically we might just do one big batch call logic, but to be safe for really large files)
    // Actually, writeBatch is one instance, we commit it. If > 500, we need multiple commits.
    const currentBatch = writeBatch(db);

    chunk.forEach(data => {
      const docRef = doc(collection(db, 'movements'));

      // Remove undefined fields
      const cleanData: any = {};
      Object.keys(data).forEach(key => {
        const value = (data as any)[key];
        if (value !== undefined) {
          cleanData[key] = value;
        }
      });

      currentBatch.set(docRef, {
        ...cleanData,
        date: String(data.date),
        userId,
        createdAt: now,
        updatedAt: now,
      });
    });

    await currentBatch.commit();
  }

  console.log(`✅ BATCH CREATE - ${movements.length} movimientos creados exitosamente.`);
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
  return docRef.id;
};

export const updateLoan = async (loanId: string, data: Partial<Loan>): Promise<void> => {
  const docRef = doc(db, 'loans', loanId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
};

export const deleteLoan = async (loanId: string): Promise<void> => {
  await deleteDoc(doc(db, 'loans', loanId));
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
  return docRef.id;
};

export const updateProjection = async (projectionId: string, data: Partial<Projection>): Promise<void> => {
  const docRef = doc(db, 'projections', projectionId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
};

export const deleteProjection = async (projectionId: string): Promise<void> => {
  await deleteDoc(doc(db, 'projections', projectionId));
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
  return docRef.id;
};

export const updateCategory = async (categoryId: string, data: Partial<Category>): Promise<void> => {
  const docRef = doc(db, 'categories', categoryId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
};

export const deleteCategory = async (categoryId: string): Promise<void> => {
  await deleteDoc(doc(db, 'categories', categoryId));
};

// ========== DEFAULT CATEGORIES ==========

export const initializeDefaultCategories = async (userId: string, defaultCategories: any[]): Promise<void> => {
  const batch = [];
  const now = Timestamp.now();

  for (const category of defaultCategories) {
    batch.push(
      addDoc(collection(db, 'categories'), {
        ...category,
        userId,
        createdAt: now,
        updatedAt: now,
      })
    );
  }

  await Promise.all(batch);
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
  return docRef.id;
};

export const updateClient = async (clientId: string, data: Partial<Client>): Promise<void> => {
  const docRef = doc(db, 'clients', clientId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
};

export const deleteClient = async (clientId: string): Promise<void> => {
  await deleteDoc(doc(db, 'clients', clientId));
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
  return docRef.id;
};

export const updateSubscription = async (subscriptionId: string, data: Partial<Subscription>): Promise<void> => {
  const docRef = doc(db, 'subscriptions', subscriptionId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
};

export const deleteSubscription = async (subscriptionId: string): Promise<void> => {
  await deleteDoc(doc(db, 'subscriptions', subscriptionId));
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
  return docRef.id;
};

export const updateServiceDefinition = async (id: string, data: Partial<ServiceDefinition>): Promise<void> => {
  const docRef = doc(db, 'service_definitions', id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
};

export const deleteServiceDefinition = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'service_definitions', id));
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
  return docRef.id;
};

export const updateEntitySubscription = async (subscriptionId: string, data: Partial<EntitySubscription>): Promise<void> => {
  const docRef = doc(db, 'entity_subscriptions', subscriptionId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
};

export const deleteEntitySubscription = async (subscriptionId: string): Promise<void> => {
  await deleteDoc(doc(db, 'entity_subscriptions', subscriptionId));
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
  return docRef.id;
};

export const updateProject = async (projectId: string, data: Partial<Project>): Promise<void> => {
  const docRef = doc(db, 'projects', projectId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
};

export const deleteProject = async (projectId: string): Promise<void> => {
  await deleteDoc(doc(db, 'projects', projectId));
};

// ========== CATEGORY HELPERS ==========

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
  // Delete all movements for this entity
  const movementsQuery = query(
    collection(db, 'movements'),
    where('userId', '==', userId),
    where('entityId', '==', entityId)
  );
  const movementsSnapshot = await getDocs(movementsQuery);
  const movementsBatch = writeBatch(db);
  movementsSnapshot.docs.forEach((doc) => {
    movementsBatch.delete(doc.ref);
  });
  await movementsBatch.commit();

  // Delete all loans for this entity
  const loansQuery = query(
    collection(db, 'loans'),
    where('userId', '==', userId),
    where('entityId', '==', entityId)
  );
  const loansSnapshot = await getDocs(loansQuery);
  const loansBatch = writeBatch(db);
  loansSnapshot.docs.forEach((doc) => {
    loansBatch.delete(doc.ref);
  });
  await loansBatch.commit();

  // Delete all projections for this entity
  const projectionsQuery = query(
    collection(db, 'projections'),
    where('userId', '==', userId),
    where('entityId', '==', entityId)
  );
  const projectionsSnapshot = await getDocs(projectionsQuery);
  const projectionsBatch = writeBatch(db);
  projectionsSnapshot.docs.forEach((doc) => {
    projectionsBatch.delete(doc.ref);
  });
  await projectionsBatch.commit();

  // Delete all clients for this entity
  const clientsQuery = query(
    collection(db, 'clients'),
    where('userId', '==', userId),
    where('entityId', '==', entityId)
  );
  const clientsSnapshot = await getDocs(clientsQuery);
  const clientsBatch = writeBatch(db);
  clientsSnapshot.docs.forEach((doc) => {
    clientsBatch.delete(doc.ref);
  });
  await clientsBatch.commit();

  // Delete all projects for this entity
  const projectsQuery = query(
    collection(db, 'projects'),
    where('userId', '==', userId),
    where('entityId', '==', entityId)
  );
  const projectsSnapshot = await getDocs(projectsQuery);
  const projectsBatch = writeBatch(db);
  projectsSnapshot.docs.forEach((doc) => {
    projectsBatch.delete(doc.ref);
  });
  await projectsBatch.commit();

  // Finally, delete the entity itself
  await deleteDoc(doc(db, 'entities', entityId));
};
