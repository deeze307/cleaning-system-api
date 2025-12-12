export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  companyId?: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  CLEANER = 'cleaner',
}

export interface Company {
  id: string;
  name: string;
  description?: string;
  plan: CompanyPlan;
  maxBuildings: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export enum CompanyPlan {
  BASIC = 'basic',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
}

export interface Building {
  id: string;
  companyId: string;
  name: string;
  type: BuildingType;
  address?: string;
  description?: string;
  floors?: number;
  phone?: string;
  email?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum BuildingType {
  HOTEL = 'hotel',
  APARTMENT = 'apartment',
  HOUSE = 'house',
  OFFICE = 'office',
  COMPLEX = 'complex',
}

export interface Room {
  id: string;
  buildingId: string;
  name: string;
  bedConfiguration: BedConfiguration;
  floor?: number;
  area?: number;
  description?: string;
  cleaningNotes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BedConfiguration {
  kingBeds: number;
  individualBeds: number;
  description?: string;
}

export interface CleaningTask {
  id: string;
  roomId: string;
  assignedTo?: string;
  scheduledDate: string;
  status: TaskStatus;
  completedAt?: string;
  completedBy?: string;
  observations?: string;
  images?: string[];
  createdAt: string;
  updatedAt: string;
}

export enum TaskStatus {
  TO_CLEAN = 'to_clean',
  TO_CLEAN_URGENT = 'to_clean_urgent',
  URGENT = 'urgent',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  VERIFIED = 'verified',
}