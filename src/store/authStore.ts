import { create } from 'zustand';
import api from '../utils/api';
import csrfService from './csrfService';

declare global {
  interface Window {
    tokenRefreshInterval?: NodeJS.Timeout;
    lastAuthError?: string;
    lastTokenRefresh?: number;
  }
}

interface User {
  id: number;
  email: string;
  planType: 'Demo' | 'Basic' | 'Plus' | 'Pro';  
  tokens?: number;
  isAdmin?: boolean; 
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
  createdAt?: number; // Timestamp when registration was created
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
  isRefreshing: boolean;
  lastRefreshTime: number;
  isLoading: boolean;
  lastError: string | null; // Track the last error for better user feedback
 
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
  forceRefreshUserData: () => Promise<boolean>; // New method to force a refresh regardless of timing
  toggleEnhancedMode: () => void;
  initialize: () => Promise<void>;
  completeRegistrationAfterPayment: (email: string) => Promise<boolean>;
  setupTokenRefreshInterval: () => void;
  clearError: () => void; // Method to clear last error
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
  isRefreshing: false,
  lastRefreshTime: 0,
  isLoading: true,
  lastError: null,

  clearError: () => {
    set({ lastError: null });
    window.lastAuthError = undefined;
  },

  refreshUserData: async () => {
    // Prevent multiple concurrent refresh calls
    if (get().isRefreshing) {
      console.log("Already refreshing user data, skipping...");
      return true;
    }
    
    // Check if refresh was called too recently (minimum 3 seconds between refreshes)
    const now = Date.now();
    if (now - get().lastRefreshTime < 3000) {
      console.log("Skipping refresh - too soon since last refresh");
      return true;
    }

    return get().forceRefreshUserData();
  },

