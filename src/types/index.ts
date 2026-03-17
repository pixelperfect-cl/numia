/**
 * Numia v1.0 - TypeScript Types
 */

// Entity Types
export type EntityType = 'personal' | 'business';

export interface Box {
  order: number;
  isDefault: boolean;
  currency?: string; // Currency code (e.g., 'CLP', 'USD', 'EUR')
}

export interface Entity {
  id: string;
  userId: string;
  name: string;
  type: EntityType;
  icon: string;
  color?: string; // Hex color for charts and visual identification
  logoUrl?: string; // URL of uploaded horizontal logo image
  boxes: Record<string, Box>;
  settings?: {
    erpEnabled: boolean;
    smtpEnabled?: boolean;
    smtpConfig?: {
      apiKey: string;
      fromEmail: string;
      billingNotificationsEnabled: boolean;
    };
    apiPreferences?: ApiPreference[];
    serviceSettings?: {
      reminders: {
        id: string;
        daysBefore: number;
        subject: string;
        body: string;
        enabled: boolean;
      }[];
    };
    projectSettings?: {
      statusChangeTemplates: {
        id: string; // The specific project list status
        subject: string;
        body: string;
        enabled: boolean;
      }[];
    };
  };
  rut?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Configuration Types
export interface ApiPreference {
  id: string;
  name: string;
  enabled: boolean;
  source: string;
}

// Notification Types
export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  type: 'info' | 'warning' | 'success';
  date?: string;
  createdAt: string; // ISO date
}

export interface NotificationPreferences {
  loans: boolean;
  projections: boolean;
  lowBalance: boolean;
}

