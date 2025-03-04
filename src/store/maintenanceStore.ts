import { create } from 'zustand';

interface MaintenanceState {
  isMaintenanceMode: boolean;
  setMaintenanceMode: (mode: boolean) => void;
}

export const useMaintenanceStore = create<MaintenanceState>((set) => ({
  isMaintenanceMode: false, 
  setMaintenanceMode: (mode) => set({ isMaintenanceMode: mode }),
}));