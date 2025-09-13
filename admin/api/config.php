<?php
// Configuration de la base de données RMS-Submissions
define('DB_HOST', 'localhost'); // Hôte de la base de données
define('DB_NAME', 'rms_database'); // Nom de la base de données
define('DB_USER', 'rms_user'); // Utilisateur de la base
define('DB_PASS', 'rms_password'); // Mot de passe de la base

// Connexion à la base de données
function getDB() {
    static $db = null;
    
    if ($db === null) {
        try {
            $db = new PDO(
                "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8",
                DB_USER,
                DB_PASS,
                [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
            );
        } catch (PDOException $e) {
            die('Erreur de connexion à la base de données : ' . $e->getMessage());
        }
    }
    
    return $db;
}

// Fonction pour valider et nettoyer les données
function sanitizeInput($data) {
    return htmlspecialchars(strip_tags(trim($data)));
}

// Headers pour les requêtes AJAX
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Vérifier si la table RMS-Submissions existe
function checkTableExists() {
    $db = getDB();
    
    try {
        $query = "SHOW TABLES LIKE 'RMS_Submissions'";
        $stmt = $db->prepare($query);
        $stmt->execute();
        
        return $stmt->rowCount() > 0;
    } catch (PDOException $e) {
        return false;
    }
}

// Créer la table RMS-Submissions si elle n'existe pas
function createTableIfNotExists() {
    $db = getDB();
    
    if (!checkTableExists()) {
        try {
            $query = "CREATE TABLE RMS_Submissions (
                id INT(11) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL,
                phone VARCHAR(50) NOT NULL,
                date DATE NOT NULL,
                time TIME NOT NULL,
                guests INT(3) NOT NULL,
                message TEXT,
                status VARCHAR(20) DEFAULT 'pending',
                type VARCHAR(20) DEFAULT 'reservation',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )";
            
            $stmt = $db->prepare($query);
            $stmt->execute();
            
            // Insérer des données d'exemple
            insertSampleData();
            
        } catch (PDOException $e) {
            die('Erreur lors de la création de la table : ' . $e->getMessage());
        }
    }
}

// Insérer des données d'exemple
function insertSampleData() {
    $db = getDB();
    
    $sampleReservations = [
        [
            'name' => 'Jean Dupont',
            'email' => 'jean.dupont@email.com',
            'phone' => '0123456789',
            'date' => date('Y-m-d'),
            'time' => '20:00:00',
            'guests' => 4,
            'message' => 'Je souhaite une table près de la fenêtre s\'il vous plaît.',
            'status' => 'pending',
            'type' => 'reservation'
        ],
        [
            'name' => 'Marie Martin',
            'email' => 'marie.martin@email.com',
            'phone' => '0987654321',
            'date' => date('Y-m-d'),
            'time' => '20:30:00',
            'guests' => 2,
            'message' => 'Anniversaire de mariage',
            'status' => 'confirmed',
            'type' => 'reservation'
        ],
        [
            'name' => 'Paul Durand',
            'email' => 'paul.durand@email.com',
            'phone' => '0654321789',
            'date' => date('Y-m-d'),
            'time' => '21:00:00',
            'guests' => 6,
            'message' => 'Dîner d\'affaires',
            'status' => 'pending',
            'type' => 'reservation'
        ]
    ];
    
    $sampleMessages = [
        [
            'name' => 'Sophie Martin',
            'email' => 'sophie.martin@email.com',
            'phone' => '0678912345',
            'date' => date('Y-m-d', strtotime('-2 days')),
            'time' => '14:25:00',
            'guests' => 0,
            'message' => 'Bonjour, je souhaiterais réserver une table pour 4 personnes le 15 décembre. Cependant, l\'un des convives a une allergie aux fruits de mer. Est-il possible d\'adapter le menu en conséquence ? Merci de votre réponse.',
            'status' => 'unread',
            'type' => 'contact'
        ],
        [
            'name' => 'Luc Tremblay',
            'email' => 'luc.tremblay@email.com',
            'phone' => '0698765432',
            'date' => date('Y-m-d', strtotime('-3 days')),
            'time' => '10:15:00',
            'guests' => 0,
            'message' => 'Bonjour, nous souhaitons organiser un événement d\'entreprise pour 25 personnes. Quelles sont les possibilités et disponibilités pour la première quinzaine de janvier ?',
            'status' => 'read',
            'type' => 'contact'
        ]
    ];
    
    try {
        $query = "INSERT INTO RMS_Submissions (name, email, phone, date, time, guests, message, status, type) 
                  VALUES (:name, :email, :phone, :date, :time, :guests, :message, :status, :type)";
        
        $stmt = $db->prepare($query);
        
        // Insérer les réservations d'exemple
        foreach ($sampleReservations as $reservation) {
            $stmt->execute($reservation);
        }
        
        // Insérer les messages d'exemple
        foreach ($sampleMessages as $message) {
            $stmt->execute($message);
        }
        
    } catch (PDOException $e) {
        // Ne pas afficher d'erreur pour ne pas perturber le fonctionnement
    }
}

// Vérifier et créer la table au chargement
createTableIfNotExists();
?>