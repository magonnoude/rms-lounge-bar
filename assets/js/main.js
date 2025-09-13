// =============================================================================
// CONFIGURATION PRINCIPALE
// =============================================================================

// Configuration AWS
const API_CONFIG = {
  URL: 'https://xfpzt4zm66.execute-api.eu-west-3.amazonaws.com/prod/form',
  KEY: 'tLk8XDgCts3ElJrYMAbRX62p3iWYlWt1a54iZIRr'
};

// Configuration reCAPTCHA (à remplacer par votre clé)
const RECAPTCHA_SITE_KEY = '6Lc2lLkrAAAAAMMlzMzaA6MqY6TLYPR4OLGXlLOy';

// Cache DOM elements
const domElements = {
  mobileMenuBtn: document.getElementById('mobileMenuBtn'),
  mobileMenuClose: document.getElementById('mobileMenuClose'),
  mainNav: document.getElementById('mainNav'),
  reservationForm: document.getElementById('reservationForm'),
  contactForm: document.getElementById('contactForm'),
  newsletterForm: document.getElementById('newsletterForm'),
  tabBtns: document.querySelectorAll('.tab-btn'),
  menuItems: document.querySelectorAll('.menu-item')
};

// =============================================================================
// FONCTIONS UTILITAIRES
// =============================================================================

