export interface EventType {
  value: string;
  label: string;
  icon: string;
}

export const EVENT_TYPES: EventType[] = [
  { value: 'smoker', label: 'Smoker', icon: '🚬' },
  { value: 'truck', label: 'Truck', icon: '🚛' },
  { value: 'traffic', label: 'Heavy Traffic', icon: '🚗' },
  { value: 'construction', label: 'Construction', icon: '🏗️' },
  { value: 'fire', label: 'Fire/Smoke', icon: '🔥' },
  { value: 'dust', label: 'Dust', icon: '💨' },
  { value: 'industrial', label: 'Industrial Activity', icon: '🏭' },
  { value: 'cooking', label: 'Cooking/BBQ', icon: '🔥' },
  { value: 'other', label: 'Other', icon: '📍' }
];

export function getEventType(value: string): EventType | undefined {
  return EVENT_TYPES.find(type => type.value === value);
}

export function getEventLabel(value: string): string {
  const eventType = getEventType(value);
  return eventType ? eventType.label : 'Other Event';
}

export function getEventIcon(value: string): string {
  const eventType = getEventType(value);
  return eventType ? eventType.icon : '📍';
}