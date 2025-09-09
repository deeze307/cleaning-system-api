export interface User {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  companyId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  mustChangePassword?: boolean;
}

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MAID = 'maid',
}

export interface Company {
  id: string;
  name: string;
  description?: string;
  plan: CompanyPlan;
  maxBuildings: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
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
  createdAt: Date;
  updatedAt: Date;
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
  date: Date;
  status: TaskStatus;
  completedAt?: Date;
  completedBy?: string;
  observations?: string;
  images?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export enum TaskStatus {
  PENDING = 'pending',
  URGENT = 'urgent',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  VERIFIED = 'verified',
}