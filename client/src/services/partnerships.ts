import apiClient from '../api/client';
import { Partnership, SpecialDate } from '../types';

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

export async function getSpecialDates(partnershipId: number): Promise<SpecialDate[]> {
  const { data } = await apiClient.get<SpecialDate[]>(
    `/relationships/${partnershipId}/special-dates/`,
  );
  return data;
}

export async function createSpecialDate(
  partnershipId: number,
  title: string,
  date: string,
): Promise<SpecialDate> {
  const { data } = await apiClient.post<SpecialDate>(
    `/relationships/${partnershipId}/special-dates/`,
    { title, date },
  );
  return data;
}

export async function updateSpecialDate(
  partnershipId: number,
  dateId: number,
  fields: { title?: string; date?: string },
): Promise<SpecialDate> {
  const { data } = await apiClient.patch<SpecialDate>(
    `/relationships/${partnershipId}/special-dates/${dateId}/`,
    fields,
  );
  return data;
}

export async function deleteSpecialDate(
  partnershipId: number,
  dateId: number,
): Promise<void> {
  await apiClient.delete(
    `/relationships/${partnershipId}/special-dates/${dateId}/`,
  );
}

export async function updatePartnership(
  id: number,
  fields: { relation?: string; status?: string },
): Promise<Partnership> {
  const { data } = await apiClient.patch<Partnership>(
    `/relationships/${id}/`,
    fields,
  );
  return data;
}
