// Configuration AWS - SECURITY NOTE: API keys should not be exposed in client-side code
// Consider using a server-side proxy or environment variables
const API_CONFIG = {
  URL: 'https://xfpzt4zm66.execute-api.eu-west-3.amazonaws.com/prod/form',
  KEY: 'tLk8XDgCts3ElJrYMAbRX62p3iWYlWt1a54iZIRr'
};

// Cache DOM elements for better performance
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
  // Debounce function for scroll events
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

  // Show notification to user
  showNotification: (message, isSuccess = true) => {
    // Create a more user-friendly notification system instead of alert()
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
        document.body.removeChild(notification);
      }, 300);
    }, 5000);
  }
};

// Menu functionality
const menuManager = {
  init: function() {
    if (!domElements.tabBtns.length || !domElements.menuItems.length) return;
    
    // Set up tab buttons
    domElements.tabBtns.forEach(btn => {
      btn.addEventListener('click', this.handleTabClick);
    });
    
    // Initialize with entrees shown
    this.filterMenuItems('entrees');
  },
  
  handleTabClick: function() {
    // Retirer la classe active de tous les boutons
    domElements.tabBtns.forEach(b => b.classList.remove('active'));
    
    // Ajouter la classe active au bouton cliqué
    this.classList.add('active');
    
    // Récupérer la catégorie
    const category = this.getAttribute('data-category');
    
    // Filter menu items
    menuManager.filterMenuItems(category);
  },
  
  filterMenuItems: function(category) {
    domElements.menuItems.forEach(item => {
      const itemCategory = item.getAttribute('data-category');
      
      if (category === 'all' || itemCategory === category) {
        item.style.display = 'block';
        // Forcer le réaffichage avec un léger délai pour l'animation
        setTimeout(() => {
          item.classList.add('show');
        }, 10);
      } else {
        item.classList.remove('show');
        // Masquer après la fin de l'animation
        setTimeout(() => {
          item.style.display = 'none';
        }, 300);
      }
    });
  }
};

// Form handling
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
  
// ... (le reste de votre code reste inchangé jusqu'à la fonction handleFormSubmit)

  handleFormSubmit: async function(e, formType) {
    e.preventDefault();
    
    const form = e.target;
    const buttonId = formType === 'reservation' ? 'reservationSubmit' : 'contactSubmit';
    
    // Activer l'état de chargement
    setLoadingState(buttonId, true);
    
    // Récupérer les données du formulaire
    const formData = this.prepareFormData(form, formType);
    
    try {
      console.log('Envoi des données:', formData);
      
      // Envoyer les données à l'API
      const response = await fetch(API_CONFIG.URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_CONFIG.KEY
        },
        body: JSON.stringify(formData)
      });
      
      console.log('Status de la réponse:', response.status);
      console.log('Headers de la réponse:', Object.fromEntries(response.headers.entries()));
      
      // Essayer de lire la réponse comme texte d'abord
      const responseText = await response.text();
      console.log('Réponse brute:', responseText);
      
      let responseData;
      try {
        // Essayer de parser la réponse comme JSON
        responseData = JSON.parse(responseText);
        console.log('Réponse JSON:', responseData);
      } catch (jsonError) {
        console.log('La réponse n\'est pas du JSON valide, utilisation du texte brut');
        responseData = { message: responseText };
      }
      
      if (response.ok) {
        // SUCCÈS - Afficher message de confirmation
        const successMessage = formType === 'reservation' 
          ? 'Votre réservation a été envoyée avec succès! Nous vous contacterons bientôt pour confirmation.'
          : 'Votre message a été envoyé avec succès! Nous vous répondrons dans les plus brefs délais.';
        
        // Afficher le message de succès
        alert(successMessage);
        form.reset();
      } else {
        // ERREUR SERVEUR - Afficher message d'erreur
        const errorMessage = responseData.error || responseData.message || `Erreur serveur: ${response.status}`;
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Erreur complète:', error);
      
      // Message d'erreur spécifique selon le type d'erreur
      let errorMessage;
      
      if (error.message.includes('JSON')) {
        errorMessage = 'Problème de communication avec le serveur. Votre demande a été enregistrée.';
      } else if (error.message.includes('Network')) {
        errorMessage = 'Problème de connexion. Vérifiez votre connexion internet.';
      } else {
        errorMessage = 'Votre demande a été enregistrée, mais une erreur technique est survenue. Nous vous contacterons rapidement.';
      }
      
      alert(errorMessage);
    } finally {
      // Désactiver l'état de chargement dans tous les cas
      setLoadingState(buttonId, false);
    }
  },
 
  prepareFormData: function(form, formType) {
    const formData = {
      type: formType,
      timestamp: new Date().toISOString()
    };
    
    // Add form-specific fields
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
    
    // Fermer le menu en cliquant sur un lien
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
      
      // Si l'élément est visible à l'écran
      if(position.top < window.innerHeight - 100) {
        element.style.opacity = 1;
        element.style.transform = 'translateY(0)';
      }
    });
  }
};

