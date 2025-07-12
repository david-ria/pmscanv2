export const locationKeys = [
  "home",
  "school",
  "office", 
  "park",
  "mainStreet",
  "transport"
];

export interface ActivityCategory {
  key: string;
  label: string;
}

export const activityCategories: ActivityCategory[] = [
  { key: "indoor", label: "Indoor" },
  { key: "outdoor", label: "Outdoor" },
  { key: "transport", label: "Transport" },
  { key: "walking", label: "Walking" },
  { key: "cycling", label: "Cycling" },
  { key: "undergroundTransport", label: "Underground transport" },
  { key: "sport", label: "Sport" },
  { key: "rest", label: "Rest" },
  { key: "work", label: "Work" }
];

export const activityKeys = activityCategories.map(a => a.key);

export const MODEL_LABELS = activityCategories.map(a => a.label);

export const frequencyOptionKeys = [
  { value: "1s", key: "every1s" },
  { value: "5s", key: "every5s" },
  { value: "10s", key: "every10s" },
  { value: "30s", key: "every30s" },
  { value: "1m", key: "every1m" },
  { value: "5m", key: "every5m" },
  { value: "10m", key: "every10m" }
];