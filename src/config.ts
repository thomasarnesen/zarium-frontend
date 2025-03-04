export const apiUrl = 'https://zarium-app-ddbnb4egcpf4e6b0.westeurope-01.azurewebsites.net';

export const config = {
  apiUrl,
  stripePublicKey: import.meta.env.VITE_STRIPE_PUBLIC_KEY,
  environment: import.meta.env.MODE,
  apiTimeout: 30000  // 30 sekunder timeout
};

// Legg til logging av config ved oppstart
console.log('🔧 Application configuration:', {
  apiUrl: config.apiUrl,
  environment: config.environment
});