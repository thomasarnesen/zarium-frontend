import { create } from 'zustand';
import api from '../utils/api';
import csrfService from './csrfService';
import { config } from '../config';

declare global {
  interface Window {
    tokenRefreshInterval?: NodeJS.Timeout; // Updated to proper timeout type
  }
}

interface User {
  id: number;
  email: string;
  planType: 'Demo' | 'Basic' | 'Plus' | 'Pro';  
  tokens?: number;
  isAdmin?: boolean; 
  token: string;
  displayName?: string;  // Added displayName property
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
  isRefreshing: boolean; // Added to track refresh state
  lastRefreshTime: number; // Added to track timing
  failedRefreshCount: number; // Added to track refresh failures
  lastFailureTime: number; // Added to track last failure time
 
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, planType?: 'Demo' | 'Basic' | 'Plus' | 'Pro', displayName?: string) => Promise<void>;
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
  setupTokenRefreshInterval: () => void; // Added to interface
  getAuthHeaders: () => Record<string, string>; // New function
  checkSession: () => Promise<boolean>; // New function
  updateDisplayName: (displayName: string) => Promise<boolean>; // New function for updating display name
  getAuthToken: () => string | null; // Added new method for getting auth token
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
  isRefreshing: false, // New state to prevent concurrent refreshes
  lastRefreshTime: 0, // New state to track when refreshes happen
  failedRefreshCount: 0, // New state to track refresh failures
  lastFailureTime: 0, // New state to track last failure time

  refreshUserData: async () => {
    // Prevent multiple concurrent refresh calls
    if (get().isRefreshing) {
      console.log("Already refreshing user data, skipping...");
      return true;
    }
    
    // Check if refresh was called too recently (minimum 2 seconds between refreshes)
    const now = Date.now();
    if (now - get().lastRefreshTime < 2000) {
      console.log("Skipping refresh - too soon since last refresh");
      return true;
    }

    // Add special handling for Safari/iOS
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent) || 
                   /iphone|ipad|ipod/i.test(navigator.userAgent);
                   
    if (isSafari) {
      console.log("Using Safari-specific refresh method");
      try {
        // Use the special Safari method
        const result = await api.refreshTokenSafari();
        
        if (result) {
          // Update state with the fresh data
          set({ 
            user: { ...result },
            isAuthenticated: true,
            tokens: result.tokens || 0,
            planType: result.planType,
            isDemoUser: result.planType === 'Demo'
          });
          
          return true;
        }
      } catch (safariError) {
        console.error("Safari refresh method failed:", safariError);
      }
    }

    // Add backoff mechanism for failed refreshes
    const { failedRefreshCount, lastFailureTime } = get();
    if (failedRefreshCount > 0) {
      // Exponential backoff: wait longer between attempts based on failure count
      const backoffTime = Math.min(30000, 1000 * Math.pow(2, failedRefreshCount - 1)); 
      if (now - lastFailureTime < backoffTime) {
        console.log(`Skipping refresh - in backoff period (${Math.round((backoffTime - (now - lastFailureTime))/1000)}s remaining)`);
        return false;
      }
    }
    
    // Continue with regular flow if Safari method failed or not needed
    try {
      set({ isRefreshing: true, lastRefreshTime: now });
      console.log("Refreshing user data...");
      
      // First try refreshing the token to ensure we have a valid session
      try {
        const tokenResponse = await api.fetch('/api/refresh-token', {
          method: 'POST',
          credentials: 'include',
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        });
        
        if (!tokenResponse.ok) {
          // Track this failure and apply backoff strategy
          const currentFailures = get().failedRefreshCount + 1;
          set({ 
            failedRefreshCount: currentFailures, 
            lastFailureTime: Date.now() 
          });

          // If we've failed 3+ times, stop the refresh interval
          if (currentFailures >= 3) {
            console.warn(`Token refresh failed ${currentFailures} times, stopping automatic refreshes`);
            if (window.tokenRefreshInterval) {
              clearInterval(window.tokenRefreshInterval);
              window.tokenRefreshInterval = undefined;
            }
          }

          console.warn("Token refresh failed:", await tokenResponse.text());
          return false; // Return early on token refresh failure
        } else {
          // Reset failure counter on success
          set({ failedRefreshCount: 0 });
        }
      } catch (error) {
        console.warn('Token refresh during data refresh failed:', error);
        set({ 
          failedRefreshCount: get().failedRefreshCount + 1,
          lastFailureTime: Date.now()
        });
        return false; // Return early on token refresh error
      }

      // Get user information with retries
      let attempts = 0;
      const maxAttempts = 2;
      
      while (attempts < maxAttempts) {
        try {
          const tokenResponse = await api.fetch('/api/verify-token', {
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache'
            }
          });

          if (tokenResponse.ok) {
            const userData = await tokenResponse.json();
            
            // Update localStorage with latest user data
            const authUser = JSON.parse(localStorage.getItem('authUser') || '{}');
            
            // Log displayName values for debugging
            console.log("DisplayName from server:", userData.displayName);
            console.log("DisplayName from localStorage:", authUser.displayName);
            
            const updatedUser = {
              ...userData,
              token: authUser.token || userData.token,
              isAdmin: userData.isAdmin || authUser.isAdmin,
              // Important: Only use localStorage displayName as fallback
              // Always prioritize server data when available
              displayName: userData.displayName || authUser.displayName
            };
            
            // Log the final displayName value
            console.log("Final displayName after merge:", updatedUser.displayName);
            
            localStorage.setItem('authUser', JSON.stringify(updatedUser));
            localStorage.setItem('isAuthenticated', 'true');
            
            // Also get token information
            try {
              const tokenInfoResponse = await api.fetch('/api/user/tokens', {
                cache: 'no-store',
                headers: {
                  'Cache-Control': 'no-cache, no-store, must-revalidate',
                  'Pragma': 'no-cache'
                }
              });
              
              if (tokenInfoResponse.ok) {
                try {
                  // Modify tokenResponse before JSON parsing
                  const responseText = await tokenInfoResponse.text();
                  
                  // Replace Infinity and NaN with string representation that can be handled by JSON
                  const cleanedJson = responseText
                    .replace(/:Infinity/g, ':"Infinity"')
                    .replace(/:NaN/g, ':"NaN"');
                  
                  let tokenData;
                  try {
                    tokenData = JSON.parse(cleanedJson);
                  } catch (parseError) {
                    console.warn('Error parsing token data JSON:', parseError);
                    // Use a fallback object to prevent failures
                    tokenData = { current_tokens: userData.tokens || 0 };
                  }
                  
                  set({ 
                    user: updatedUser,
                    isAuthenticated: true,
                    tokens: tokenData.current_tokens || userData.tokens || 0,
                    planType: userData.planType,
                    isDemoUser: userData.planType === 'Demo'
                  });
                  
                  // Log successful update
                  console.log("User data updated with server values, displayName:", updatedUser.displayName);
                } catch (e) {
                  // Even if everything fails, still update the user data
                  console.warn('Error processing token response:', e);
                  set({ 
                    user: updatedUser,
                    isAuthenticated: true,
                    tokens: userData.tokens || 0,
                    planType: userData.planType,
                    isDemoUser: userData.planType === 'Demo'
                  });
                }
              } else {
                set({ 
                  user: updatedUser,
                  isAuthenticated: true,
                  tokens: userData.tokens || 0,
                  planType: userData.planType,
                  isDemoUser: userData.planType === 'Demo'
                });
                
                console.log("User data updated without token info, displayName:", updatedUser.displayName);
              }
            } catch (tokenInfoError) {
              console.warn('Error fetching token info:', tokenInfoError);
              set({ 
                user: updatedUser,
                isAuthenticated: true,
                tokens: userData.tokens || 0,
                planType: userData.planType,
                isDemoUser: userData.planType === 'Demo'
              });
              
              console.log("User data updated with auth only, displayName:", updatedUser.displayName);
            }
            
            // Check if welcome page redirection is needed
            const currentUser = get().user;
            if (!currentUser?.displayName || currentUser.displayName === 'unknown') {
              console.log("User missing display name, may need welcome page redirect");
            }
            
            return true;
          }
          
          // If we got a 401/403, increase attempt count and retry after delay
          attempts++;
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (error) {
          console.warn(`Attempt ${attempts + 1} failed:`, error);
          attempts++;
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
      
      // If we've exhausted retries, check if we have local data
      const authUser = localStorage.getItem('authUser');
      if (authUser) {
        try {
          const userData = JSON.parse(authUser);
          set({
            user: userData,
            isAuthenticated: true,
            tokens: userData.tokens || 0,
            planType: userData.planType,
            isDemoUser: userData.planType === 'Demo'
          });
          console.log('Using cached user data due to API failure, displayName:', userData.displayName);
          return true;
        } catch (parseError) {
          console.error('Error parsing cached user data:', parseError);
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error refreshing user data:', error);
      // Track this failure for backoff
      set({ 
        failedRefreshCount: get().failedRefreshCount + 1,
        lastFailureTime: Date.now()
      });
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
        displayName: user.displayName, // Include displayName
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
      
      // Set up token refresh interval if not already set
      get().setupTokenRefreshInterval();
    } catch (error) {
      console.error('❌ Login error:', error);
      throw error;
    }
  },

  register: async (email: string, password: string, planType = 'Basic', displayName = '') => {
    try {
      // IMPORTANT CHANGE: We're now storing the registration data instead of
      // immediately creating the user. The user will be created in the webhook
      // after the Stripe payment is confirmed.
      
      const pendingData = {
        email,
        password,
        planType,
        displayName,
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
        window.tokenRefreshInterval = undefined;
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

  // New helper function to set up token refresh interval
  setupTokenRefreshInterval: () => {
    // Clear any existing interval first
    if (window.tokenRefreshInterval) {
      clearInterval(window.tokenRefreshInterval);
      window.tokenRefreshInterval = undefined;
    }
    
    // Reset failure tracking when setting up a new interval
    set({
      failedRefreshCount: 0,
      lastFailureTime: 0
    });
    
    // Set up a new interval (every 10 minutes)
    window.tokenRefreshInterval = setInterval(() => {
      // Only refresh if we're still authenticated and failure count is acceptable
      const { isAuthenticated, failedRefreshCount } = get();
      
      if (isAuthenticated && failedRefreshCount < 3) {
        get().refreshUserData();
      } else {
        // Clear the interval if we're no longer authenticated or too many failures
        if (window.tokenRefreshInterval) {
          console.log("Stopping token refresh interval - user not authenticated or too many failures");
          clearInterval(window.tokenRefreshInterval);
          window.tokenRefreshInterval = undefined;
        }
      }
    }, 10 * 60 * 1000); // 10 minutes
  },

  initialize: async () => {
    try {
      // Sjekk for lagret autentiseringsdata
      const storedAuth = localStorage.getItem('authUser');
      const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
      
      // Sett midlertidig tilstand for å unngå blokkering
      if (storedAuth && isAuthenticated) {
        try {
          const authData = JSON.parse(storedAuth);
          
          // Sett initiell brukerdata fra localStorage
          set({
            user: authData,
            isAuthenticated: true,
            planType: authData.planType,
            tokens: authData.tokens || 0,
            isDemoUser: authData.planType === 'Demo'
          });
        } catch (parseError) {
          console.warn('Failed to parse stored auth data:', parseError);
        }
      }
      
      // Ikke blokker oppstart, fortsett med å validere i bakgrunnen
      setTimeout(async () => {
        try {
          if (storedAuth && isAuthenticated) {
            const refreshResponse = await api.fetch('/api/refresh-token', {
              method: 'POST',
              credentials: 'include'
            });
            
            if (refreshResponse.ok) {
              const response = await api.fetch('/api/verify-token');
              if (response.ok) {
                const userData = await response.json();
                
                set({ 
                  user: {
                    ...userData,
                    token: JSON.parse(storedAuth).token,
                    isAdmin: userData.isAdmin,
                    displayName: userData.displayName || JSON.parse(storedAuth).displayName
                  },
                  tokens: userData.tokens || 0,
                  planType: userData.planType,
                  isDemoUser: userData.planType === 'Demo'
                });
              }
            }
          }
        } catch (error) {
          console.warn('Background auth refresh failed:', error);
        }
      }, 1000);
    } catch (error) {
      console.error('Error in auth initialize:', error);
    }
  },

  // Add this function to safely get authentication headers for API requests
  getAuthHeaders: () => {
    try {
      const token = get().getAuthToken();
      if (!token) return {} as Record<string, string>;
      
      return {
        'Authorization': `Bearer ${token}`
      };
    } catch (e) {
      console.warn('Error getting auth headers:', e);
      return {} as Record<string, string>;
    }
  },

  // Improve session check function
  checkSession: async () => {
    // Prevent check if manual logout occurred
    if (localStorage.getItem('manualLogout') === 'true') {
      return false;
    }
    
    try {
      // Check both token and verify-token endpoints with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${config.apiUrl}/api/refresh-token`, {
        method: 'POST',
        credentials: 'include',
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        // Reset failure count on successful check
        set({ failedRefreshCount: 0, lastFailureTime: 0 });
        
        // Token was refreshed successfully, now verify it
        await get().refreshUserData();
        return true;
      }
      
      // If session check fails, increment the failure count
      set({ 
        failedRefreshCount: get().failedRefreshCount + 1,
        lastFailureTime: Date.now() 
      });
      
      return false;
    } catch (e) {
      console.warn('Session check failed:', e);
      set({ 
        failedRefreshCount: get().failedRefreshCount + 1,
        lastFailureTime: Date.now() 
      });
      return false;
    }
  },

  // New function to update display name
  updateDisplayName: async (displayName: string) => {
    try {
      if (!displayName.trim()) {
        return false;
      }

      const user = get().user;
      if (!user) {
        return false;
      }

      // Call API to update display name
      const response = await api.fetch('/api/update-display-name', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ displayName: displayName.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update display name');
      }

      // Get updated data from response
      const userData = await response.json();
      
      // Update local storage with new display name
      const storedUser = JSON.parse(localStorage.getItem('authUser') || '{}');
      storedUser.displayName = userData.displayName;
      localStorage.setItem('authUser', JSON.stringify(storedUser));

      // Update state
      set({
        user: {
          ...user,
          displayName: userData.displayName
        }
      });

      return true;
    } catch (error) {
      console.error('Error updating display name:', error);
      return false;
    }
  },

  // Add new method to get auth token
  getAuthToken: () => {
    // First try to get from cookie (standard flow)
    // If that fails, try localStorage as fallback for Safari/iOS
    const storedUser = localStorage.getItem('authUser');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        return userData.token;
      } catch (e) {
        console.warn('Failed to parse stored auth data');
      }
    }
    return null;
  }
}));