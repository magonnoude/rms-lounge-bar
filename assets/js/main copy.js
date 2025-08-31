// Configuration AWS
const API_URL = 'https://xfpzt4zm66.execute-api.eu-west-3.amazonaws.com/prod/form';
const API_KEY = 'tLk8XDgCts3ElJrYMAbRX62p3iWYlWt1a54iZIRr';

// Au chargement:
document.addEventListener('DOMContentLoaded', () => {
  const reservationForm = document.getElementById('reservationForm') || document.getElementById('booking-form');
  const contactForm     = document.getElementById('contactForm')     || document.getElementById('contact-form');

  if (reservationForm) {
    reservationForm.addEventListener('submit', handleReservationSubmit);
  }
  if (contactForm) {
    contactForm.addEventListener('submit', handleContactSubmit);
  }
});

async function handleReservationSubmit(e) {
  e.preventDefault();
  setLoadingState('reservationSubmit', true);
  const form = e.currentTarget;
  const data = Object.fromEntries(new FormData(form).entries());
  data.type = 'reservation'; // IMPORTANT pour le template email côté Lambda
  try {
    const r = await fetch(API_URL, { method:'POST', headers:{'Content-Type':'application/json','x-api-key':API_KEY}, body: JSON.stringify(data) });
    const json = await r.json();
    if (!r.ok) throw new Error(json.error || 'Erreur réseau');
    alert(`Réservation envoyée ! ID: ${json.submissionId}`);
    form.reset();
  } catch(err) {
    showNotification('Une erreur s’est produite. Réessayez.', false);
  } finally {
    setLoadingState('reservationSubmit', false);
  }
}

async function handleContactSubmit(e) {
  e.preventDefault();
  setLoadingState('contactSubmit', true);
  const form = e.currentTarget;
  const data = Object.fromEntries(new FormData(form).entries());
  data.type = 'contact'; // IMPORTANT
  try {
    const r = await fetch(API_URL, { method:'POST', headers:{'Content-Type':'application/json','x-api-key':API_KEY}, body: JSON.stringify(data) });
    const json = await r.json();
    if (!r.ok) throw new Error(json.error || 'Erreur réseau');
    alert(`Message envoyé ! ID: ${json.submissionId}`);
    form.reset();
  } catch(err) {
    showNotification('Une erreur s’est produite. Réessayez.', false);
  } finally {
    setLoadingState('contactSubmit', false);
  }
}


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

// Menu mobile
document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenuClose = document.getElementById('mobileMenuClose');
    const mainNav = document.getElementById('mainNav');
    
    if (mobileMenuBtn && mainNav) {
        mobileMenuBtn.addEventListener('click', function() {
            mainNav.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    }
    
    if (mobileMenuClose && mainNav) {
        mobileMenuClose.addEventListener('click', function() {
            mainNav.classList.remove('active');
            document.body.style.overflow = 'auto';
        });
    }
    
    // Fermer le menu en cliquant sur un lien
    const navLinks = document.querySelectorAll('nav a');
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            if (mainNav) {
                mainNav.classList.remove('active');
                document.body.style.overflow = 'auto';
            }
        });
    });
    
    // Filtrage des éléments du menu par catégorie
    const tabBtns = document.querySelectorAll('.tab-btn');
    const menuItems = document.querySelectorAll('.menu-item');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Retirer la classe active de tous les boutons
            tabBtns.forEach(b => b.classList.remove('active'));
            
            // Ajouter la classe active au bouton cliqué
            this.classList.add('active');
            
            // Récupérer la catégorie
            const category = this.getAttribute('data-category');
            
            // Afficher/masquer les éléments du menu
            menuItems.forEach(item => {
                if (category === 'all' || item.getAttribute('data-category') === category) {
                    item.classList.add('show');
                } else {
                    item.classList.remove('show');
                }
            });
        });
    });
    
    // Animation des éléments du menu au chargement
    setTimeout(() => {
        menuItems.forEach(item => {
            if (item.getAttribute('data-category') === 'entrees') {
                item.classList.add('show');
            }
        });
    }, 300);
    
    // Formulaire de réservation
    const reservationForm = document.getElementById('reservationForm');
    if (reservationForm) {
        reservationForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Activer l'état de chargement
            setLoadingState('reservationSubmit', true);
            
            // Récupérer les données du formulaire
            const formData = {
                type: 'reservation',
                name: document.getElementById('name').value,
                email: document.getElementById('email').value,
                phone: document.getElementById('phone').value,
                guests: document.getElementById('guests').value,
                date: document.getElementById('date').value,
                time: document.getElementById('time').value,
                message: document.getElementById('message').value,
                timestamp: new Date().toISOString()
            };
            
            try {
                // Envoyer les données à l'API
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': API_KEY
                    },
                    body: JSON.stringify(formData)
                });
                
                if (response.ok) {
                    alert('Votre réservation a été envoyée avec succès! Nous vous contacterons bientôt pour confirmation.');
                    reservationForm.reset();
                } else {
                    throw new Error('Erreur lors de l\'envoi de la réservation');
                }
            } catch (error) {
                console.error('Erreur:', error);
                alert('Désolé, une erreur s\'est produite. Veuillez réessayer ou nous contacter directement par téléphone.');
            } finally {
                // Désactiver l'état de chargement dans tous les cas
                setLoadingState('reservationSubmit', false);
            }
        });
    }
    
    // Formulaire de contact
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Activer l'état de chargement
            setLoadingState('contactSubmit', true);
            
            // Récupérer les données du formulaire
            const formData = {
                type: 'contact',
                name: document.getElementById('contactName').value,
                email: document.getElementById('contactEmail').value,
                subject: document.getElementById('contactSubject').value,
                message: document.getElementById('contactMessage').value,
                timestamp: new Date().toISOString()
            };
            
            try {
                // Envoyer les données à l'API
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': API_KEY
                    },
                    body: JSON.stringify(formData)
                });
                
             // Dans les gestionnaires de formulaires, remplacez la partie de réponse :
