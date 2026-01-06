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
} from 'firebase/firestore';
import { db } from './config';
import type { Entity, Movement, Loan, Projection, Category } from '@/types';

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
  const docRef = await addDoc(collection(db, 'entities'), {
    ...data,
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
