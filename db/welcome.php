<?php
include 'templates/header.php';
// Initialize the session
// Check if the user is logged in, if not then redirect him to login page
if(!isset($_SESSION["loggedin"]) || $_SESSION["loggedin"] !== true){
    header("location: login.php");
    exit;
}
?>
    <div class="page-header">
        <h1>Bonjour, <b><?php echo htmlspecialchars($_SESSION["username"]); ?></b>. Bienvenue sur notre site "Un monde de livres".</h1>
    </div>
    <p>
        <a href="reset-password.php" class="btn btn-warning">Reinitialiser le mot de passe</a>
        <a href="logout.php" class="btn btn-danger">Se deconnecter</a>
    </p>
</body>
</html>