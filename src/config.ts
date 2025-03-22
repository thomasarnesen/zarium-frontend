const isDevelopment = import.meta.env.MODE === 'development' || window.location.hostname === 'localhost';

export const config = {
  apiUrl: isDevelopment
    ? 'http://localhost:8000'
    : 'https://zarium-app-ddbnb4egcpf4e6b0.westeurope-01.azurewebsites.net',
  stripePublicKey: import.meta.env.VITE_STRIPE_PUBLIC_KEY,
  environment: import.meta.env.MODE,
  apiTimeout: 30000,
  auth: {
    b2c: {
      tenantId: '4a79a3ed-0b81-4b28-93d3-8a65eb17cc7c',
      tenantDomain: 'zariumai.onmicrosoft.com',
      clientId: 'a0432355-cca6-450f-b415-a4c3c4e5d55b',
      userFlow: 'zarium'
    }
  }
};

console.log('🔧 Application configuration:', {
  apiUrl: config.apiUrl,
  environment: config.environment,
  isDevelopment
});