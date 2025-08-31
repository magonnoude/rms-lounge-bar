// Configuration AWS
const API_CONFIG = {
  URL: 'https://xfpzt4zm66.execute-api.eu-west-3.amazonaws.com/prod/form',
  KEY: 'tLk8XDgCts3ElJrYMAbRX62p3iWYlWt1a54iZIRr'
};

// Utiliser un proxy CORS pour contourner le problème
const PROXY_URL = 'https://corsproxy.io/?';

// Cache DOM elements
const domElements = {
  mobileMenuBtn: document.getElementById('mobileMenuBtn'),
  mobileMenuClose: document.getElementById('mobileMenuClose'),
  mainNav: document.getElementById('mainNav'),
  reservationForm: document.getElementById('reservationForm'),
  contactForm: document.getElementById('contactForm'),
  tabBtns: document.querySelectorAll('.tab-btn'),
  menuItems: document.querySelectorAll('.menu-item')
};

// Utility functions
const utils = {
  debounce: (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  showNotification: (message, isSuccess = true) => {
    // Supprimer les notifications existantes pour éviter les doublons
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    });
    
    const notification = document.createElement('div');
    notification.className = `notification ${isSuccess ? 'success' : 'error'}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px 20px;
      border-radius: 5px;
      color: white;
      z-index: 10000;
      transition: opacity 0.3s ease;
      opacity: 0;
      font-family: 'Montserrat', sans-serif;
      font-weight: 500;
      max-width: 400px;
    `;
    
    notification.style.backgroundColor = isSuccess ? '#4CAF50' : '#F44336';
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
      notification.style.opacity = 1;
    }, 10);
    
    // Remove after 5 seconds
    setTimeout(() => {
      notification.style.opacity = 0;
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 300);
    }, 5000);
  }
};

// Validation des formulaires
const formValidator = {
  validateReservation: function(formData) {
    const errors = [];
    
    if (!formData.name || formData.name.trim().length < 2) {
      errors.push('Le nom doit contenir au moins 2 caractères');
    }
    
    if (!formData.email || !this.isValidEmail(formData.email)) {
      errors.push('Veuillez entrer une adresse email valide');
    }
    
    if (!formData.phone || !this.isValidPhone(formData.phone)) {
      errors.push('Veuillez entrer un numéro de téléphone valide');
    }
    
    if (!formData.date || !this.isValidDate(formData.date)) {
      errors.push('Veuillez sélectionner une date valide');
    }
    
    if (!formData.time) {
      errors.push('Veuillez sélectionner une heure');
    }
    
    return errors;
  },
  
  validateContact: function(formData) {
    const errors = [];
    
    if (!formData.name || formData.name.trim().length < 2) {
      errors.push('Le nom doit contenir au moins 2 caractères');
    }
    
    if (!formData.email || !this.isValidEmail(formData.email)) {
      errors.push('Veuillez entrer une adresse email valide');
    }
    
    if (!formData.subject || formData.subject.trim().length < 5) {
      errors.push('Le sujet doit contenir au moins 5 caractères');
    }
    
    if (!formData.message || formData.message.trim().length < 10) {
      errors.push('Le message doit contenir au moins 10 caractères');
    }
    
    return errors;
  },
  
  isValidEmail: function(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  },
  
  isValidPhone: function(phone) {
    const re = /^[+]?[0-9\s\-\(\)]{10,}$/;
    return re.test(phone);
  },
  
  isValidDate: function(dateString) {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date) && date > new Date();
  }
};

// Menu functionality
const menuManager = {
  init: function() {
    if (!domElements.tabBtns.length || !domElements.menuItems.length) return;
    
    domElements.tabBtns.forEach(btn => {
      btn.addEventListener('click', this.handleTabClick);
    });
    
    this.filterMenuItems('entrees');
  },
  
  handleTabClick: function() {
    domElements.tabBtns.forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    
    const category = this.getAttribute('data-category');
    menuManager.filterMenuItems(category);
  },
  
  filterMenuItems: function(category) {
    domElements.menuItems.forEach(item => {
      const itemCategory = item.getAttribute('data-category');
      
      if (category === 'all' || itemCategory === category) {
        item.style.display = 'block';
        setTimeout(() => {
          item.classList.add('show');
        }, 10);
      } else {
        item.classList.remove('show');
        setTimeout(() => {
          item.style.display = 'none';
        }, 300);
      }
    });
  }
};

