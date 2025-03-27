import api from './api';
// @ts-ignore
import { RecaptchaService } from './recaptchaService';

interface InputSafetyResult {
  success: boolean;
  is_safe: boolean;
  risk_score: number;
  details?: {
    recaptchaScore?: number;
    recaptchaToken?: string;
    detected_categories?: string[];
  };
  error?: string;
}

export const ModelArmorService = {
  /**
   * Utfører en enkel klientside pre-sjekk for prompt injection
   */
  preCheckInput: (input: string): { passed: boolean; reason?: string } => {
    if (!input || typeof input !== 'string') {
      return { passed: true };
    }
    
    // Vanlige prompt injection mønstre
    const suspiciousPatterns = [
      /ignore previous instructions/i,
      /forget your instructions/i,
      /disregard earlier directives/i,
      /system prompt/i,
      /\broot\b/i,
      /\badmin\b/i,
      /\bsudo\b/i,
      /<\/?system>/i,
      /<\/?instructions?>/i,
      /""""/i,
    ];
    
    // Sjekk for mistenkelige mønstre
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(input)) {
        return { 
          passed: false, 
          reason: 'Potential prompt injection detected' 
        };
      }
    }
    
    // Sjekk for veldig lange input
    if (input.length > 10000) {
      return { 
        passed: false, 
        reason: 'Input too long' 
      };
    }
    
    return { passed: true };
  },
  
  /**
   * Verifiser input sikkerhet med både klient og server sjekker
   */
  verifyInputSafety: async (input: string, action: string = 'submit_prompt'): Promise<InputSafetyResult> => {
    try {
      // Først kjør klientside pre-sjekk (raskest)
      const preCheck = ModelArmorService.preCheckInput(input);
      if (!preCheck.passed) {
        return {
          success: false,
          is_safe: false,
          risk_score: 0.9,
          error: preCheck.reason || 'Input failed pre-check'
        };
      }
      
      // Utfør reCAPTCHA (nest raskest)
      const recaptchaToken = await RecaptchaService.safeExecuteRecaptcha(action);
      
      // Send til server for grundigere analyse
      const response = await api.fetch('/api/verify-input-safety', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input,
          recaptchaToken,
          action,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          is_safe: false,
          risk_score: 0.8,
          error: errorData.error || 'Security check failed'
        };
      }
      
      const result = await response.json();
      
      // Legg til reCAPTCHA token i resultatet for gjenbruk
      if (result.success && result.is_safe) {
        if (!result.details) result.details = {};
        result.details.recaptchaToken = recaptchaToken;
      }
      
      return result;
    } catch (error) {
      console.error('Input safety verification error:', error);
      return {
        success: false,
        is_safe: false,
        risk_score: 0.7,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
};

export default ModelArmorService;