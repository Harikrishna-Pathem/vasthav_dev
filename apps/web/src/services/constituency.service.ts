import { apiClient } from '../api/client';
import type { ConstituencyOption } from '../types/registration';

export async function listConstituencies(): Promise<ConstituencyOption[]> {
  const response = await apiClient.get<ConstituencyOption[]>('/constituencies');
  return response.data;
}