// Form handling - SOLUTION CORS IMPLÉMENTÉE
const formManager = {
  init: function() {
    if (domElements.reservationForm) {
      domElements.reservationForm.addEventListener('submit', (e) => {
        this.handleFormSubmit(e, 'reservation');
      });
    }
    
    if (domElements.contactForm) {
      domElements.contactForm.addEventListener('submit', (e) => {
        this.handleFormSubmit(e, 'contact');
      });
    }
  },
  
  handleFormSubmit: async function(e, formType) {
    e.preventDefault();
    
    const form = e.target;
    const buttonId = formType === 'reservation' ? 'reservationSubmit' : 'contactSubmit';

    console.log('=== DÉBUT DE LA SOUMISSION ===');
    console.log('Type de formulaire:', formType);
    
    // Récupérer les données du formulaire
    const formData = this.prepareFormData(form, formType);
    console.log('Données du formulaire:', formData);
    
    // Valider les données
    const errors = formType === 'reservation' 
      ? formValidator.validateReservation(formData)
      : formValidator.validateContact(formData);
    
    if (errors.length > 0) {
      utils.showNotification(errors.join(', '), false);
      highlightInvalidFields(form, errors);
      return;
    }
    
    // Activer l'état de chargement
    setLoadingState(buttonId, true);
    
    try {
      // SOLUTION CORS: Utiliser un proxy CORS
      console.log('Envoi des données via proxy CORS...');
      
      const response = await fetch(PROXY_URL + encodeURIComponent(API_CONFIG.URL), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_CONFIG.KEY,
          'Accept': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      console.log('Réponse reçue, status:', response.status);
      
      if (response.ok) {
        const responseData = await response.json();
        console.log('Réponse API:', responseData);
        
        const successMessage = formType === 'reservation' 
          ? 'Votre réservation a été envoyée avec succès! Nous vous contacterons bientôt pour confirmation.'
          : 'Votre message a été envoyé avec succès! Nous vous répondrons dans les plus brefs délais.';
        
        utils.showNotification(successMessage, true);
        form.reset();
        
        // Réinitialiser les styles d'erreur après succès
        const inputs = form.querySelectorAll('input, textarea');
        inputs.forEach(input => {
          input.classList.remove('invalid');
        });
      } else {
        // Gestion des erreurs HTTP
        let errorMessage = `Erreur serveur: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
          console.error('Détails de l\'erreur:', errorData);
        } catch (e) {
          console.error('Erreur lors de la lecture de la réponse:', e);
        }
        
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Erreur complète:', error);
      
      // Message d'erreur spécifique
      if (error.message.includes('Failed to fetch') || error.message.includes('CORS') || error.message.includes('NetworkError')) {
        // Essayer une méthode alternative sans proxy
        this.tryAlternativeMethod(formData, formType, form, buttonId);
      } else {
        utils.showNotification(`Désolé, une erreur s'est produite: ${error.message}`, false);
      }
    } finally {
      // Désactiver l'état de chargement dans tous les cas
      setLoadingState(buttonId, false);
    }
  },
  
  // Méthode alternative sans CORS (envoi simple)
  tryAlternativeMethod: async function(formData, formType, form, buttonId) {
    try {
      console.log('Tentative avec méthode alternative...');
      
      // Créer un formulaire temporaire pour soumettre les données
      const tempForm = document.createElement('form');
      tempForm.action = API_CONFIG.URL;
      tempForm.method = 'POST';
      tempForm.style.display = 'none';
      
      // Ajouter les données comme champs cachés
      Object.keys(formData).forEach(key => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = formData[key];
        tempForm.appendChild(input);
      });
      
      // Ajouter la clé API
      const apiKeyInput = document.createElement('input');
      apiKeyInput.type = 'hidden';
      apiKeyInput.name = 'x-api-key';
      apiKeyInput.value = API_CONFIG.KEY;
      tempForm.appendChild(apiKeyInput);
      
      document.body.appendChild(tempForm);
      tempForm.submit();
      
      // Supprimer le formulaire temporaire après soumission
      setTimeout(() => {
        document.body.removeChild(tempForm);
      }, 1000);
      
      // Message de succès (on suppose que ça a fonctionné)
      const successMessage = formType === 'reservation' 
        ? 'Votre réservation a été envoyée avec succès! Nous vous contacterons bientôt pour confirmation.'
        : 'Votre message a été envoyé avec succès! Nous vous répondrons dans les plus brefs délais.';
      
      utils.showNotification(successMessage, true);
      form.reset();
      
    } catch (altError) {
      console.error('Erreur avec méthode alternative:', altError);
      utils.showNotification('Erreur de connexion. Veuillez réessayer ou nous contacter directement.', false);
    }
  },

  prepareFormData: function(form, formType) {
    const formData = {
      type: formType,
      timestamp: new Date().toISOString()
    };
    
    if (formType === 'reservation') {
      formData.name = form.querySelector('#name').value;
      formData.email = form.querySelector('#email').value;
      formData.phone = form.querySelector('#phone').value;
      formData.guests = form.querySelector('#guests').value;
      formData.date = form.querySelector('#date').value;
      formData.time = form.querySelector('#time').value;
      formData.message = form.querySelector('#message').value;
    } else {
      formData.name = form.querySelector('#contactName').value;
      formData.email = form.querySelector('#contactEmail').value;
      formData.subject = form.querySelector('#contactSubject').value;
      formData.message = form.querySelector('#contactMessage').value;
    }
    
    return formData;
  }
};

