import { create } from 'zustand';
import api from '../utils/api';
import csrfService from './csrfService';

declare global {
  interface Window {
    tokenRefreshInterval?: number;
  }
}

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

interface PendingRegistration {
  email: string;
  password: string;
  planType: 'Demo' | 'Basic' | 'Plus' | 'Pro';
  verificationCompleted: boolean;
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
  pendingRegistration: PendingRegistration | null;
 
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, planType?: 'Demo' | 'Basic' | 'Plus' | 'Pro') => Promise<void>;
  setPendingRegistration: (data: PendingRegistration | null) => void;
  markVerificationComplete: () => void;
  logout: () => Promise<void>;
  enableDemoMode: (selectedPlan: 'Basic' | 'Plus' | 'Pro') => void;
  disableDemoMode: () => void;
  useTokens: (amount: number) => boolean;
  setUser: (user: User | null) => void;
  refreshUserData: () => Promise<boolean>;
  toggleEnhancedMode: () => void;
  initialize: () => Promise<void>; 
  completeRegistrationAfterPayment: (email: string) => Promise<boolean>;
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
  pendingRegistration: null,

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
      console.log("🔄 Starting login process...");
      
      // Ensure we have a CSRF token before proceeding
      let csrfHeaders;
      try {
        console.log("🔒 Obtaining CSRF token...");
        // Force a fresh token fetch
        csrfService.resetToken();
        const token = await csrfService.getToken();
        csrfHeaders = { 'X-CSRF-Token': token };
        console.log("🔑 CSRF token obtained successfully");
      } catch (csrfError) {
        console.error("❌ Failed to obtain CSRF token:", csrfError);
        throw new Error("Unable to secure your login. Please refresh the page and try again.");
      }
      
      console.log("📤 Sending login request with CSRF protection...");
      const response = await api.fetch('/login', {
        method: 'POST',
        headers: {
          ...csrfHeaders,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password }),
      });
  
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Authentication failed" }));
        throw new Error(errorData.error || "Authentication failed");
      }
  
      const userData = await response.json();
      console.log("✅ Login successful");
      
      get().setUser(userData);
      localStorage.removeItem('manualLogout'); // Clear any previous logout flag
      
      // Clear any pending registration since we're now logged in
      localStorage.removeItem('pendingRegistration');
      sessionStorage.removeItem('pendingRegistration');
      set({ pendingRegistration: null });
    } catch (error) {
      console.error('❌ Login error:', error);
      throw error;
    }
  },

  register: async (email: string, password: string, planType = 'Basic') => {
    try {
      // IMPORTANT CHANGE: We're now storing the registration data instead of
      // immediately creating the user. The user will be created in the webhook
      // after the Stripe payment is confirmed.
      
      const pendingData = {
        email,
        password,
        planType,
        verificationCompleted: false
      };
      
      // Store in both sessionStorage and state
      sessionStorage.setItem('pendingRegistration', JSON.stringify(pendingData));
      
      set({ pendingRegistration: pendingData });
      
      console.log("📝 Registration data stored pending verification and payment");
      return;
    } catch (error) {
      console.error('Registration preparation error:', error);
      throw error;
    }
  },
  
  setPendingRegistration: (data) => {
    if (data) {
      sessionStorage.setItem('pendingRegistration', JSON.stringify(data));
    } else {
      sessionStorage.removeItem('pendingRegistration');
    }
    set({ pendingRegistration: data });
  },
  
  markVerificationComplete: () => {
    const current = get().pendingRegistration;
    if (current) {
      const updated = { ...current, verificationCompleted: true };
      sessionStorage.setItem('pendingRegistration', JSON.stringify(updated));
      set({ pendingRegistration: updated });
    }
  },
  
  completeRegistrationAfterPayment: async (email: string) => {
    // This function will be called after successful payment
    // At this point, the user should already be created by the webhook
    // We just need to log them in
    
    try {
      // Try to get the pending registration data
      const pendingDataStr = sessionStorage.getItem('pendingRegistration');
      if (!pendingDataStr) {
        console.warn("No pending registration found");
        return false;
      }
      
      const pendingData = JSON.parse(pendingDataStr);
      
      // If the emails match, try to log in with the stored credentials
      if (pendingData.email === email && pendingData.verificationCompleted) {
        await get().login(pendingData.email, pendingData.password);
        
        // Clear the pending registration data
        sessionStorage.removeItem('pendingRegistration');
        set({ pendingRegistration: null });
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("Error completing registration after payment:", error);
      return false;
    }
  },

  logout: async () => {
    try {
      // Set flag for manual logout
      localStorage.setItem('manualLogout', 'true');
      
      // Stop token refresh interval if it exists
      if (window.tokenRefreshInterval) {
        clearInterval(window.tokenRefreshInterval);
        (window as any).tokenRefreshInterval = undefined;
      }
      
      // Call logout endpoint
      await api.fetch('/logout', {
        method: 'POST',
      });
      
      // Reset CSRF token
      csrfService.resetToken();
      
      // Remove ALL related items from localStorage
      localStorage.removeItem('authUser');
      localStorage.removeItem('isAuthenticated');
      sessionStorage.removeItem('pendingRegistration');
      
      // Remove cookies
      document.cookie.split(";").forEach(function(c) {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
      
      // Reset all auth store states
      get().setUser(null);
      set({
        isDemoMode: false,
        planType: null,
        tokens: 0,
        isAuthenticated: false, // Important to set this to false
        pendingRegistration: null
      });
      
      // Force an update of components that depend on authentication status
      window.dispatchEvent(new Event('auth-changed'));
      
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
    
    // Check for pending registration
    const pendingRegistrationStr = sessionStorage.getItem('pendingRegistration');
    if (pendingRegistrationStr) {
      try {
        const pendingData = JSON.parse(pendingRegistrationStr);
        set({ pendingRegistration: pendingData });
      } catch (e) {
        console.warn('Failed to parse pending registration data', e);
        sessionStorage.removeItem('pendingRegistration');
      }
    }
    
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