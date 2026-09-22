import apiClient from '../api/client';
import { Partnership } from '../types';

export async function getPartnerships(): Promise<Partnership[]> {
  const { data } = await apiClient.get<Partnership[]>('/relationships/');
  return data;
}