const utils = {
  // Délai pour éviter les appels excessifs
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

  // Affichage des notifications
  showNotification: (message, isSuccess = true) => {
    // Supprimer les notifications existantes
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    });
    
    const notification = document.createElement('div');
    notification.className = `notification ${isSuccess ? 'success' : 'error'}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Animation d'entrée
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);
    
    // Suppression après 5 secondes
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 300);
    }, 5000);
  },

  // Validation d'email
  isValidEmail: (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  },

  // Validation de téléphone
  isValidPhone: (phone) => {
    const re = /^[+]?[0-9\s\-\(\)]{10,}$/;
    return re.test(phone);
  }
};

// =============================================================================
// VALIDATION DES FORMULAIRES
// =============================================================================

const formValidator = {
  validateReservation: function(formData) {
    const errors = [];
    
    if (!formData.name || formData.name.trim().length < 2) {
      errors.push('Le nom doit contenir au moins 2 caractères');
    }
    
    if (!formData.email || !utils.isValidEmail(formData.email)) {
      errors.push('Veuillez entrer une adresse email valide');
    }
    
    if (!formData.phone || !utils.isValidPhone(formData.phone)) {
      errors.push('Veuillez entrer un numéro de téléphone valide');
    }
    
    if (!formData.date || !this.isValidDate(formData.date)) {
      errors.push('Veuillez sélectionner une date valide');
    }
    
    if (!formData.time) {
      errors.push('Veuillez sélectionner une heure');
    }
    
    if (!formData.recaptchaToken) {
      errors.push('Veuillez compléter la vérification de sécurité');
    }
    
    return errors;
  },
  
  validateContact: function(formData) {
    const errors = [];
    
    if (!formData.name || formData.name.trim().length < 2) {
      errors.push('Le nom doit contenir au moins 2 caractères');
    }
    
    if (!formData.email || !utils.isValidEmail(formData.email)) {
      errors.push('Veuillez entrer une adresse email valide');
    }
    
    if (!formData.subject || formData.subject.trim().length < 5) {
      errors.push('Le sujet doit contenir au moins 5 caractères');
    }
    
    if (!formData.message || formData.message.trim().length < 10) {
      errors.push('Le message doit contenir au moins 10 caractères');
    }
    
    if (!formData.recaptchaToken) {
      errors.push('Veuillez compléter la vérification de sécurité');
    }
    
    return errors;
  },
  
  validateNewsletter: function(email) {
    const errors = [];
    
    if (!email || !utils.isValidEmail(email)) {
      errors.push('Veuillez entrer une adresse email valide');
    }
    
    return errors;
  },
  
  isValidDate: function(dateString) {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date) && date > new Date();
  }
};

// =============================================================================
// GESTIONNAIRE DE FORMULAIRES AVEC reCAPTCHA
// =============================================================================

const formManager = {
  init: function() {
    // Initialiser reCAPTCHA
    this.initRecaptcha();
    
    // Initialiser les formulaires
    if (domElements.reservationForm) {
      this.setupFormModernization(domElements.reservationForm);
      domElements.reservationForm.addEventListener('submit', (e) => {
        this.handleFormSubmit(e, 'reservation');
      });
    }
    
    if (domElements.contactForm) {
      this.setupFormModernization(domElements.contactForm);
      domElements.contactForm.addEventListener('submit', (e) => {
        this.handleFormSubmit(e, 'contact');
      });
    }
    
    if (domElements.newsletterForm) {
      domElements.newsletterForm.addEventListener('submit', (e) => {
        this.handleNewsletterSubmit(e);
      });
    }
  },
  
  // Modernisation des formulaires
  setupFormModernization: function(form) {
    const inputs = form.querySelectorAll('input, textarea, select');
    
    inputs.forEach(input => {
      // Ajouter des labels flottants
      if (input.value) {
        input.classList.add('filled');
      }
      
      input.addEventListener('focus', () => {
        input.classList.add('focused');
      });
      
      input.addEventListener('blur', () => {
        input.classList.remove('focused');
        if (input.value) {
          input.classList.add('filled');
        } else {
          input.classList.remove('filled');
        }
      });
      
      // Animation de focus pour les labels
      if (input.previousElementSibling && input.previousElementSibling.tagName === 'LABEL') {
        input.addEventListener('focus', () => {
          input.previousElementSibling.classList.add('focused');
        });
        
        input.addEventListener('blur', () => {
          if (!input.value) {
            input.previousElementSibling.classList.remove('focused');
          }
        });
      }
    });
  },
  
  // Initialisation de reCAPTCHA
  initRecaptcha: function() {
    // Charger le script reCAPTCHA
    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`;
    document.head.appendChild(script);
    
    console.log('reCAPTCHA initialisé');
  },
  
  // Exécuter reCAPTCHA
  executeRecaptcha: async function(action) {
    return new Promise((resolve, reject) => {
      if (typeof grecaptcha === 'undefined') {
        reject(new Error('reCAPTCHA non chargé'));
        return;
      }
      
      grecaptcha.ready(() => {
        grecaptcha.execute(RECAPTCHA_SITE_KEY, { action: action })
          .then((token) => {
            resolve(token);
          })
          .catch((error) => {
            reject(error);
          });
      });
    });
  },
  
  // Gestion de la soumission des formulaires
  handleFormSubmit: async function(e, formType) {
    e.preventDefault();
    
    const form = e.target;
    const buttonId = formType === 'reservation' ? 'reservationSubmit' : 'contactSubmit';

    // Récupérer les données du formulaire
    const formData = this.prepareFormData(form, formType);
    
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
      // Exécuter reCAPTCHA
      formData.recaptchaToken = await this.executeRecaptcha(formType);
      
      // Envoi à l'API
      const response = await fetch(API_CONFIG.URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_CONFIG.KEY,
          'Accept': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        const responseData = await response.json();
        
        const successMessage = formType === 'reservation' 
          ? 'Votre réservation a été envoyée avec succès! Nous vous contacterons bientôt pour confirmation.'
          : 'Votre message a été envoyé avec succès! Nous vous répondrons dans les plus brefs délais.';
        
        utils.showNotification(successMessage, true);
        form.reset();
        
        // Réinitialiser les styles
        const inputs = form.querySelectorAll('input, textarea');
        inputs.forEach(input => {
          input.classList.remove('invalid', 'filled');
          if (input.previousElementSibling && input.previousElementSibling.tagName === 'LABEL') {
            input.previousElementSibling.classList.remove('focused');
          }
        });
      } else {
        throw new Error(`Erreur serveur: ${response.status}`);
      }
    } catch (error) {
      console.error('Erreur:', error);
      utils.showNotification(`Désolé, une erreur s'est produite. Veuillez réessayer.`, false);
    } finally {
      // Désactiver l'état de chargement
      setLoadingState(buttonId, false);
    }
  },
  
  // Gestion de la newsletter
  handleNewsletterSubmit: async function(e) {
    e.preventDefault();
    
    const form = e.target;
    const email = form.querySelector('input[type="email"]').value;
    const button = form.querySelector('button[type="submit"]');
    
    // Valider l'email
    const errors = formValidator.validateNewsletter(email);
    if (errors.length > 0) {
      utils.showNotification(errors.join(', '), false);
      return;
    }
    
    // Activer l'état de chargement
    button.disabled = true;
    button.innerHTML = 'Inscription en cours...';
    
    try {
      // Simuler l'envoi à un service de newsletter
      // Remplacez ceci par votre appel API réel
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Enregistrer l'email localement (à remplacer par un vrai service)
      const subscribers = JSON.parse(localStorage.getItem('newsletterSubscribers') || '[]');
      if (!subscribers.includes(email)) {
        subscribers.push(email);
        localStorage.setItem('newsletterSubscribers', JSON.stringify(subscribers));
      }
      
      utils.showNotification('Merci pour votre inscription à notre newsletter!', true);
      form.reset();
    } catch (error) {
      console.error('Erreur:', error);
      utils.showNotification('Désolé, une erreur s\'est produite lors de l\'inscription.', false);
    } finally {
      // Désactiver l'état de chargement
      button.disabled = false;
      button.innerHTML = 'S\'inscrire';
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
      formData.message = form.querySelector('#message').value || '';
    } else {
      formData.name = form.querySelector('#contactName').value;
      formData.email = form.querySelector('#contactEmail').value;
      formData.subject = form.querySelector('#contactSubject').value;
      formData.message = form.querySelector('#contactMessage').value;
    }
    
    return formData;
  }
};

