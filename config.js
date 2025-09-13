// config.js - Configuration pour RMS Lounge Bar (Version sécurisée)

// Configuration de l'application (sans clés sensibles)
window.APP_CONFIG = {
  APP_NAME: 'RMS Lounge Bar',
  VERSION: '1.0.0',
  ENVIRONMENT: 'production'
};

// URLs API (relatives si possible)
window.API_CONFIG = {
  BASE_URL: '/api', // Utiliser des URLs relatives et laisser le reverse proxy gérer le routage
  ENDPOINTS: {
    FORM: '/form',
    RESERVATIONS: '/reservations',
    AUTH: '/auth'
  }
};

// Configuration FedaPay (le frontend n'a besoin que de la clé publique)
window.FEDAPAY_CONFIG = {
  PUBLIC_KEY: 'pk_sandbox_XeeKZ2AIjohRHywfhtWjSN7E',
  MODE: 'sandbox'
};

// Gestionnaire d'authentification
window.AUTH_CONFIG = {
  TOKEN_STORAGE_KEY: 'rms_lounge_bar_auth_token'
};

// Fonctions utilitaires
window.getApiUrl = function(endpoint) {
  const base = window.API_CONFIG.BASE_URL;
  const path = window.API_CONFIG.ENDPOINTS[endpoint] || endpoint;
  return `${base}${path}`;
};

window.getAuthHeaders = function() {
  const token = localStorage.getItem(window.AUTH_CONFIG.TOKEN_STORAGE_KEY);
  const headers = {
    'Content-Type': 'application/json'
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

console.log('Configuration RMS Lounge Bar sécurisée chargée');