
const isDevelopment = import.meta.env.MODE === 'development' || window.location.hostname === 'localhost';

export const apiUrl = isDevelopment 
  ? 'http://localhost:8000' 
  : 'https://zarium-app-ddbnb4egcpf4e6b0.westeurope-01.azurewebsites.net'; 

export const config = {
  apiUrl,
  stripePublicKey: import.meta.env.VITE_STRIPE_PUBLIC_KEY,
  environment: import.meta.env.MODE,
  apiTimeout: 30000
};


console.log('🔧 Application configuration:', {
  apiUrl: config.apiUrl,
  environment: config.environment,
  isDevelopment
});