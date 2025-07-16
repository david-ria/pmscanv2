import { useState } from 'react';

/**
 * Custom hook for managing dialog open/close state
 * Eliminates repetitive useState(false) patterns across dialog components
 */
export const useDialog = (initialOpen = false) => {
  const [open, setOpen] = useState(initialOpen);
  
  const openDialog = () => setOpen(true);
  const closeDialog = () => setOpen(false);
  const toggleDialog = () => setOpen(prev => !prev);
  
  return {
    open,
    setOpen,
    openDialog,
    closeDialog,
    toggleDialog,
    onOpenChange: setOpen
  };
};

/**
 * Hook for managing multiple related dialogs
 * Useful for components with multiple dialog states
 */
export const useDialogs = <T extends Record<string, boolean>>(initialState: T) => {
  const [dialogs, setDialogs] = useState(initialState);
  
  const openDialog = (key: keyof T) => {
    setDialogs(prev => ({ ...prev, [key]: true }));
  };
  
  const closeDialog = (key: keyof T) => {
    setDialogs(prev => ({ ...prev, [key]: false }));
  };
  
  const closeAllDialogs = () => {
    const closedState = Object.keys(dialogs).reduce((acc, key) => ({
      ...acc,
      [key]: false
    }), {} as T);
    setDialogs(closedState);
  };
  
  const toggleDialog = (key: keyof T) => {
    setDialogs(prev => ({ ...prev, [key]: !prev[key] }));
  };
  
  return {
    dialogs,
    openDialog,
    closeDialog,
    closeAllDialogs,
    toggleDialog,
    isOpen: (key: keyof T) => dialogs[key],
    getOnOpenChange: (key: keyof T) => (open: boolean) => 
      setDialogs(prev => ({ ...prev, [key]: open }))
  };
};