// Fonction pour gérer l'état de chargement des boutons
function setLoadingState(buttonId, isLoading) {
  const button = document.getElementById(buttonId);
  if (!button) return;
  
  if (isLoading) {
    button.classList.add('loading');
    button.innerHTML = '<div class="loading-spinner"></div> Envoi en cours...';
    button.disabled = true;
  } else {
    button.classList.remove('loading');
    // Restaurer le texte original selon le bouton
    if (buttonId === 'reservationSubmit') {
      button.innerHTML = 'Réserver';
    } else if (buttonId === 'contactSubmit') {
      button.innerHTML = 'Envoyer';
    }
    button.disabled = false;
  }
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  mobileMenu.init();
  menuManager.init();
  formManager.init();
  animationController.init();
});

// Validation des formulaires avant envoi
const formValidator = {
  validateReservation: function(formData) {
    const errors = [];
    
    if (!formData.name || formData.name.length < 2) {
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
    
    if (!formData.name || formData.name.length < 2) {
      errors.push('Le nom doit contenir au moins 2 caractères');
    }
    
    if (!formData.email || !this.isValidEmail(formData.email)) {
      errors.push('Veuillez entrer une adresse email valide');
    }
    
    if (!formData.subject || formData.subject.length < 5) {
      errors.push('Le sujet doit contenir au moins 5 caractères');
    }
    
    if (!formData.message || formData.message.length < 10) {
      errors.push('Le message doit contenir au moins 10 caractères');
    }
    
    return errors;
  },
  
  isValidEmail: function(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  },
  
  isValidPhone: function(phone) {
    // Validation simple pour les numéros internationaux
    const re = /^[+]?[0-9\s\-\(\)]{10,}$/;
    return re.test(phone);
  },
  
  isValidDate: function(dateString) {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date) && date > new Date();
  }
};

// Intégration avec la gestion des formulaires
const enhancedFormManager = {
  ...formManager,
  
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
      return;
    }
    
    // Activer l'état de chargement
    setLoadingState(buttonId, true);
    
    try {
      // Envoyer les données à l'API
      const response = await fetch(API_CONFIG.URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_CONFIG.KEY
        },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        const successMessage = formType === 'reservation' 
          ? 'Votre réservation a été envoyée avec succès! Nous vous contacterons bientôt pour confirmation.'
          : 'Votre message a été envoyé avec succès! Nous vous répondrons dans les plus brefs délais.';
        
        utils.showNotification(successMessage, true);
        form.reset();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erreur HTTP: ${response.status}`);
      }
    } catch (error) {
      console.error('Erreur:', error);
      const errorMessage = 'Désolé, une erreur s\'est produite. Veuillez réessayer ou nous contacter directement par téléphone.';
      utils.showNotification(errorMessage, false);
    } finally {
      // Désactiver l'état de chargement dans tous les cas
      setLoadingState(buttonId, false);
    }
  }
};

// Remplacer le formManager original par la version améliorée
document.addEventListener('DOMContentLoaded', function() {
  mobileMenu.init();
  menuManager.init();
  // Utiliser le formManager amélioré
  enhancedFormManager.init();
  animationController.init();
});


// Fonction pour debugger les réponses
function debugResponse(response, formData) {
    console.log('Status:', response.status);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));
    console.log('Data sent:', formData);
    return response.json().then(data => {
        console.log('Response data:', data);
        return data;
    }).catch(error => {
        console.log('Response not JSON:', error);
        return { error: 'Invalid JSON response' };
    });
}

// Fonctions de notification améliorées
function showSuccessNotification(message) {
    // Créer une notification de succès
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background-color: #4CAF50;
        color: white;
        border-radius: 5px;
        z-index: 10000;
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        max-width: 400px;
    `;
    notification.innerHTML = `
        <div style="display: flex; align-items: center;">
            <span style="margin-right: 10px;">✓</span>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Supprimer après 5 secondes
    setTimeout(() => {
        document.body.removeChild(notification);
    }, 5000);
}

function showErrorNotification(message) {
    // Créer une notification d'erreur
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background-color: #f44336;
        color: white;
        border-radius: 5px;
        z-index: 10000;
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        max-width: 400px;
    `;
    notification.innerHTML = `
        <div style="display: flex; align-items: center;">
            <span style="margin-right: 10px;">⚠️</span>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Supprimer après 5 secondes
    setTimeout(() => {
        document.body.removeChild(notification);
    }, 5000);
}

// Remplacez la fonction utils.showNotification existante par ces nouvelles fonctions
