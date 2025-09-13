# Lounge - Site Web Élégant

![Lounge Preview](assets/images/preview.jpg)

Site web élégant pour un établissement lounge avec système de réservation et formulaire de contact.

## 🌟 Fonctionnalités

- **Design Responsive** - S'adapte à tous les appareils
- **Système de Réservation** - Formulaire de réservation en ligne
- **Formulaire de Contact** - Communication directe avec l'établissement
- **Menu Interactif** - Navigation par catégories
- **Animations Fluides** - Expérience utilisateur améliorée
- **Notifications** - Retour visuel pour les actions utilisateur

## 🛠️ Technologies Utilisées

- **HTML5** - Structure sémantique
- **CSS3** - Styles et animations
- **JavaScript ES6+** - Interactivité
- **AWS API Gateway** - Backend des formulaires
- **Fetch API** - Communications asynchrones

## 📋 Structure du Projet
lounge-website/
├── index.html
├── style.css
├── main.js
├── assets/
│ ├── images/
│ │ ├── logo.png
│ │ ├── background.jpg
│ │ └── background-mobile.jpg
│ └── icons/
├── README.md
└── .gitignore

## 🚀 Installation et Déploiement

1. **Cloner le repository**
   ```bash
   git clone https://github.com/votre-username/lounge-website.git
   cd lounge-website

   Ouvrir dans le navigateur

Double-cliquer sur index.html

Ou servir avec un serveur local:

bash
# Avec Python
python -m http.server 8000

# Avec Node.js
npx serve
Déploiement

Le site peut être déployé sur:

GitHub Pages

Netlify

Vercel

Serveur web traditionnel

📞 Formulaires
Réservation
Les clients peuvent réserver une table en spécifiant:

Nom et coordonnées

Date et heure

Nombre de personnes

Message spécial

Contact
Formulaire de contact pour:

Demandes d'information

Événements privés

Questions générales

🎨 Personnalisation
Modifier les couleurs
Dans style.css, modifier les variables CSS:

css
:root {
  --primary-color: #c89b3c;
  --secondary-color: #1a1a1a;
}
Ajouter des plats au menu
Modifier la section HTML du menu et mettre à jour les données JavaScript.

Changer les images
Remplacer les fichiers dans assets/images/ en conservant les mêmes noms.

🔧 Configuration API
Les formulaires sont connectés à une API AWS. La configuration se trouve dans main.js:

javascript
const API_CONFIG = {
  URL: 'https://xfpzt4zm66.execute-api.eu-west-3.amazonaws.com/prod/form',
  KEY: 'votre-clé-api'
};
🌐 Compatibilité
✅ Chrome (last 2 versions)

✅ Firefox (last 2 versions)

✅ Safari (last 2 versions)

✅ Edge (last 2 versions)

✅ Mobile browsers

📊 Performance
Score Lighthouse: 90+

Temps de chargement: < 3s

Taille totale: < 2MB

🤝 Contribution
Les contributions sont les bienvenues! Pour contribuer:

Fork le projet

Créer une branche feature (git checkout -b feature/AmazingFeature)

Commit les changes (git commit -m 'Add AmazingFeature')

Push sur la branche (git push origin feature/AmazingFeature)

Ouvrir une Pull Request

📝 License
Ce projet est sous licence MIT. Voir le fichier LICENSE pour plus de détails.

📞 Support
Pour toute question ou problème:

Ouvrir une issue sur GitHub

Contacter: modeste.agonnoude@gmail.com


## 3. Fichier .gitignore

Créez un fichier `.gitignore` pour exclure les fichiers inutiles:

```gitignore
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Production builds
build/
dist/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDE files
.vscode/
.idea/
*.swp
*.swo

# OS files
.DS_Store
Thumbs.db

# Logs
logs
*.log

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/
*.lcov

# Optional npm cache directory
.npm

# Optional REPL history
.node_repl_history
