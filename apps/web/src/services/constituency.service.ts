import { apiClient } from '../api/client';
import type { ConstituencyOption } from '../types/registration';
import type { ConstituencyListQuery, ManagedConstituency, ManagedConstituencyList } from '../types/constituency';

export async function listConstituencies(): Promise<ConstituencyOption[]> {
  const response = await apiClient.get<ConstituencyOption[]>('/constituencies');
  return response.data;
}

export async function listManagedConstituencies(query: ConstituencyListQuery): Promise<ManagedConstituencyList> {
  const response = await apiClient.get<ManagedConstituencyList>('/constituencies/manage', { params: query });
  return response.data;
}

export async function createConstituency(name: string): Promise<ManagedConstituency> {
  const response = await apiClient.post<ManagedConstituency>('/constituencies', { name });
  return response.data;
}

export async function updateConstituency(id: string, name: string): Promise<ManagedConstituency> {
  const response = await apiClient.patch<ManagedConstituency>(`/constituencies/${id}`, { name });
  return response.data;
}

export async function setConstituencyActive(id: string, isActive: boolean): Promise<ManagedConstituency> {
  const response = await apiClient.patch<ManagedConstituency>(`/constituencies/${id}/status`, { isActive });
  return response.data;
}
