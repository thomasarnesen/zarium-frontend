import { create } from 'zustand';
import api from '../utils/api';
import csrfService from './csrfService';
interface User {
  id: number;
  email: string;
  planType: 'Demo' | 'Basic' | 'Plus' | 'Pro';  
  tokens?: number;
  token: string;
  subscription?: {
    plan_type: string;
    status: string;
    end_date?: string; 
  };
  generationsCount?: number;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isDemoMode: boolean;
  planType: 'Demo' | 'Basic' | 'Plus' | 'Pro' | null;  
  tokens: number;
  isDemoUser: boolean;
  generationsCount: number;
  enhancedMode: boolean;
 
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, planType?: 'Demo' | 'Basic' | 'Plus' | 'Pro') => Promise<void>;
  logout: () => Promise<void>;
  enableDemoMode: (selectedPlan: 'Basic' | 'Plus' | 'Pro') => void;
  disableDemoMode: () => void;
  useTokens: (amount: number) => boolean;
  setUser: (user: User | null) => void;
  refreshUserData: () => Promise<boolean>;
  toggleEnhancedMode: () => void;
  initialize: () => Promise<void>;  // Ny funksjon
}

export const useAuthStore = create<AuthState>((set, get) => ({

  user: null,
  isAuthenticated: false,
  isDemoMode: false,
  planType: null,
  tokens: 0,
  isDemoUser: false,
  generationsCount: 0,
  enhancedMode: false,

  refreshUserData: async () => {
    try {
      console.log("Refreshing user data...");
      
      const tokenResponse = await api.fetch('/verify-token', {
        credentials: 'include' 
      });
      
      if (!tokenResponse.ok) {
        // Hvis token er ugyldig, behold brukerdata men prøv å fornye token
        try {
          const refreshResponse = await api.fetch('/refresh-token', {
            method: 'POST',
            credentials: 'include'
          });
          
          if (!refreshResponse.ok) {
            throw new Error('Could not refresh session');
          }
          
          // Fortsett med oppdatering av brukerdata med ny token
          const userData = await refreshResponse.json();
          set({ user: userData });
        } catch (error) {
          console.error('Session refresh failed:', error);
          return false;
        }
      }
      
      const userData = await tokenResponse.json();
      
      // Oppdater brukerdata men behold token
      set(state => ({ 
        user: { 
          ...userData,
          token: state.user?.token // Behold eksisterende token
        }, 
        isAuthenticated: true,
        tokens: userData.tokens || 0,
        planType: userData.planType,
        isDemoUser: userData.planType === 'Demo',
      }));
      
      return true;
    } catch (error) {
      console.error('Error refreshing user data:', error);
      return false;
    }
  },

  setUser: (user) => {
    
    set({
      user,
      isAuthenticated: !!user,
      planType: user?.planType || null,
      tokens: user?.tokens || 0
    });
    // Lagre i localStorage hvis bruker er logget inn, eller fjern hvis logget ut
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  },

  login: async (email: string, password: string) => {
    try {
      console.log("🚀 Attempting to log in...");
      
      const response = await api.fetch('/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      const userData = await response.json();
      console.log("✅ User data received");
      
      get().setUser(userData);
    } catch (error) {
      console.error('❌ Login error:', error);
      throw error;
    }
  },

  register: async (email: string, password: string, planType = 'Basic') => {
    try {
        const response = await api.fetch('/register', {
            method: 'POST',
            body: JSON.stringify({ 
                email, 
                password,
                plan_type: planType 
            }),
        });
     
        const data = await response.json();
     
        if (!response.ok) {
            throw new Error(data.error || 'Registration failed');
        }
     
       
        await get().login(email, password);
     
    } catch (error) {
        console.error('Registration error:', error);
        throw error;
    }
  },

  logout: async () => {
    try {
      
      await api.fetch('/logout', {
        method: 'POST',
      });
      
      
      csrfService.resetToken();
      
      get().setUser(null);
      set({
        isDemoMode: false,
        planType: null,
        tokens: 0
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  },

 
  enableDemoMode: (selectedPlan) => set({
    isDemoMode: true,
    planType: selectedPlan,
    tokens: selectedPlan === 'Basic' ? 100000 : selectedPlan === 'Plus' ? 300000 : 1000000
  }),

  disableDemoMode: () => set({
    isDemoMode: false,
    planType: null,
    tokens: 0
  }),

  useTokens: (amount) => {
    const { tokens } = get();
    if (tokens >= amount) {
      set({ tokens: tokens - amount });
      return true;
    }
    return false;
  },

  toggleEnhancedMode: () => set((state) => ({ enhancedMode: !state.enhancedMode })),

  initialize: async () => {
    // Prøv å hente bruker fra localStorage først
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      set({ user: JSON.parse(savedUser) });
      
      // Verifiser token med backend
      try {
        const response = await api.fetch('/verify-token');
        const userData = await response.json();
        set({ user: userData });
      } catch (error) {
        // Hvis token er ugyldig, logg ut bruker
        set({ user: null });
        localStorage.removeItem('user');
      }
    }
  }
}));