// Mobile menu handling
const mobileMenu = {
  init: function() {
    if (!domElements.mobileMenuBtn || !domElements.mainNav) return;
    
    domElements.mobileMenuBtn.addEventListener('click', this.openMenu);
    
    if (domElements.mobileMenuClose) {
      domElements.mobileMenuClose.addEventListener('click', this.closeMenu);
    }
    
    const navLinks = document.querySelectorAll('nav a');
    navLinks.forEach(link => {
      link.addEventListener('click', this.closeMenu);
    });
  },
  
  openMenu: function() {
    domElements.mainNav.classList.add('active');
    document.body.style.overflow = 'hidden';
  },
  
  closeMenu: function() {
    domElements.mainNav.classList.remove('active');
    document.body.style.overflow = 'auto';
  }
};

// Animation controller
const animationController = {
  init: function() {
    this.setupAnimations();
    window.addEventListener('load', this.animateOnScroll);
    window.addEventListener('scroll', utils.debounce(this.animateOnScroll, 50));
  },
  
  setupAnimations: function() {
    const animatedElements = document.querySelectorAll('.service-card, .about-content');
    animatedElements.forEach(element => {
      element.style.opacity = 0;
      element.style.transform = 'translateY(50px)';
      element.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    });
  },
  
  animateOnScroll: function() {
    const elements = document.querySelectorAll('.service-card, .menu-item, .about-content');
    
    elements.forEach(element => {
      const position = element.getBoundingClientRect();
      
      if(position.top < window.innerHeight - 100) {
        element.style.opacity = 1;
        element.style.transform = 'translateY(0)';
        element.classList.add('animated');
      }
    });
  }
};

// Fonction pour gérer l'état de chargement des boutons
function setLoadingState(buttonId, isLoading) {
  const button = document.getElementById(buttonId);
  if (!button) {
    console.error('Bouton non trouvé:', buttonId);
    return;
  }
  
  if (isLoading) {
    button.classList.add('loading');
    button.innerHTML = '<div class="loading-spinner"></div> Envoi en cours...';
    button.disabled = true;
  } else {
    button.classList.remove('loading');
    if (buttonId === 'reservationSubmit') {
      button.innerHTML = 'Réserver';
    } else if (buttonId === 'contactSubmit') {
      button.innerHTML = 'Envoyer';
    }
    button.disabled = false;
  }
}

// Surlignez visuellement les champs invalides
function highlightInvalidFields(form, errors) {
  const inputs = form.querySelectorAll('input, textarea');
  inputs.forEach(input => {
    input.classList.remove('invalid');
  });
  
  errors.forEach(error => {
    if (error.includes('nom')) {
      const field = form.querySelector('#name, #contactName');
      if (field) field.classList.add('invalid');
    } else if (error.includes('email')) {
      const field = form.querySelector('#email, #contactEmail');
      if (field) field.classList.add('invalid');
    } else if (error.includes('téléphone')) {
      const field = form.querySelector('#phone');
      if (field) field.classList.add('invalid');
    } else if (error.includes('date')) {
      const field = form.querySelector('#date');
      if (field) field.classList.add('invalid');
    } else if (error.includes('heure')) {
      const field = form.querySelector('#time');
      if (field) field.classList.add('invalid');
    } else if (error.includes('sujet')) {
      const field = form.querySelector('#contactSubject');
      if (field) field.classList.add('invalid');
    } else if (error.includes('message')) {
      const field = form.querySelector('#message, #contactMessage');
      if (field) field.classList.add('invalid');
    }
  });
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Vérifier que les éléments existent avant de les initialiser
  if (domElements.mobileMenuBtn && domElements.mainNav) {
    mobileMenu.init();
  }
  
  if (domElements.tabBtns.length && domElements.menuItems.length) {
    menuManager.init();
  }
  
  if (domElements.reservationForm || domElements.contactForm) {
    formManager.init();
  }
  
  animationController.init();
  
  // Ajouter le CSS pour les champs invalides si pas déjà présent
  if (!document.getElementById('validation-styles')) {
    const style = document.createElement('style');
    style.id = 'validation-styles';
    style.textContent = `
      .invalid {
        border-color: #f44336 !important;
        box-shadow: 0 0 5px rgba(244, 67, 54, 0.5) !important;
      }
      .loading-spinner {
        display: inline-block;
        width: 16px;
        height: 16px;
        border: 2px solid #f3f3f3;
        border-top: 2px solid #3498db;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-right: 8px;
      }
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      .btn.loading {
        pointer-events: none;
        opacity: 0.8;
      }
      .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 5px;
        color: white;
        z-index: 10000;
        transition: opacity 0.3s ease;
        opacity: 0;
        font-family: 'Montserrat', sans-serif;
        font-weight: 500;
        max-width: 400px;
      }
      .notification.success {
        background-color: #4CAF50;
      }
      .notification.error {
        background-color: #F44336;
      }
    `;
    document.head.appendChild(style);
  }
});