// =============================================================================
// GESTIONNAIRE DE MENU
// =============================================================================

const menuManager = {
  init: function() {
    if (!domElements.tabBtns.length || !domElements.menuItems.length) return;
    
    // Cacher tous les éléments sauf les entrées
    domElements.menuItems.forEach(item => {
      const category = item.getAttribute('data-category');
      if (category === 'entrees') {
        item.style.display = 'block';
        setTimeout(() => item.classList.add('show'), 100);
      } else {
        item.style.display = 'none';
        item.classList.remove('show');
      }
    });
    
    // Ajouter les événements de clic
    domElements.tabBtns.forEach(btn => {
      btn.addEventListener('click', this.handleTabClick);
    });
    
    // Activer le premier onglet
    const firstTab = document.querySelector('.tab-btn[data-category="entrees"]');
    if (firstTab) {
      firstTab.classList.add('active');
    }
  },
  
  handleTabClick: function() {
    domElements.tabBtns.forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    
    const category = this.getAttribute('data-category');
    this.filterMenuItems(category);
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

// =============================================================================
// GESTIONNAIRE DE MENU MOBILE
// =============================================================================

const mobileMenu = {
  init: function() {
    if (!domElements.mobileMenuBtn || !domElements.mainNav) return;
    
    domElements.mobileMenuBtn.addEventListener('click', this.openMenu);
    
    if (domElements.mobileMenuClose) {
      domElements.mobileMenuClose.addEventListener('click', this.closeMenu);
    }
    
    // Fermer le menu en cliquant sur les liens
    const navLinks = document.querySelectorAll('nav a');
    navLinks.forEach(link => {
      link.addEventListener('click', this.closeMenu);
    });
    
    // Fermer le menu en cliquant à l'extérieur
    document.addEventListener('click', (e) => {
      if (domElements.mainNav.classList.contains('active') && 
          !e.target.closest('nav') && 
          !e.target.closest('#mobileMenuBtn')) {
        this.closeMenu();
      }
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

// =============================================================================
// ANIMATIONS
// =============================================================================

const animationController = {
  init: function() {
    this.setupAnimations();
    this.animateOnScroll(); // Animer les éléments déjà visibles
    window.addEventListener('scroll', utils.debounce(this.animateOnScroll, 50));
  },
  
  setupAnimations: function() {
    const animatedElements = document.querySelectorAll('.service-card, .about-content, .menu-item');
    animatedElements.forEach(element => {
      element.style.opacity = '0';
      element.style.transform = 'translateY(50px)';
      element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    });
  },
  
  animateOnScroll: function() {
    const elements = document.querySelectorAll('.service-card, .menu-item, .about-content');
    const windowHeight = window.innerHeight;
    
    elements.forEach(element => {
      const position = element.getBoundingClientRect();
      
      // Si l'élément est dans le viewport
      if (position.top < windowHeight - 100) {
        element.style.opacity = '1';
        element.style.transform = 'translateY(0)';
        element.classList.add('animated');
      }
    });
  }
};

// =============================================================================
// FONCTIONS UTILITAIRES GLOBALES
// =============================================================================

function setLoadingState(buttonId, isLoading) {
  const button = document.getElementById(buttonId);
  if (!button) return;
  
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

function highlightInvalidFields(form, errors) {
  const inputs = form.querySelectorAll('input, textarea, select');
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
    } else if (error.includes('personnes') || error.includes('nombre')) {
      const field = form.querySelector('#guests');
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

function addCustomStyles() {
  if (!document.getElementById('custom-styles')) {
    const style = document.createElement('style');
    style.id = 'custom-styles';
    style.textContent = `
      /* Styles pour les notifications */
      .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 5px;
        color: white;
        z-index: 10000;
        transition: all 0.3s ease;
        opacity: 0;
        transform: translateY(-20px);
        font-family: 'Montserrat', sans-serif;
        font-weight: 500;
        max-width: 400px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      }
      
      .notification.show {
        opacity: 1;
        transform: translateY(0);
      }
      
      .notification.success {
        background-color: #4CAF50;
      }
      
      .notification.error {
        background-color: #F44336;
      }
      
      /* Styles pour les champs de formulaire modernes */
      .form-group {
        position: relative;
        margin-bottom: 25px;
      }
      
      .form-group label {
        position: absolute;
        top: 16px;
        left: 15px;
        transition: all 0.3s ease;
        pointer-events: none;
        color: #888;
      }
      
      .form-group .focused {
        top: -12px;
        left: 10px;
        font-size: 12px;
        background: white;
        padding: 0 5px;
        color: #4CAF50;
      }
      
      .form-group input:focus,
      .form-group textarea:focus,
      .form-group select:focus {
        border-color: #4CAF50;
        box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
      }
      
      .form-group .filled {
        top: -12px;
        left: 10px;
        font-size: 12px;
        background: white;
        padding: 0 5px;
      }
      
      /* Styles pour l'état de chargement */
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
      
      /* Styles pour les champs invalides */
      .invalid {
        border-color: #f44336 !important;
        box-shadow: 0 0 5px rgba(244, 67, 54, 0.5) !important;
      }
      
      /* Animation des éléments au défilement */
      .service-card, .menu-item, .about-content {
        opacity: 0;
        transform: translateY(50px);
        transition: opacity 0.6s ease, transform 0.6s ease;
      }
      
      .service-card.animated, .menu-item.animated, .about-content.animated {
        opacity: 1;
        transform: translateY(0);
      }
      
      /* Menu mobile */
      .mobile-nav.active {
        transform: translateX(0);
      }
      
      /* reCAPTCHA badge adjustment */
      .grecaptcha-badge {
        z-index: 1000;
      }
    `;
    document.head.appendChild(style);
  }
}

// =============================================================================
// INITIALISATION
// =============================================================================

document.addEventListener('DOMContentLoaded', function() {
  console.log('Initialisation des composants...');
  
  // Ajouter les styles personnalisés
  addCustomStyles();
  
  // Initialiser le menu
  if (domElements.tabBtns.length && domElements.menuItems.length) {
    menuManager.init();
  }
  
  // Initialiser la navigation mobile
  if (domElements.mobileMenuBtn && domElements.mainNav) {
    mobileMenu.init();
  }
  
  // Initialiser les formulaires
  formManager.init();
  
  // Initialiser les animations
  animationController.init();
  
  console.log('Tous les composants ont été initialisés avec succès');
});

// Gestion des erreurs globales
window.addEventListener('error', function(e) {
  console.error('Erreur globale:', e.error);
});