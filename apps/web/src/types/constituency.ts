import type { ConstituencyOption } from './registration';

export type ConstituencyStatusFilter = 'active' | 'inactive';

export interface ManagedConstituency extends ConstituencyOption {
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  assignedUserCount: number;
}

export interface ManagedConstituencyList {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  items: ManagedConstituency[];
}

export interface ConstituencyListQuery {
  page: number;
  limit: number;
  search?: string;
  status?: ConstituencyStatusFilter;
}
