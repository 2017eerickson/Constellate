import apiClient from '../api/client';
import { MoodResponse, Affection, AffectionType, ActivityResponse } from '../types';

export async function getMoods(partnershipId: number): Promise<MoodResponse> {
  const { data } = await apiClient.get<MoodResponse>(
    `/activities/${partnershipId}/mood/`,
  );
  return data;
}

export async function setMood(
  partnershipId: number,
  mood: string,
): Promise<ActivityResponse> {
  const { data } = await apiClient.post<ActivityResponse>(
    `/activities/${partnershipId}/mood/`,
    { mood },
  );
  return data;
}

export async function sendAffection(
  partnershipId: number,
  type: AffectionType,
): Promise<Affection & ActivityResponse> {
  const { data } = await apiClient.post<Affection & ActivityResponse>(
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

export async function getAffectionCooldown(
  partnershipId: number,
): Promise<number> {
  const { data } = await apiClient.get<{ remaining_seconds: number }>(
    `/activities/${partnershipId}/affection/cooldown/`,
  );
  return data.remaining_seconds;
}
