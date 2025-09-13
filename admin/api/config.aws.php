<?php
// Configuration AWS RDS
define('DB_HOST', 'rms-mysql-db.ctesoe4w4og6.eu-west-3.rds.amazonaws.com'); // Endpoint RDS
define('DB_NAME', 'rms-mysql-db'); // Nom de la base
define('DB_USER', 'admin'); // Utilisateur master
define('DB_PASS', 'adminDB4RMSLounge'); // Mot de passe RDS
define('DB_PORT', '3306'); // Port MySQL

// Connexion à la base de données AWS RDS
function getDB() {
    static $db = null;
    
    if ($db === null) {
        try {
            $db = new PDO(
                "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=utf8",
                DB_USER,
                DB_PASS,
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_PERSISTENT => false, // Important pour RDS
                    PDO::ATTR_TIMEOUT => 30 // Timeout de 30 secondes
                ]
            );
        } catch (PDOException $e) {
            error_log('Erreur de connexion AWS RDS: ' . $e->getMessage());
            die('Erreur de connexion à la base de données. Veuillez réessayer plus tard.');
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

// Vérifier si la table RMS_Submissions existe
function checkTableExists() {
    $db = getDB();
    
    try {
        $query = "SHOW TABLES LIKE 'RMS_Submissions'";
        $stmt = $db->prepare($query);
        $stmt->execute();
        
        return $stmt->rowCount() > 0;
    } catch (PDOException $e) {
        error_log('Erreur vérification table: ' . $e->getMessage());
        return false;
    }
}

// Créer la table RMS-Submissions avec structure optimisée pour AWS
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
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_status (status),
                INDEX idx_date (date),
                INDEX idx_type (type),
                INDEX idx_email (email)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
            
            $stmt = $db->prepare($query);
            $stmt->execute();
            
            // Insérer des données d'exemple
            insertSampleData();
            
        } catch (PDOException $e) {
            error_log('Erreur création table: ' . $e->getMessage());
        }
    }
}

// Insérer des données d'exemple optimisées
function insertSampleData() {
    $db = getDB();
    
    $sampleData = [
        // Réservations
        [
            'name' => 'Jean Dupont', 'email' => 'jean.dupont@email.com', 'phone' => '0123456789',
            'date' => date('Y-m-d'), 'time' => '20:00:00', 'guests' => 4,
            'message' => 'Table près de la fenêtre', 'status' => 'pending', 'type' => 'reservation'
        ],
        [
            'name' => 'Marie Martin', 'email' => 'marie.martin@email.com', 'phone' => '0987654321',
            'date' => date('Y-m-d'), 'time' => '20:30:00', 'guests' => 2,
            'message' => 'Anniversaire de mariage', 'status' => 'confirmed', 'type' => 'reservation'
        ],
        [
            'name' => 'Paul Durand', 'email' => 'paul.durand@email.com', 'phone' => '0654321789',
            'date' => date('Y-m-d', strtotime('+1 day')), 'time' => '21:00:00', 'guests' => 6,
            'message' => 'Dîner d\'affaires', 'status' => 'pending', 'type' => 'reservation'
        ],
        
        // Messages de contact
        [
            'name' => 'Sophie Martin', 'email' => 'sophie.martin@email.com', 'phone' => '0678912345',
            'date' => date('Y-m-d', strtotime('-2 days')), 'time' => '14:25:00', 'guests' => 0,
            'message' => 'Question sur les allergies alimentaires', 'status' => 'unread', 'type' => 'contact'
        ],
        [
            'name' => 'Luc Tremblay', 'email' => 'luc.tremblay@email.com', 'phone' => '0698765432',
            'date' => date('Y-m-d', strtotime('-3 days')), 'time' => '10:15:00', 'guests' => 0,
            'message' => 'Événement d\'entreprise pour 25 personnes', 'status' => 'read', 'type' => 'contact'
        ]
    ];
    
    try {
        $query = "INSERT INTO RMS_Submissions (name, email, phone, date, time, guests, message, status, type) 
                  VALUES (:name, :email, :phone, :date, :time, :guests, :message, :status, :type)";
        
        $stmt = $db->prepare($query);
        
        foreach ($sampleData as $data) {
            $stmt->execute($data);
        }
        
    } catch (PDOException $e) {
        error_log('Erreur insertion données: ' . $e->getMessage());
    }
}

// Vérifier et créer la table au chargement
createTableIfNotExists();
?>