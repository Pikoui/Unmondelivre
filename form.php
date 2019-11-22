<?php
include "templates/header.php";
?>

<div class="center">      
    <h1>Accès au jeu DWMQuest</h1>
</div>
<div class="center">
    <p>Entrer vos identifiants et mot de passe pour accéder à notre jeu DWMQuest.</p>
<br>
</div>
<div class="center"> 
    <form action ="login_game.php"method="POST">
        <table>
            <tr>
            <th>
                <label for="name">Nom d'utilisateur</label>
            </th>
         
            <th>
                <label for="password">Mot de passe </label>
            </th>   
            
            </tr>
            <tr>
            <td>
                <input type="text" name="username" placeholder="Votre login"required>
            </td>
            <td>
                <input type="password" name="password" placeholder="Votre Mot de passe"required>
            </td>
            </tr>
        </table>
        <div class="center">
            <input type="submit"value="Valider">
        </div>
        
    </form>
</div>
<div class="center">
    <h2>Nous contacter</h2>
</div>
<div class="center">
    <p>Vous pouvez nous envoyer vos suggestions de livres pour la prochaine Newsletter.</p>
</div>


<div class="center">
<form action= "biblio.php" method= "POST">
    
    <label for="authorName">Auteur</label>
    <input type="text" placeholder="Nom de l'auteur"required>
    <br><br>
    <label for="bookTitle">Titre du livre</label>
    <input type="text"placeholder="Titre du livre"required>
    <br><br>
    <label for="Pages">Nombre de Pages</label>
    <input type="text"placeholder="Nombre de Pages"required>
    <br><br>
    <label for="type">Genre</label>
    <br>
    <input type="checkbox" name="theme1" value="SF">Sciences Fictions<br>
    <input type="checkbox" name="theme2" value="Fantasy "> Fantastique<br>
    <input type="checkbox" name="theme3" value="Mangas" >Manga<br>
    <input type="checkbox" name="theme4" value="Comics"> Comics<br>
    <input type="checkbox" name="theme5" value="BD"> Bande Dessinée<br>
    <input type="checkbox" name="theme6" value="Policier"> Policier<br>
    <br><br>
    <div class="center">
        <input type="submit"value="Valider">
    </div>
    
</form>
<br><br><br>
</div>                                                                  



<?php
include "templates/footer.php";
?>