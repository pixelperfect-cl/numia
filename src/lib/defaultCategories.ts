/**
 * Numia v1.0 - Default Categories
 * Categorías predeterminadas que se crean automáticamente para nuevos usuarios
 */

import type { Category } from '@/types';

export interface DefaultCategoryData {
  name: string;
  type: 'income' | 'expense';
  icon: string;
  color: string;
  subcategories: string[];
}

export const DEFAULT_CATEGORIES: DefaultCategoryData[] = [
  // ========== GASTOS ==========
  {
    name: 'Alimentación',
    type: 'expense',
    icon: 'utensils',
    color: '#ef4444',
    subcategories: ['Restaurantes', 'Supermercado', 'Delivery', 'Cafetería', 'Snacks'],
  },
  {
    name: 'Tecnología',
    type: 'expense',
    icon: 'laptop',
    color: '#3b82f6',
    subcategories: ['Suscripciones SaaS', 'Hardware', 'Telefonía', 'Internet'],
  },
  {
    name: 'Hogar',
    type: 'expense',
    icon: 'house',
    color: '#8b5cf6',
    subcategories: ['Arriendo', 'Servicios Básicos', 'Mantención', 'Muebles', 'Decoración'],
  },
  {
    name: 'Transporte',
    type: 'expense',
    icon: 'car',
    color: '#f59e0b',
    subcategories: ['Combustible', 'Transporte Público', 'Uber/Taxi', 'Mantención Vehículo', 'Estacionamiento'],
  },
  {
    name: 'Entretenimiento',
    type: 'expense',
    icon: 'film',
    color: '#ec4899',
    subcategories: ['Cine', 'Streaming', 'Eventos', 'Hobbies', 'Deportes'],
  },
  {
    name: 'Salud',
    type: 'expense',
    icon: 'heart-pulse',
    color: '#10b981',
    subcategories: ['Médico', 'Farmacia', 'Gimnasio', 'Seguros'],
  },
  {
    name: 'Ropa',
    type: 'expense',
    icon: 'shirt',
    color: '#6366f1',
    subcategories: ['Ropa Casual', 'Ropa Formal', 'Calzado', 'Accesorios', 'Deportiva'],
  },
  {
    name: 'Vicios',
    type: 'expense',
    icon: 'wine-bottle',
    color: '#dc2626',
    subcategories: ['Alcohol', 'Tabaco', 'Apuestas', 'Cannabis', 'Otros'],
  },

  // ========== INGRESOS ==========
  {
    name: 'Salario',
    type: 'income',
    icon: 'wallet',
    color: '#10b981',
    subcategories: ['Sueldo Mensual', 'Bonos', 'Aguinaldo', 'Horas Extra'],
  },
  {
    name: 'Negocio',
    type: 'income',
    icon: 'briefcase',
    color: '#3b82f6',
    subcategories: ['Ventas', 'Servicios', 'Comisiones', 'Honorarios', 'Consultoría'],
  },
  {
    name: 'Inversiones',
    type: 'income',
    icon: 'chart-line',
    color: '#8b5cf6',
    subcategories: ['Dividendos', 'Intereses', 'Criptomonedas', 'Acciones'],
  },
  {
    name: 'Otros Ingresos',
    type: 'income',
    icon: 'gift',
    color: '#f59e0b',
    subcategories: ['Regalo', 'Reembolso', 'Venta de Artículos', 'Arriendo Propiedad'],
  },
];
