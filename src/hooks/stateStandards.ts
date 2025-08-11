/**
 * CRITICAL: Professional State Management Standards
 * Enforces consistent state patterns and eliminates useState chaos
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { AppError, handleError } from '@/utils/errorManager';
import { logger } from '@/utils/professionalLogger';
import { AsyncOperationState, ValidationSchema, FormState } from '@/types';

// === ASYNC STATE HOOK ===
function useAsyncState<T>(
  initialData?: T
): [AsyncOperationState<T>, (operation: () => Promise<T>) => Promise<T>] {
  const [state, setState] = useState<AsyncOperationState<T>>({
    isLoading: false,
    isSuccess: false,
    isError: false,
    data: initialData,
    error: undefined,
  });

  const execute = useCallback(async (operation: () => Promise<T>): Promise<T> => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      isError: false,
      error: undefined,
    }));

    try {
      const result = await operation();
      setState({
        isLoading: false,
        isSuccess: true,
        isError: false,
        data: result,
        error: undefined,
      });
      return result;
    } catch (error) {
      const appError = handleError(error);
      setState({
        isLoading: false,
        isSuccess: false,
        isError: true,
        data: initialData,
        error: appError.message,
      });
      throw appError;
    }
  }, [initialData]);

  return [state, execute];
}

// === FORM STATE HOOK ===
function useFormState<T extends Record<string, unknown>>(
  initialData: T,
  validationSchema?: ValidationSchema
): {
  formState: FormState<T>;
  updateField: (field: keyof T, value: T[keyof T]) => void;
  validateForm: () => boolean;
  reset: () => void;
  submit: (onSubmit: (data: T) => Promise<void>) => Promise<void>;
} {
  const [formState, setFormState] = useState<FormState<T>>({
    data: initialData,
    errors: {},
    isSubmitting: false,
    isValid: false,
  });

  const validate = useCallback((data: T): Record<string, string> => {
    if (!validationSchema) return {};

    const errors: Record<string, string> = {};

    Object.entries(validationSchema).forEach(([field, rules]) => {
      const value = data[field];

      if (rules.required && (!value || value === '')) {
        errors[field] = `${field} is required`;
        return;
      }

      if (rules.minLength && typeof value === 'string' && value.length < rules.minLength) {
        errors[field] = `${field} must be at least ${rules.minLength} characters`;
        return;
      }

      if (rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
        errors[field] = `${field} must be no more than ${rules.maxLength} characters`;
        return;
      }

      if (rules.pattern && typeof value === 'string' && !rules.pattern.test(value)) {
        errors[field] = `${field} format is invalid`;
        return;
      }

      if (rules.custom) {
        const customError = rules.custom(value);
        if (customError) {
          errors[field] = customError;
        }
      }
    });

    return errors;
  }, [validationSchema]);

  const updateField = useCallback((field: keyof T, value: T[keyof T]) => {
    setFormState(prev => {
      const newData = { ...prev.data, [field]: value };
      const errors = validate(newData);
      return {
        ...prev,
        data: newData,
        errors,
        isValid: Object.keys(errors).length === 0,
      };
    });
  }, [validate]);

  const validateForm = useCallback((): boolean => {
    const errors = validate(formState.data);
    setFormState(prev => ({
      ...prev,
      errors,
      isValid: Object.keys(errors).length === 0,
    }));
    return Object.keys(errors).length === 0;
  }, [formState.data, validate]);

  const reset = useCallback(() => {
    setFormState({
      data: initialData,
      errors: {},
      isSubmitting: false,
      isValid: false,
    });
  }, [initialData]);

  const submit = useCallback(async (onSubmit: (data: T) => Promise<void>) => {
    if (!validateForm()) {
      return;
    }

    setFormState(prev => ({ ...prev, isSubmitting: true }));

    try {
      await onSubmit(formState.data);
      logger.userAction('Form submitted successfully', { form: typeof formState.data });
    } catch (error) {
      const appError = handleError(error, { component: 'FormState', action: 'submit' });
      logger.error('Form submission failed', appError);
      throw appError;
    } finally {
      setFormState(prev => ({ ...prev, isSubmitting: false }));
    }
  }, [formState.data, validateForm]);

  return {
    formState,
    updateField,
    validateForm,
    reset,
    submit,
  };
}

// === SAFE STORAGE HOOK ===
function useSafeStorage<T>(
  key: string,
  defaultValue: T,
  serializer: {
    parse: (value: string) => T;
    stringify: (value: T) => string;
  } = JSON
): [T, (value: T) => void, () => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? serializer.parse(item) : defaultValue;
    } catch (error) {
      logger.warn('Failed to parse stored value', { key, error });
      return defaultValue;
    }
  });

  const setValue = useCallback((value: T) => {
    try {
      setState(value);
      localStorage.setItem(key, serializer.stringify(value));
    } catch (error) {
      logger.error('Failed to store value', handleError(error), { key, value });
    }
  }, [key, serializer]);

  const removeValue = useCallback(() => {
    try {
      setState(defaultValue);
      localStorage.removeItem(key);
    } catch (error) {
      logger.error('Failed to remove stored value', handleError(error), { key });
    }
  }, [key, defaultValue]);

  return [state, setValue, removeValue];
}

// === DEBOUNCED STATE HOOK ===
function useDebouncedState<T>(
  initialValue: T,
  delay: number = 300
): [T, T, (value: T) => void] {
  const [immediateValue, setImmediateValue] = useState<T>(initialValue);
  const [debouncedValue, setDebouncedValue] = useState<T>(initialValue);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const setValue = useCallback((value: T) => {
    setImmediateValue(value);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
  }, [delay]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return [immediateValue, debouncedValue, setValue];
}

// === PREVIOUS VALUE HOOK ===
function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  
  useEffect(() => {
    ref.current = value;
  });
  
  return ref.current;
}

// === FORCE UPDATE HOOK ===
function useForceUpdate(): () => void {
  const [, setState] = useState({});
  return useCallback(() => setState({}), []);
}

// === SAFE EFFECT HOOK ===
function useSafeEffect(
  effect: () => void | (() => void),
  deps?: React.DependencyList,
  componentName?: string
): void {
  useEffect(() => {
    try {
      return effect();
    } catch (error) {
      logger.error(
        `Effect error in ${componentName || 'unknown component'}`,
        handleError(error),
        { component: componentName }
      );
    }
  }, deps);
}

// === INTERVAL HOOK ===
function useInterval(callback: () => void, delay: number | null): void {
  const savedCallback = useRef<() => void>();

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;

    const tick = () => {
      if (savedCallback.current) {
        savedCallback.current();
      }
    };

    const id = setInterval(tick, delay);
    return () => clearInterval(id);
  }, [delay]);
}

// === TIMEOUT HOOK ===
function useTimeout(callback: () => void, delay: number | null): void {
  const savedCallback = useRef<() => void>();

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;

    const id = setTimeout(() => {
      if (savedCallback.current) {
        savedCallback.current();
      }
    }, delay);

    return () => clearTimeout(id);
  }, [delay]);
}

// === COMPONENT STATE TRACKER ===
function useComponentLifecycle(componentName: string) {
  const componentLogger = logger.createComponentLogger(componentName);

  useEffect(() => {
    componentLogger.debug('Component mounted');
    return () => {
      componentLogger.debug('Component unmounted');
    };
  }, [componentLogger]);

  const logRender = useCallback((props?: Record<string, unknown>) => {
    componentLogger.debug('Component rendered', props);
  }, [componentLogger]);

  const logStateChange = useCallback((from: string, to: string) => {
    componentLogger.stateChange(from, to);
  }, [componentLogger]);

  const logUserAction = useCallback((action: string, data?: Record<string, unknown>) => {
    componentLogger.info('User action: ' + action, data);
  }, [componentLogger]);

  return {
    logRender,
    logStateChange,
    logUserAction,
  };
}

// === EXPORT ALL HOOKS ===
export {
  useAsyncState,
  useFormState,
  useSafeStorage,
  useDebouncedState,
  usePrevious,
  useForceUpdate,
  useSafeEffect,
  useInterval,
  useTimeout,
  useComponentLifecycle,
};