  forceRefreshUserData: async () => {
    const now = Date.now();
    try {
      set({ isRefreshing: true, lastRefreshTime: now });
      console.log("Refreshing user data...");
      
      // Store the time of last refresh attempt globally
      window.lastTokenRefresh = now;
      
      // First try refreshing the token to ensure we have a valid session
      try {
        await api.fetch('/refresh-token', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        });
      } catch (error) {
        console.warn('Token refresh during data refresh failed:', error);
        // Continue anyway to try to get data
      }

      // Use Promise.allSettled to handle failures gracefully
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
          isAdmin: userData.isAdmin
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
            isDemoUser: userData.planType === 'Demo',
            lastError: null // Clear any previous error
          });
        } else {
          set({ 
            user: updatedUser,
            isAuthenticated: true,
            tokens: userData.tokens || 0,
            planType: userData.planType,
            isDemoUser: userData.planType === 'Demo',
            lastError: null // Clear any previous error
          });
        }
        
        return true;
      }
      
      // If we reach here, we couldn't get user data
      return false;
    } catch (error: any) {
      console.error('Error refreshing user data:', error);
      
      // Store the error for potential display
      set({ lastError: error.message || 'Failed to refresh user data' });
      window.lastAuthError = error.message || 'Failed to refresh user data';
      
      return false;
    } finally {
      set({ isRefreshing: false });
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
        isAdmin: user.isAdmin,
      };
      
      try {
        localStorage.setItem('authUser', JSON.stringify(authData));
        localStorage.setItem('isAuthenticated', 'true');
      } catch (e) {
        console.error('Error saving auth data to localStorage:', e);
      }
    } else {
      try {
        localStorage.removeItem('authUser');
        localStorage.removeItem('isAuthenticated');
      } catch (e) {
        console.error('Error clearing auth data from localStorage:', e);
      }
    }
    
    set({
      user,
      isAuthenticated: !!user,
      planType: user?.planType || null,
      tokens: user?.tokens || 0,
      isDemoUser: user?.planType === 'Demo',
      lastError: null // Clear any error on successful user update
    });
  },

  login: async (email: string, password: string) => {
    try {
      set({ isLoading: true }); // Start loading
      console.log("🔄 Starting login process...");
      
      // Clear any previous errors
      set({ lastError: null });
      
      // Ensure we have a CSRF token before proceeding
      let csrfHeaders;
      try {
        console.log("🔒 Obtaining CSRF token...");
        // Force a fresh token fetch
        csrfService.resetToken();
        const token = await csrfService.getToken();
        csrfHeaders = { 'X-CSRF-Token': token };
        console.log("🔑 CSRF token obtained successfully");
      } catch (csrfError: any) {
        console.error("❌ Failed to obtain CSRF token:", csrfError);
        
        // Store error for potential display
        const errorMsg = "Unable to secure your login. Please refresh the page and try again.";
        set({ lastError: errorMsg });
        window.lastAuthError = errorMsg;
        
        throw new Error(errorMsg);
      }
      
      console.log("📤 Sending login request with CSRF protection...");
      const response = await api.fetch('/login', {
        method: 'POST',
        headers: {
          ...csrfHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        body: JSON.stringify({ email, password }),
      });
  
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Authentication failed" }));
        const errorMsg = errorData.error || "Authentication failed";
        
        // Store error for potential display
        set({ lastError: errorMsg });
        window.lastAuthError = errorMsg;
        
        throw new Error(errorMsg);
      }
  
      const userData = await response.json();
      console.log("✅ Login successful");
      
      // Set user data
      get().setUser(userData);
      
      // Clear flags and reset state
      localStorage.removeItem('manualLogout'); // Clear any previous logout flag
      
      // Clear any pending registration since we're now logged in
      localStorage.removeItem('pendingRegistration');
      sessionStorage.removeItem('pendingRegistration');
      set({ pendingRegistration: null });
      
      // Set up token refresh interval if not already set
      get().setupTokenRefreshInterval();
      set({ isLoading: false }); // End loading
    } catch (error: any) {
      set({ isLoading: false }); // End loading on error
      console.error('❌ Login error:', error);
      
      // Ensure the error is available for components
      if (!get().lastError) {
        set({ lastError: error.message || 'Authentication failed' });
        window.lastAuthError = error.message || 'Authentication failed';
      }
      
      throw error;
    }
  },

  register: async (email: string, password: string, planType = 'Basic') => {
    try {
      set({ lastError: null }); // Clear any previous errors
      
      const pendingData: PendingRegistration = {
        email,
        password,
        planType,
        verificationCompleted: false,
        createdAt: Date.now() // Add timestamp
      };
      
      // Store in both sessionStorage and state
      try {
        sessionStorage.setItem('pendingRegistration', JSON.stringify(pendingData));
      } catch (e) {
        console.warn('Failed to store registration data in sessionStorage:', e);
      }
      
      set({ pendingRegistration: pendingData });
      
      console.log("📝 Registration data stored pending verification and payment");
      return;
    } catch (error: any) {
      console.error('Registration preparation error:', error);
      
      // Store error for potential display
      set({ lastError: error.message || 'Failed to prepare registration' });
      window.lastAuthError = error.message || 'Failed to prepare registration';
      
      throw error;
    }
  },
  
  setPendingRegistration: (data) => {
    if (data) {
      try {
        sessionStorage.setItem('pendingRegistration', JSON.stringify(data));
      } catch (e) {
        console.warn('Failed to store registration data in sessionStorage:', e);
      }
    } else {
      try {
        sessionStorage.removeItem('pendingRegistration');
      } catch (e) {
        console.warn('Failed to remove registration data from sessionStorage:', e);
      }
    }
    
    set({ pendingRegistration: data });
  },
  
  markVerificationComplete: () => {
    const current = get().pendingRegistration;
    if (current) {
      const updated = { ...current, verificationCompleted: true };
      
      try {
        sessionStorage.setItem('pendingRegistration', JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to update registration data in sessionStorage:', e);
      }
      
      set({ pendingRegistration: updated });
    }
  },
  
  completeRegistrationAfterPayment: async (email: string) => {
    let pendingData: PendingRegistration | null = null;
    
    try {
      set({ lastError: null }); // Clear previous errors
      
      // Try to get the pending registration data
      try {
        const pendingDataStr = sessionStorage.getItem('pendingRegistration');
        if (pendingDataStr) {
          pendingData = JSON.parse(pendingDataStr);
        }
      } catch (e) {
        console.warn('Failed to parse pending registration data:', e);
      }
      
      if (!pendingData) {
        console.warn("No pending registration found");
        return false;
      }
      
      // Check for stale registration data (older than 1 hour)
      if (pendingData.createdAt && Date.now() - pendingData.createdAt > 3600000) {
        console.warn("Pending registration is stale (older than 1 hour)");
        set({ pendingRegistration: null });
        sessionStorage.removeItem('pendingRegistration');
        return false;
      }
      
      // If the emails match, try to log in with the stored credentials
      if (pendingData.email === email && pendingData.verificationCompleted) {
        await get().login(pendingData.email, pendingData.password);
        
        // Clear the pending registration data
        sessionStorage.removeItem('pendingRegistration');
        set({ pendingRegistration: null });
        
        return true;
      }
      
      return false;
    } catch (error: any) {
      console.error("Error completing registration after payment:", error);
      
      // Store error for potential display
      set({ lastError: error.message || 'Failed to complete registration' });
      window.lastAuthError = error.message || 'Failed to complete registration';
      
      return false;
    }
  },

  logout: async () => {
    try {
      set({ isLoading: true }); // Start loading
      
      // Set flag for manual logout
      localStorage.setItem('manualLogout', 'true');
      
      // Stop token refresh interval if it exists
      if (window.tokenRefreshInterval) {
        clearInterval(window.tokenRefreshInterval);
        window.tokenRefreshInterval = undefined;
      }
      
      // Call logout endpoint with retry logic
      let logoutSuccess = false;
      try {
        const response = await api.fetch('/logout', {
          method: 'POST',
        });
        logoutSuccess = response.ok;
      } catch (error) {
        console.warn('Logout API call failed:', error);
        // Continue with local logout even if API call fails
      }
      
      // Reset CSRF token
      csrfService.resetToken();
      
      // Remove ALL related items from localStorage
      try {
        localStorage.removeItem('authUser');
        localStorage.removeItem('isAuthenticated');
        sessionStorage.removeItem('pendingRegistration');
      } catch (e) {
        console.warn('Failed to clear storage during logout:', e);
      }
      
      // Remove cookies - with better error handling
      try {
        document.cookie.split(";").forEach(function(c) {
          document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
      } catch (e) {
        console.warn('Failed to clear cookies during logout:', e);
      }
      
      // Reset all auth store states
      get().setUser(null);
      set({
        isDemoMode: false,
        planType: null,
        tokens: 0,
        isAuthenticated: false,
        pendingRegistration: null,
        isLoading: false,
        lastError: null // Clear any previous errors
      });
      
      // Force an update of components that depend on authentication status
      try {
        window.dispatchEvent(new Event('auth-changed'));
      } catch (e) {
        console.warn('Failed to dispatch auth-changed event:', e);
      }
      
      return; // Successfully logged out
    } catch (error: any) {
      set({ isLoading: false }); // End loading on error
      console.error('Logout error:', error);
      
      // Store error for potential display
      set({ lastError: error.message || 'Failed to log out' });
      window.lastAuthError = error.message || 'Failed to log out';
      
      // Even if there's an error, ensure the user is logged out locally
      get().setUser(null);
      set({
        isDemoMode: false,
        planType: null,
        tokens: 0,
        isAuthenticated: false,
        pendingRegistration: null,
        isLoading: false
      });
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

  setupTokenRefreshInterval: () => {
    // Clear any existing interval first
    if (window.tokenRefreshInterval) {
      clearInterval(window.tokenRefreshInterval);
      window.tokenRefreshInterval = undefined;
    }
    
    // Set up a new interval (every 10 minutes)
    window.tokenRefreshInterval = setInterval(() => {
      // Only refresh if we're still authenticated
      if (get().isAuthenticated) {
        // Check if a refresh has already happened recently from somewhere else
        const lastRefresh = window.lastTokenRefresh || 0;
        const now = Date.now();
        
        if (now - lastRefresh > 60000) { // Only refresh if it's been at least 1 minute
          get().refreshUserData();
        } else {
          console.log('Skipping scheduled refresh - a refresh happened recently');
        }
      } else {
        // Clear the interval if we're no longer authenticated
        if (window.tokenRefreshInterval) {
          clearInterval(window.tokenRefreshInterval);
          window.tokenRefreshInterval = undefined;
        }
      }
    }, 10 * 60 * 1000); // 10 minutes
  },

  initialize: async () => {
    try {
      set({ isLoading: true, lastError: null }); // Clear previous errors
      
      // Check for stored authentication data
      let storedAuth;
      let isAuthenticated = false;
      
      try {
        storedAuth = localStorage.getItem('authUser');
        isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
      } catch (e) {
        console.warn('Failed to read from localStorage during initialization:', e);
      }
      
      // Check for pending registration
      try {
        const pendingRegistrationStr = sessionStorage.getItem('pendingRegistration');
        if (pendingRegistrationStr) {
          const pendingData = JSON.parse(pendingRegistrationStr);
          
          // Check if registration data is stale (older than 1 hour)
          if (pendingData.createdAt && Date.now() - pendingData.createdAt > 3600000) {
            console.warn("Removing stale pending registration");
            sessionStorage.removeItem('pendingRegistration');
          } else {
            set({ pendingRegistration: pendingData });
          }
        }
      } catch (e) {
        console.warn('Failed to parse pending registration data:', e);
        try {
          sessionStorage.removeItem('pendingRegistration');
        } catch (e2) {
          console.warn('Failed to remove invalid pending registration data:', e2);
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
          
          // Do a single refresh at startup
          try {
            const refreshResponse = await api.fetch('/refresh-token', {
              method: 'POST',
              credentials: 'include',
              headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache'
              }
            });
            
            if (refreshResponse.ok) {
              console.log("✅ Token refreshed on app start");
              window.lastTokenRefresh = Date.now();
              
              // Now get updated user data
              const response = await api.fetch('/verify-token');
              if (response.ok) {
                const userData = await response.json();
                
                // Update with fresh data but keep token
                set({ 
                  user: {
                    ...userData,
                    token: authData.token,
                    isAdmin: userData.isAdmin
                  },
                  tokens: userData.tokens || 0,
                  planType: userData.planType,
                  isDemoUser: userData.planType === 'Demo'
                });
              }
              
              // Set up regular token refresh interval
              get().setupTokenRefreshInterval();
            } else {
              console.warn("❌ Token refresh failed on app start");
              // If token refresh fails but we have stored auth data, 
              // still set up refresh interval to try again later
              get().setupTokenRefreshInterval();
            }
          } catch (error) {
            console.warn('Failed to refresh authentication on startup:', error);
            // Keep using stored data without refreshing
            // Still set up refresh interval to try again later
            get().setupTokenRefreshInterval();
          }
        } catch (error) {
          console.error('Failed to parse stored authentication data:', error);
          
          // Clear invalid data
          try {
            localStorage.removeItem('authUser');
            localStorage.removeItem('isAuthenticated');
          } catch (e) {
            console.warn('Failed to clear invalid auth data:', e);
          }
        }
      }
      
      set({ isLoading: false }); // Set isLoading to false when we're done
    } catch (error: any) {
      console.error('Error initializing auth state:', error);
      
      // Store error for potential display
      set({ 
        user: null,
        isAuthenticated: false,
        isLoading: false,
        lastError: error.message || 'Failed to initialize authentication'
      });
      
      window.lastAuthError = error.message || 'Failed to initialize authentication';
    }
  }
}));