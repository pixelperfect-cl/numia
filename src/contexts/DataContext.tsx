/**
 * Numia v1.0 - Data Context
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import type { Entity, Movement, Loan, Projection, Category, DateFilter, EntitySubscription } from '@/types';
import * as db from '@/lib/firebase/database';
import { DEFAULT_CATEGORIES } from '@/lib/defaultCategories';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db as firestore } from '@/lib/firebase/config';

interface DataContextType {
  entities: Entity[];
  movements: Movement[];
  loans: Loan[];
  projections: Projection[];
  categories: Category[];
  entitySubscriptions: EntitySubscription[];
  dateFilter: DateFilter;
  loading: boolean;
  error: string | null;
  setDateFilter: (filter: DateFilter) => void;
  refreshData: () => Promise<void>;
  // Entity methods
  createEntity: (data: Omit<Entity, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateEntity: (id: string, data: Partial<Entity>) => Promise<void>;
  deleteEntity: (id: string) => Promise<void>;
  // Movement methods
  createMovement: (data: Omit<Movement, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateMovement: (id: string, data: Partial<Movement>) => Promise<void>;
  deleteMovement: (id: string) => Promise<void>;
  createBatchMovements: (data: Omit<Movement, 'id' | 'userId' | 'createdAt' | 'updatedAt'>[]) => Promise<void>;
  // Transfer methods
  createTransfer: (data: {
    fromEntityId: string;
    toEntityId: string;
    fromBox: string;
    toBox: string;
    amount: number;
    description?: string;
    date: string;
  }) => Promise<void>;
  // Loan methods
  createLoan: (data: Omit<Loan, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateLoan: (id: string, data: Partial<Loan>) => Promise<void>;
  deleteLoan: (id: string) => Promise<void>;
  // Category methods
  createCategory: (data: Omit<Category, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateCategory: (id: string, data: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  // Projection methods
  createProjection: (data: Omit<Projection, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateProjection: (id: string, data: Partial<Projection>) => Promise<void>;
  deleteProjection: (id: string) => Promise<void>;
  // Entity Subscription methods
  createEntitySubscription: (data: Omit<EntitySubscription, 'id' | 'userId' | 'entityId' | 'createdAt' | 'updatedAt'>, entityId: string) => Promise<string>;
  updateEntitySubscription: (id: string, data: Partial<EntitySubscription>) => Promise<void>;
  deleteEntitySubscription: (id: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [entities, setEntities] = useState<Entity[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [projections, setProjections] = useState<Projection[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [entitySubscriptions, setEntitySubscriptions] = useState<EntitySubscription[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilter>({ type: 'THIS_MONTH' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper function to create notifications
  const createNotification = async (title: string, message: string, type: 'info' | 'warning' | 'success' = 'info') => {
    if (!user) return;

    try {
      await addDoc(collection(firestore, 'notifications'), {
        userId: user.uid,
        title,
        message,
        read: false,
        date: new Date().toISOString(),
        type,
        createdAt: Timestamp.now(),
      });
    } catch (error) {
      // Silently fail - notifications are non-critical
      // Las notificaciones requieren reglas de Firestore adicionales
    }
  };

  const refreshData = async () => {
    if (!user) {
      setEntities([]);
      setMovements([]);
      setLoans([]);
      setProjections([]);
      setCategories([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('🔄 Refrescando datos para usuario:', user.uid);

      const [entitiesData, movementsData, loansData, projectionsData, categoriesData] = await Promise.all([
        db.getEntities(user.uid),
        db.getMovements(user.uid),
        db.getLoans(user.uid),
        db.getProjections(user.uid),
        db.getCategories(user.uid),
      ]);

      let subscriptionsData: EntitySubscription[] = [];
      try {
        subscriptionsData = await db.getUserEntitySubscriptions(user.uid);
      } catch (err) {
        console.warn('Error fetching subscriptions (check permissions):', err);
      }

      console.log('📊 Datos obtenidos:', {
        entidades: entitiesData.length,
        movimientos: movementsData.length,
        préstamos: loansData.length,
        proyecciones: projectionsData.length,
        categorías: categoriesData.length,
        suscripciones: subscriptionsData.length
      });

      if (movementsData.length > 0) {
        console.log('📅 Últimos 3 movimientos:', movementsData.slice(0, 3).map(m => ({
          id: m.id,
          fecha: m.date,
          tipo: m.type,
          monto: m.amount
        })));
      }

      // Si el usuario no tiene categorías, crear las predeterminadas
      if (categoriesData.length === 0) {
        console.log('Usuario sin categorías. Creando categorías predeterminadas...');
        await db.initializeDefaultCategories(user.uid, DEFAULT_CATEGORIES);
        // Recargar categorías después de crearlas
        const newCategoriesData = await db.getCategories(user.uid);
        setCategories(newCategoriesData);
      } else {
        setCategories(categoriesData);
      }

      setEntities(entitiesData);
      setMovements(movementsData);
      setLoans(loansData);
      setProjections(projectionsData);
      setEntitySubscriptions(subscriptionsData);
      // Wait, Promise.all returns an array of results in order.
      // 0: entities, 1: movements, 2: loans, 3: projections, 4: categories
      // I added getUserEntitySubscriptions as the 6th element (index 5)


      console.log('✅ Estado actualizado exitosamente');
    } catch (error: any) {
      console.error('Error refreshing data:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido al cargar datos');
      // Keep loading false in finally
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, [user]);

  // Entity methods
  const createEntity = async (data: Omit<Entity, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!user) throw new Error('User not authenticated');
    const id = await db.createEntity(user.uid, data);
    await createNotification(
      'Entidad creada',
      `Se ha creado la entidad "${data.name}" exitosamente`,
      'success'
    );
    await refreshData();
    return id;
  };

  const updateEntity = async (id: string, data: Partial<Entity>) => {
    await db.updateEntity(id, data);
    await createNotification(
      'Entidad actualizada',
      'Se ha actualizado una entidad exitosamente',
      'info'
    );
    await refreshData();
  };

  const deleteEntity = async (id: string) => {
    await db.deleteEntity(id);
    await createNotification(
      'Entidad eliminada',
      'Se ha eliminado una entidad',
      'warning'
    );
    await refreshData();
  };

  // Movement methods
  const createMovement = async (data: Omit<Movement, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!user) throw new Error('User not authenticated');
    const id = await db.createMovement(user.uid, data);

    console.log('✅ DataContext: Movimiento creado con ID:', id, 'Tipo:', data.type, 'Fecha:', data.date);

    await createNotification(
      'Movimiento creado',
      `Se ha creado un nuevo movimiento de ${data.type === 'income' ? 'ingreso' : 'gasto'} por $${data.amount.toLocaleString()}`,
      'success'
    );

    // Small delay to ensure Firestore has indexed the document
    await new Promise(resolve => setTimeout(resolve, 100));

    console.log('🔄 DataContext: Refrescando datos después de crear movimiento...');
    await refreshData();
    console.log('✅ DataContext: Datos refrescados. Total movimientos:', movements.length + 1);

    return id;
  };

  const updateMovement = async (id: string, data: Partial<Movement>) => {
    await db.updateMovement(id, data);
    await createNotification(
      'Movimiento actualizado',
      'Se ha actualizado un movimiento exitosamente',
      'info'
    );
    await refreshData();
  };

  const deleteMovement = async (id: string) => {
    await db.deleteMovement(id);
    await createNotification(
      'Movimiento eliminado',
      'Se ha eliminado un movimiento',
      'warning'
    );
    await refreshData();
  };

  const createBatchMovements = async (data: Omit<Movement, 'id' | 'userId' | 'createdAt' | 'updatedAt'>[]) => {
    if (!user) throw new Error('User not authenticated');

    await db.createBatchMovements(user.uid, data);

    await createNotification(
      'Carga Masiva Completada',
      `Se han importado ${data.length} movimientos exitosamente`,
      'success'
    );

    await refreshData();
  };

  // Transfer methods
  const createTransfer = async (data: {
    fromEntityId: string;
    toEntityId: string;
    fromBox: string;
    toBox: string;
    amount: number;
    description?: string;
    date: string;
  }) => {
    if (!user) throw new Error('User not authenticated');

    // Get or create "Transferencia" categories
    let expenseCategory = categories.find(c => c.name === 'Transferencia' && c.type === 'expense');
    let incomeCategory = categories.find(c => c.name === 'Transferencia' && c.type === 'income');

    let expenseCategoryId: string;
    let incomeCategoryId: string;

    if (!expenseCategory || !incomeCategory) {
      // Create transfer categories if they don't exist
      incomeCategoryId = await db.createCategory(user.uid, {
        name: 'Transferencia',
        type: 'income',
        icon: 'ArrowLeftRight',
        color: '#8b5cf6',
      });

      expenseCategoryId = await db.createCategory(user.uid, {
        name: 'Transferencia',
        type: 'expense',
        icon: 'ArrowLeftRight',
        color: '#8b5cf6',
      });
    } else {
      expenseCategoryId = expenseCategory.id;
      incomeCategoryId = incomeCategory.id;
    }

    const fromEntity = entities.find(e => e.id === data.fromEntityId);
    const toEntity = entities.find(e => e.id === data.toEntityId);

    const description = data.description || `Transferencia: ${fromEntity?.name} → ${toEntity?.name}`;

    // Create expense movement (outgoing from source entity)
    await db.createMovement(user.uid, {
      type: 'expense',
      amount: data.amount,
      description: description,
      categoryId: expenseCategoryId,
      box: data.fromBox,
      entityId: data.fromEntityId,
      date: data.date,
    });

    // Create income movement (incoming to destination entity)
    await db.createMovement(user.uid, {
      type: 'income',
      amount: data.amount,
      description: description,
      categoryId: incomeCategoryId,
      box: data.toBox,
      entityId: data.toEntityId,
      date: data.date,
    });

    await createNotification(
      'Transferencia completada',
      `Se ha transferido $${data.amount.toLocaleString()} de ${fromEntity?.name} a ${toEntity?.name}`,
      'success'
    );

    await refreshData();
  };

  // Loan methods
  const createLoan = async (data: Omit<Loan, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!user) throw new Error('User not authenticated');
    const id = await db.createLoan(user.uid, data);
    await createNotification(
      'Préstamo creado',
      `Se ha registrado un nuevo préstamo por $${data.amount.toLocaleString()}`,
      'success'
    );
    await refreshData();
    return id;
  };

  const updateLoan = async (id: string, data: Partial<Loan>) => {
    await db.updateLoan(id, data);
    await createNotification(
      'Préstamo actualizado',
      'Se ha actualizado un préstamo exitosamente',
      'info'
    );
    await refreshData();
  };

  const deleteLoan = async (id: string) => {
    await db.deleteLoan(id);
    await createNotification(
      'Préstamo eliminado',
      'Se ha eliminado un préstamo',
      'warning'
    );
    await refreshData();
  };

  // Category methods
  const createCategory = async (data: Omit<Category, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!user) throw new Error('User not authenticated');
    const id = await db.createCategory(user.uid, data);
    await createNotification(
      'Categoría creada',
      `Se ha creado la categoría "${data.name}" exitosamente`,
      'success'
    );
    await refreshData();
    return id;
  };

  const updateCategory = async (id: string, data: Partial<Category>) => {
    await db.updateCategory(id, data);
    const category = categories.find(c => c.id === id);
    const message = data.subcategories
      ? `Se ha añadido una subcategoría a "${category?.name}"`
      : 'Se ha actualizado una categoría exitosamente';
    await createNotification(
      'Categoría actualizada',
      message,
      'info'
    );
    await refreshData();
  };

  const deleteCategory = async (id: string) => {
    await db.deleteCategory(id);
    await createNotification(
      'Categoría eliminada',
      'Se ha eliminado una categoría',
      'warning'
    );
    await refreshData();
  };

  // Projection methods
  const createProjection = async (data: Omit<Projection, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!user) throw new Error('User not authenticated');
    const id = await db.createProjection(user.uid, data);
    await createNotification(
      'Proyección creada',
      `Se ha creado una nueva proyección exitosamente`,
      'success'
    );
    await refreshData();
    return id;
  };

  const updateProjection = async (id: string, data: Partial<Projection>) => {
    await db.updateProjection(id, data);
    await createNotification(
      'Proyección actualizada',
      'Se ha actualizado una proyección exitosamente',
      'info'
    );
    await refreshData();
  };

  const deleteProjection = async (id: string) => {
    await db.deleteProjection(id);
    await createNotification(
      'Proyección eliminada',
      'Se ha eliminado una proyección',
      'warning'
    );
    await refreshData();
  };

  // Entity Subscription methods
  const createEntitySubscription = async (data: Omit<EntitySubscription, 'id' | 'userId' | 'entityId' | 'createdAt' | 'updatedAt'>, entityId: string) => {
    if (!user) throw new Error('User not authenticated');
    const id = await db.createEntitySubscription(user.uid, entityId, data);
    await createNotification(
      'Suscripción creada',
      `Se ha creado la suscripción "${data.name}" exitosamente`,
      'success'
    );
    await refreshData();
    return id;
  };

  const updateEntitySubscription = async (id: string, data: Partial<EntitySubscription>) => {
    await db.updateEntitySubscription(id, data);
    await createNotification(
      'Suscripción actualizada',
      'Se ha actualizado una suscripción exitosamente',
      'info'
    );
    await refreshData();
  };

  const deleteEntitySubscription = async (id: string) => {
    await db.deleteEntitySubscription(id);
    await createNotification(
      'Suscripción eliminada',
      'Se ha eliminado una suscripción',
      'warning'
    );
    await refreshData();
  };

  return (
    <DataContext.Provider
      value={{
        entities,
        movements,
        loans,
        projections,
        categories,
        entitySubscriptions,
        dateFilter,
        loading,
        error,
        setDateFilter,
        refreshData,
        createEntity,
        updateEntity,
        deleteEntity,
        createMovement,
        updateMovement,
        deleteMovement,
        createBatchMovements,
        createTransfer,
        createLoan,
        updateLoan,
        deleteLoan,
        createCategory,
        updateCategory,
        deleteCategory,
        createProjection,
        updateProjection,
        deleteProjection,
        createEntitySubscription,
        updateEntitySubscription,
        deleteEntitySubscription,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
