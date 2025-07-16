import { ReactNode } from 'react';

// Base prop interfaces for common patterns
export interface BaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface BaseCardProps {
  className?: string;
  children?: ReactNode;
}

export interface BaseFormProps {
  onSubmit: () => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

// Common data interfaces
export interface TimestampData {
  created_at: string | Date;
  updated_at: string | Date;
}

export interface UserData {
  user_id: string;
}

export interface NamedEntity {
  id: string;
  name: string;
  description?: string;
}

// Form state types
export interface FormDialogProps extends BaseDialogProps, BaseFormProps {
  title: string;
  description?: string;
}

// Loading and error states
export interface LoadingState {
  isLoading: boolean;
  error?: string | null;
}

export interface AsyncOperationState extends LoadingState {
  isSuccess?: boolean;
  data?: any;
}

// Common UI patterns
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface ThresholdConfig {
  pm1_min?: number;
  pm1_max?: number;
  pm25_min?: number;
  pm25_max?: number;
  pm10_min?: number;
  pm10_max?: number;
}

// Event handler types
export type ClickHandler = () => void;
export type ChangeHandler<T = string> = (value: T) => void;
export type SubmitHandler = (event?: React.FormEvent) => void;

// Measurement related types
export interface PMData {
  pm1: number;
  pm25: number;
  pm10: number;
}

export interface LocationData {
  latitude?: number;
  longitude?: number;
  accuracy?: number;
}

export interface EnvironmentalData extends PMData {
  temperature?: number;
  humidity?: number;
  timestamp: string | Date;
}