<?php
require_once 'config.php';

try {
    $db = getDB();
    echo "Connexion à la base de données réussie!<br>";
    
    // Vérifier si la table existe
    if (checkTableExists()) {
        echo "La table RMS-Submissions existe.<br>";
        
        // Compter le nombre d'entrées
        $query = "SELECT COUNT(*) as count FROM RMS_Submissions";
        $stmt = $db->prepare($query);
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        echo "Nombre d'entrées dans la table : " . $result['count'];
    } else {
        echo "La table RMS-Submissions n'existe pas.";
    }
    
} catch (PDOException $e) {
    echo "Erreur de connexion : " . $e->getMessage();
}
?>