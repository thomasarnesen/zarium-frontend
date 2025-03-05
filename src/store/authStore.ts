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
      const [tokenResponse, tokenInfoResponse] = await Promise.allSettled([
        api.fetch('/verify-token'),
        api.fetch('/user/tokens')
      ]);

      if (tokenResponse.status === 'fulfilled' && tokenResponse.value.ok) {
        const userData = await tokenResponse.value.json();
        
        if (tokenInfoResponse.status === 'fulfilled' && tokenInfoResponse.value.ok) {
          const tokenData = await tokenInfoResponse.value.json();
          
          set({ 
            user: { ...userData },
            isAuthenticated: true,
            tokens: tokenData.current_tokens || userData.tokens || 0,
            planType: userData.planType,
            isDemoUser: userData.planType === 'Demo'
          });
        } else {
          set({ 
            user: { ...userData },
            isAuthenticated: true,
            tokens: userData.tokens || 0,
            planType: userData.planType,
            isDemoUser: userData.planType === 'Demo'
          });
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error refreshing user data:', error);
      return false;
    }
  },

  setUser: (user) => {
    if (user) {
      // Lagre all brukerdata i localStorage
      localStorage.setItem('authUser', JSON.stringify({
        id: user.id,
        email: user.email,
        planType: user.planType,
        tokens: user.tokens,
        token: user.token,
        isAuthenticated: true
      }));
    } else {
      localStorage.removeItem('authUser');
    }
    
    set({
      user,
      isAuthenticated: !!user,
      planType: user?.planType || null,
      tokens: user?.tokens || 0
    });
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
    try {
      // Hent lagret brukerdata
      const storedAuth = localStorage.getItem('authUser');
      if (storedAuth) {
        const authData = JSON.parse(storedAuth);
        
        // Verifiser token med backend
        const response = await api.fetch('/verify-token', {
          method: 'POST',
          credentials: 'include'
        });

        if (response.ok) {
          const userData = await response.json();
          // Oppdater med fersk data fra backend, men behold token
          set({
            user: {
              ...userData,
              token: authData.token
            },
            isAuthenticated: true,
            planType: userData.planType,
            tokens: userData.tokens,
            isDemoUser: userData.planType === 'Demo'
          });
        } else {
          // Hvis token er ugyldig, prøv å fornye
          const refreshResponse = await api.fetch('/refresh-token', {
            method: 'POST',
            credentials: 'include'
          });

          if (refreshResponse.ok) {
            const refreshedData = await refreshResponse.json();
            set({
              user: {
                ...refreshedData,
                token: authData.token
              },
              isAuthenticated: true,
              planType: refreshedData.planType,
              tokens: refreshedData.tokens,
              isDemoUser: refreshedData.planType === 'Demo'
            });
          } else {
            // Hvis refresh feiler, logg ut
            get().logout();
          }
        }
      }
    } catch (error) {
      console.error('Error initializing auth state:', error);
      // Ikke logg ut automatisk ved feil, la brukeren prøve på nytt
    }
  }
}));