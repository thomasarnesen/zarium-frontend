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
  initialize: () => Promise<void>; 
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
      
      // First try refreshing the token to ensure we have a valid session
      try {
        await api.fetch('/refresh-token', {
          method: 'POST',
          credentials: 'include',
        });
      } catch (error) {
        console.warn('Token refresh during data refresh failed:', error);
        // Continue anyway to try to get data
      }

      const [tokenResponse, tokenInfoResponse] = await Promise.allSettled([
        api.fetch('/verify-token'),
        api.fetch('/user/tokens')
      ]);

      if (tokenResponse.status === 'fulfilled' && tokenResponse.value.ok) {
        const userData = await tokenResponse.value.json();
        
        // Update localStorage with latest user data
        const authUser = JSON.parse(localStorage.getItem('authUser') || '{}');
        
        const updatedUser = {
          ...userData,
          token: authUser.token || userData.token,
        };
        
        localStorage.setItem('authUser', JSON.stringify(updatedUser));
        localStorage.setItem('isAuthenticated', 'true');
        
        // Update state
        if (tokenInfoResponse.status === 'fulfilled' && tokenInfoResponse.value.ok) {
          const tokenData = await tokenInfoResponse.value.json();
          
          set({ 
            user: updatedUser,
            isAuthenticated: true,
            tokens: tokenData.current_tokens || userData.tokens || 0,
            planType: userData.planType,
            isDemoUser: userData.planType === 'Demo'
          });
        } else {
          set({ 
            user: updatedUser,
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
      const authData = {
        id: user.id,
        email: user.email,
        planType: user.planType,
        tokens: user.tokens,
        token: user.token,
      };
      
      localStorage.setItem('authUser', JSON.stringify(authData));
      localStorage.setItem('isAuthenticated', 'true');
    } else {
      localStorage.removeItem('authUser');
      localStorage.removeItem('isAuthenticated');
    }
    
    set({
      user,
      isAuthenticated: !!user,
      planType: user?.planType || null,
      tokens: user?.tokens || 0,
      isDemoUser: user?.planType === 'Demo'
    });
  },

  login: async (email: string, password: string) => {
    try {
      console.log("🚀 Attempting to log in...");
      
      // Sørg for at CSRF-token er hentet
      await csrfService.getToken();
      
      const csrfHeaders = await csrfService.getHeaders();
      console.log("CSRF headers for login:", csrfHeaders);
      
      const response = await api.fetch('/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
        headers: csrfHeaders,
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
    // Check for stored authentication data
    const storedAuth = localStorage.getItem('authUser');
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    
    if (storedAuth && isAuthenticated) {
      try {
        const authData = JSON.parse(storedAuth);
        
        // Set initial user data from localStorage
        set({
          user: authData,
          isAuthenticated: true,
          planType: authData.planType,
          tokens: authData.tokens || 0,
          isDemoUser: authData.planType === 'Demo'
        });
        
        // Then try to verify and refresh the token
        try {
          const refreshResponse = await api.fetch('/refresh-token', {
            method: 'POST',
            credentials: 'include'
          });
          
          if (refreshResponse.ok) {
            console.log("✅ Token refreshed on app start");
            
            // Now get updated user data
            const response = await api.fetch('/verify-token');
            if (response.ok) {
              const userData = await response.json();
              
              // Update with fresh data but keep token
              set({ 
                user: {
                  ...userData,
                  token: authData.token
                },
                tokens: userData.tokens || 0,
                planType: userData.planType,
                isDemoUser: userData.planType === 'Demo'
              });
            }
          }
        } catch (error) {
          console.warn('Failed to refresh authentication on startup:', error);
          // Keep using stored data without refreshing
        }
      } catch (error) {
        console.error('Failed to parse stored authentication data:', error);
        localStorage.removeItem('authUser');
        localStorage.removeItem('isAuthenticated');
      }
    }
  }
}));