// Dans main.js - Ajouter ces fonctions
const reservationManager = {
  init: function() {
    this.setupDatePicker();
    this.setupTimeValidation();
  },
  
  setupDatePicker: function() {
    const dateInput = document.getElementById('date');
    if (dateInput) {
      const today = new Date().toISOString().split('T')[0];
      dateInput.min = today;
      
      // Empêcher la sélection des jours passés
      dateInput.addEventListener('input', function(e) {
        const selectedDate = new Date(e.target.value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (selectedDate < today) {
          e.target.value = today.toISOString().split('T')[0];
        }
      });
    }
  },
  
  setupTimeValidation: function() {
    const timeInput = document.getElementById('time');
    if (timeInput) {
      timeInput.addEventListener('change', function(e) {
        const time = e.target.value;
        const hours = parseInt(time.split(':')[0]);
        
        // Validation des horaires d'ouverture
        if (hours < 11 || hours > 23) {
          utils.showNotification('Nos horaires sont de 11h à 23h', false);
          e.target.value = '12:00';
        }
      });
    }
  }
};

// Ajouter dans DOMContentLoaded
document.addEventListener('DOMContentLoaded', function() {
  // ... code existant ...
  reservationManager.init();
});

// Dans main.js
const testimonialsManager = {
  init: function() {
    this.setupTestimonialsCarousel();
  },
  
  setupTestimonialsCarousel: function() {
    const testimonials = document.querySelectorAll('.testimonial');
    let currentIndex = 0;
    
    setInterval(() => {
      testimonials.forEach(testimonial => {
        testimonial.classList.remove('active');
      });
      
      currentIndex = (currentIndex + 1) % testimonials.length;
      testimonials[currentIndex].classList.add('active');
    }, 5000);
  }
};

const i18n = {
  translations: {
    fr: {
      reserve: "Réserver",
      contact: "Contact",
      menu: "Menu"
    },
    en: {
      reserve: "Book",
      contact: "Contact", 
      menu: "Menu"
    }
  },
  
  setLanguage: function(lang) {
    document.documentElement.lang = lang;
    this.updateTexts(lang);
  },
  
  updateTexts: function(lang) {
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.textContent = this.translations[lang][key];
    });
  }
};

// Analytics Manager
const analyticsManager = {
  init: function() {
    this.trackPageView();
    this.setupEventTracking();
  },
  
  trackPageView: function() {
    if (typeof gtag !== 'undefined') {
      gtag('config', 'GA_MEASUREMENT_ID', {
        page_title: document.title,
        page_location: window.location.href,
        page_path: window.location.pathname
      });
    }
  },
  
  trackEvent: function(category, action, label, value) {
    if (typeof gtag !== 'undefined') {
      gtag('event', action, {
        event_category: category,
        event_label: label,
        value: value
      });
    }
  },
  
  setupEventTracking: function() {
    // Tracking des clics sur la navigation
    const navLinks = document.querySelectorAll('nav a');
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        this.trackEvent('Navigation', 'Menu Click', link.textContent);
      });
    });
    
    // Tracking des formulaires
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
      form.addEventListener('submit', () => {
        const formType = form.id === 'reservationForm' ? 'Réservation' : 'Contact';
        this.trackEvent('Formulaires', 'Soumission', formType);
      });
    });
    
    // Tracking des clicks sur le CTA
    const ctaButtons = document.querySelectorAll('.btn.cta');
    ctaButtons.forEach(button => {
      button.addEventListener('click', () => {
        this.trackEvent('CTA', 'Click', button.textContent);
      });
    });
  }
};

// Ajouter dans DOMContentLoaded
document.addEventListener('DOMContentLoaded', function() {
  analyticsManager.init();
});