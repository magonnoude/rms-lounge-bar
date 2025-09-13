
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const imageDir = './assets/images/';
const optimizedDir = './assets/images/optimized/';

// Créer le dossier optimized s'il n'existe pas
if (!fs.existsSync(optimizedDir)) {
    fs.mkdirSync(optimizedDir, { recursive: true });
}

// Liste des images à optimiser
const imagesToOptimize = [
    'background.jpg',
    'background-mobile.jpg',
    'about-bg.jpg',
    'services-bg.jpg',
    'menu-bg.jpg',
    'reservation-bg.jpg',
    'contact-bg.jpg',
    'gallery-1.jpg',
    'gallery-2.jpg',
    'gallery-3.jpg',
    'gallery-4.jpg'
];

async function optimizeImages() {
    console.log('🔄 Début de l\'optimisation des images...');
    
    for (const imageName of imagesToOptimize) {
        const inputPath = path.join(imageDir, imageName);
        const outputPathWebp = path.join(optimizedDir, imageName.replace(/\.(jpg|jpeg|png)$/, '.webp'));
        const outputPathJpg = path.join(optimizedDir, imageName);
        
        if (fs.existsSync(inputPath)) {
            try {
                // Conversion en WebP
                await sharp(inputPath)
                    .webp({ quality: 80 })
                    .toFile(outputPathWebp);
                
                // Compression JPG
                await sharp(inputPath)
                    .jpeg({ quality: 75, mozjpeg: true })
                    .toFile(outputPathJpg);
                
                console.log(`✅ ${imageName} optimisée`);
            } catch (error) {
                console.error(`❌ Erreur avec ${imageName}:`, error);
            }
        }
    }
    
    console.log('🎉 Optimisation terminée !');
}

optimizeImages();