// Category Types
export interface Category {
  id: string;
  userId: string;
  name: string;
  type: 'income' | 'expense';
  icon: string;
  color: string;
  order?: number;
  subcategories?: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Movement Types
export type MovementType = 'income' | 'expense';

export interface MovementHistoryEntry {
  timestamp: Date;
  field: string;
  oldValue: any;
  newValue: any;
  userId: string;
}

export interface Movement {
  id: string;
  userId: string;
  entityId: string;
  type: MovementType;
  amount: number;
  description?: string;
  categoryId: string; // ID of the category
  subcategory?: string; // Optional subcategory name
  category?: string; // DEPRECATED: kept for backwards compatibility
  box: string;
  date: string; // ISO date string
  status?: 'paid' | 'pending';
  clientId?: string; // Link to ERP Client
  subscriptionId?: string; // Link to Specific Subscription
  billingPeriod?: string; // The specific billing cycle date this payment applies to (YYYY-MM-DD)
  isFinancial?: boolean; // Indicates if this movement is backed by a financial record
  projectId?: string; // Link to Project
  bankTransactionId?: string; // Bank transaction code for deduplication
  history?: MovementHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
}

// Loan Types
export type LoanType = 'owe' | 'lent';

export interface LoanPayment {
  id: string;
  amount: number;
  date: string; // ISO date string
  note?: string;
  createdAt: Date;
}

export interface Loan {
  id: string;
  userId: string;
  entityId: string;
  type: LoanType;
  personName: string;
  amount: number; // Total loan amount
  amountPaid: number; // Total amount paid so far
  description?: string;
  date: string; // ISO date string (loan creation date)
  isPaid: boolean; // DEPRECATED: kept for backwards compatibility, use amountPaid >= amount instead
  payments: LoanPayment[]; // Payment history
  createdAt: Date;
  updatedAt: Date;
}

// Projection Types
export interface ProjectionItem {
  categoryId: string; // ID of the category
  category?: string; // DEPRECATED: kept for backwards compatibility
  description?: string;
  amount: number;
}

export type PeriodType = 'weekly' | 'monthly' | 'annual';

export interface Projection {
  id: string;
  userId: string;
  entityId: string;
  name: string;
  periodType: PeriodType; // Type of period
  period: string; // Format depends on periodType: YYYY-Www (weekly), YYYY-MM (monthly), YYYY (annual)
  fixedIncome: ProjectionItem[];
  fixedExpenses: ProjectionItem[];
  totals: {
    totalIncome: number;
    totalExpenses: number;
    availableBalance: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Date Filter Types
export type DateFilterType = 'TODAY' | 'THIS_WEEK' | 'LAST_WEEK' | 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_YEAR' | 'LAST_YEAR' | 'ALL' | 'CUSTOM';

export interface DateFilter {
  type: DateFilterType;
  startDate?: string;
  endDate?: string;
}

// User Type
export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

// Summary Types
export interface Summary {
  income: number;
  expenses: number;
  balance: number;
}

export interface BoxBalance {
  box: string;
  balance: number;
}

// Transfer Types
export interface Transfer {
  id: string;
  userId: string;
  fromEntityId: string;
  toEntityId: string;
  fromBox: string;
  toBox: string;
  amount: number;
  description?: string;
  date: string; // ISO date string
  createdAt: Date;
  updatedAt: Date;
}

// AI Assistant Types
export type AIMessageRole = 'user' | 'assistant' | 'system';

export interface AIMessage {
  id: string;
  role: AIMessageRole;
  content: string;
  timestamp: Date;
  attachments?: DocumentAttachment[];
  functionCall?: AIFunctionCall;
  error?: string;
}

export interface DocumentAttachment {
  id: string;
  type: 'receipt' | 'bank_statement' | 'invoice' | 'image';
  url: string;
  filename: string;
  processedData?: ExtractedMovements;
  status: 'uploading' | 'processing' | 'completed' | 'error';
}

export interface ExtractedMovements {
  movements: Omit<Movement, 'id' | 'userId' | 'createdAt' | 'updatedAt'>[];
  confidence: number;
  suggestedCategories: string[];
  rawText?: string;
}

export interface AIFunctionCall {
  name: string;
  arguments: any;
  result?: any;
  status: 'pending' | 'executing' | 'completed' | 'error';
}

export interface AIConversation {
  id: string;
  userId: string;
  title: string;
  messages: AIMessage[];
  createdAt: Date;
  updatedAt: Date;
}

// ERP Types

export interface PaymentRecord {
  id: string;
  amount: number;
  date: string; // ISO date
  notes?: string;
  isFinancial: boolean; // True if it created a movement
  movementId?: string; // ID of the related financial movement
}

export interface Subscription {
  id: string;
  clientId: string;
  name: string;
  amount: number;
  currency?: 'CLP' | 'UF';
  frequency: 'monthly' | 'yearly';
  startDate: string; // ISO date
  nextBillingDate: string; // ISO date
  status: 'active' | 'inactive' | 'archived';
  notes?: string;
  payments?: PaymentRecord[]; // History of payments for this service
  // Archive tracking
  archiveReason?: string;     // Reason for archiving (e.g., "Servicio Concluido")
  archiveNotes?: string;      // Additional comments when archiving
  archivedAt?: string;        // ISO date when archived
  createdAt: Date;
  updatedAt: Date;
}

// Enhanced Subscription with client info (for use in components)
export interface EnhancedSubscription extends Subscription {
  clientName: string;
  clientWebsite?: string;
  paidAmount?: number;
  currentMovements?: Movement[];
  allPayments?: Movement[];
}

export interface EntitySubscription {
  id: string;
  userId: string;
  entityId: string;
  name: string;
  amount: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly';
  nextPaymentDate: string; // ISO date
  categoryId: string;
  box: string;
  status: 'active' | 'inactive';
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ServiceDefinition {
  id: string;
  userId: string;
  name: string;
  description?: string;
  currency: 'CLP' | 'UF';
  amount: number;
  frequency: 'monthly' | 'yearly';
  categoryId?: string; // Category for automatic payment categorization
  createdAt: Date;
  updatedAt: Date;
}

export interface Client {
  id: string;
  userId: string;
  entityId: string;
  name: string;
  representative?: string; // Representante legal o contacto principal
  website?: string; // Website URL
  email?: string; // Primary email (backward compatibility)
  phone?: string; // Primary phone (backward compatibility)
  emails?: string[]; // Additional emails for notifications
  phones?: string[]; // Additional phones for notifications
  rut?: string; // RUT de facturación
  address?: string; // Client address
  status: 'active' | 'inactive';
  subscriptions?: Subscription[]; // Optional, populated on fetch if needed
  createdAt: Date;
  updatedAt: Date;
}

// Project Types
export interface ProjectList {
  id: string;
  userId: string;
  title: string;
  order: number;
  color?: string; // Tailwind class or hex
  createdAt: Date;
  updatedAt: Date;
}

export type ProjectStatus = string;

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface ProjectChecklist {
  id: string;
  title: string;
  items: ChecklistItem[];
}

export interface Project {
  id: string;
  userId: string;
  entityId: string;
  clientId: string;
  name: string;
  status: ProjectStatus;
  amount?: number;
  currency?: 'CLP' | 'UF';
  description?: string;
  startDate?: string; // ISO date
  dueDate?: string; // ISO date
  progress: number; // 0-100
  checklists?: ProjectChecklist[];
  archived?: boolean;
  archiveReason?: string;
  archiveDate?: string; // ISO date
  createdAt: Date;
  updatedAt: Date;
  // Enhanced Fields
  // Enhanced Fields
  milestones?: { title: string; status: 'pending' | 'active' | 'completed'; date?: string }[];
  links?: { title: string; url: string; type: 'github' | 'figma' | 'url' }[];
  environments?: {
    name: 'production' | 'staging' | 'dev';
    status: 'healthy' | 'degraded' | 'down';
    url?: string;
    uptime?: number;
    version?: string;
  }[];

  // Refined Fields
  team?: { name: string; role: string; email?: string }[];
  credentials?: { id: string; title: string; username?: string; password?: string; url?: string }[];
  techDetails?: {
    stack?: string[]; // e.g. ["React", "Node.js"]
    repoUrl?: string;
    hosting?: string;
  };
}

// Roadmap Types