if (response.ok) {
    const result = await response.json();
    alert(`Votre ${formData.type === 'reservation' ? 'réservation' : 'message'} a été envoyé avec succès! ID: ${result.submissionId}`);
    contactForm.reset();
} else {
    throw new Error('Erreur lors de l\'envoi');
}


            } catch (error) {
                console.error('Erreur:', error);
                alert('Désolé, une erreur s\'est produite. Veuillez réessayer ou nous contacter directement par téléphone.');
            } finally {
                // Désactiver l'état de chargement dans tous les cas
                setLoadingState('contactSubmit', false);
            }
        });
    }
    
    // Animation au défilement
    const animateOnScroll = function() {
        const elements = document.querySelectorAll('.service-card, .menu-item, .about-content');
        
        elements.forEach(element => {
            const position = element.getBoundingClientRect();
            
            // Si l'élément est visible à l'écran
            if(position.top < window.innerHeight - 100) {
                element.style.opacity = 1;
                element.style.transform = 'translateY(0)';
            }
        });
    };
    
    // Initialiser les styles pour l'animation
    const animatedElements = document.querySelectorAll('.service-card, .about-content');
    animatedElements.forEach(element => {
        element.style.opacity = 0;
        element.style.transform = 'translateY(50px)';
        element.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    });
    
    // Déclencher l'animation au chargement et au défilement
    window.addEventListener('load', animateOnScroll);
    window.addEventListener('scroll', animateOnScroll);
});

// Filtrage des éléments du menu par catégorie
const tabBtns = document.querySelectorAll('.tab-btn');
const menuItems = document.querySelectorAll('.menu-item');

tabBtns.forEach(btn => {
    btn.addEventListener('click', function() {
        // Retirer la classe active de tous les boutons
        tabBtns.forEach(b => b.classList.remove('active'));
        
        // Ajouter la classe active au bouton cliqué
        this.classList.add('active');
        
        // Récupérer la catégorie
        const category = this.getAttribute('data-category');
        
        // Afficher/masquer les éléments du menu
        menuItems.forEach(item => {
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
    });
});

// Animation des éléments du menu au chargement - Afficher seulement les entrées
setTimeout(() => {
    menuItems.forEach(item => {
        const itemCategory = item.getAttribute('data-category');
        if (itemCategory === 'entrees') {
            item.style.display = 'block';
            setTimeout(() => {
                item.classList.add('show');
            }, 10);
        } else {
            item.style.display = 'none';
            item.classList.remove('show');
        }
    });
}, 300);