import apiClient from '../api/client';
import { MoodResponse, Affection, AffectionType } from '../types';

export async function getMoods(partnershipId: number): Promise<MoodResponse> {
  const { data } = await apiClient.get<MoodResponse>(
    `/activities/${partnershipId}/mood/`,
  );
  return data;
}

export async function setMood(
  partnershipId: number,
  mood: string,
): Promise<void> {
  await apiClient.post(`/activities/${partnershipId}/mood/`, { mood });
}

export async function sendAffection(
  partnershipId: number,
  type: AffectionType,
): Promise<Affection> {
  const { data } = await apiClient.post<Affection>(
    `/activities/${partnershipId}/affection/send/`,
    { type },
  );
  return data;
}

export async function getAffections(
  partnershipId: number,
): Promise<Affection[]> {
  const { data } = await apiClient.get<Affection[]>(
    `/activities/${partnershipId}/affection/`,
  );
  return data;
}

export async function readAffection(
  partnershipId: number,
  affectionId: number,
): Promise<Affection> {
  const { data } = await apiClient.put<Affection>(
    `/activities/${partnershipId}/affection/${affectionId}/read/`,
  );
  return data;
}
