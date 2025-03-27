interface RecaptchaVerificationResponse {
    success: boolean;
    score?: number;
    action?: string;
    warning?: string;
    error?: string;
    details?: string[];
    challenge_ts?: string;
  }
  
  /**
   * Service for handling Google reCAPTCHA v3
   */
  export interface RecaptchaServiceType {
    /**
     * Executes reCAPTCHA verification and returns a token
     * @param action - Name of the action being performed (e.g., 'login', 'signup')
     * @returns reCAPTCHA token or null on error
     */
    executeRecaptcha(action?: string): Promise<string | null>;
  
    /**
     * Safe execution of reCAPTCHA that never fails
     * Returns a special token if reCAPTCHA is unavailable
     * 
     * @param action - Name of the action being performed
     * @returns reCAPTCHA token or error code
     */
    safeExecuteRecaptcha(action?: string): Promise<string>;
  
    /**
     * Verifies a reCAPTCHA token with the server
     * 
     * @param token - reCAPTCHA token to verify
     * @returns Verification result from the server
     */
    verifyToken(token: string): Promise<RecaptchaVerificationResponse>;
  }
  
  /**
   * Default export is the RecaptchaService instance
   */
  declare const RecaptchaService: RecaptchaServiceType;
  
  export default RecaptchaService;