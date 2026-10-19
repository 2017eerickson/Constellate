import apiClient from '../api/client';
import { MoodResponse } from '../types';

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
