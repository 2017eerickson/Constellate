import apiClient from '../api/client';
import { Partnership } from '../types';

export async function getPartnerships(): Promise<Partnership[]> {
  const { data } = await apiClient.get<Partnership[]>('/relationships/');
  return data;
}

export async function connectPartner(
  partnerCode: string,
  relation?: string,
  anniversary?: string,
): Promise<Partnership> {
  const { data } = await apiClient.post<Partnership>('/relationships/connect/', {
    partner_code: partnerCode,
    ...(relation && { relation }),
    ...(anniversary && { anniversary }),
  });
  return data;
}

export async function acceptPartnership(id: number): Promise<Partnership> {
  const { data } = await apiClient.patch<Partnership>(`/relationships/${id}/`, {
    status: 'active',
  });
  return data;
}

export async function deletePartnership(id: number): Promise<void> {
  await apiClient.delete(`/relationships/${id}/`);
}
