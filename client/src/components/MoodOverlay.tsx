import React from 'react';
import GridPickerOverlay from './GridPickerOverlay';
import type { GridItem } from './GridPickerOverlay';

export const MOOD_COLORS: Record<string, string> = {
  happy: '#FFD700',
  sad: '#4A90D9',
  loved: '#FF6B8A',
  anxious: '#C4A6E8',
  upset: '#E85D4A',
  stressed: '#FF8C42',
  calm: '#7EC8B8',
  excited: '#FFE066',
  tired: '#8B8FAE',
  grateful: '#A8D88E',
  focused: '#5DADE2',
  okay: '#B8C4CE',
};

const MOOD_ITEMS: GridItem[] = Object.entries(MOOD_COLORS).map(
  ([key, color]) => ({ key, color }),
);

interface MoodOverlayProps {
  visible: boolean;
  currentMood: string;
  onSelect: (mood: string) => void;
  onClose: () => void;
}

export default function MoodOverlay({
  visible,
  currentMood,
  onSelect,
  onClose,
}: MoodOverlayProps) {
  return (
    <GridPickerOverlay
      visible={visible}
      title="How are you feeling?"
      items={MOOD_ITEMS}
      selectedKey={currentMood}
      onSelect={onSelect}
      onClose={onClose}
    />
  );
}
