const isDevelopment = import.meta.env.MODE === 'development' || window.location.hostname === 'localhost';

export const config = {
  apiUrl: isDevelopment
    ? 'http://localhost:8000'
    : 'https://zarium-app-ddbnb4egcpf4e6b0.westeurope-01.azurewebsites.net',
  stripePublicKey: import.meta.env.VITE_STRIPE_PUBLIC_KEY,
  environment: import.meta.env.MODE,
  apiTimeout: 30000,
  b2c: {
    tenantName: 'zarium', 
    policyName: 'B2C_1_signup_signin', 
    clientId: '279cccfd-a2d6-4149-90d2-311cf5db1f35', 
  }
};

console.log('🔧 Application configuration:', {
  apiUrl: config.apiUrl,
  environment: config.environment,
  isDevelopment
});