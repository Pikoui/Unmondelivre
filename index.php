<?php
include 'templates/header.php';
?>

        <h1 class="mainTitle">Ma bibliothèque personnelle</h1>

        <p class="para">Bienvenue sur cette application Web. Ici, vous retrouverez un recensement de divers livres.
            Nous vous conseillerons certains de nos coups de coeur littéraires et proposerez un petit jeu dont VOUS serez le héros !
        </p>
        <img src="image/histoire.jpg" class="monde">
       
<script>
    // Emplacement de l'image
    book_img = "image/green.png";
    
    // Permet de reguler le nombre de sprites qui tombent
    book_no = 10;
    
    if (typeof(window.pageYOffset) == "number")
    {
        book_browser_width = window.innerWidth;
        book_browser_height = window.innerHeight;
    } 
    else if (document.body && (document.body.scrollLeft || document.body.scrollTop))
    {
        book_browser_width = document.body.offsetWidth;
        book_browser_height = document.body.offsetHeight;
    }
    else if (document.documentElement && (document.documentElement.scrollLeft || document.documentElement.scrollTop))
    {
        book_browser_width = document.documentElement.offsetWidth;
        book_browser_height = document.documentElement.offsetHeight;
    }
    else
    {
        book_browser_width = 500;
        book_browser_height = 500;	
    }
    
    book_dx = [];
    book_xp = [];
    book_yp = [];
    book_am = [];
    book_stx = [];
    book_sty = [];
    
    for (i = 0; i < book_no; i++) 
    { 
        book_dx[i] = 0; 
        book_xp[i] = Math.random()*(book_browser_width-50);
        book_yp[i] = Math.random()*book_browser_height;
        book_am[i] = Math.random()*20; 
        book_stx[i] = 0.02 + Math.random()/10;
        book_sty[i] = 0.7 + Math.random();
        if (i > 0) document.write("<\div id=\"book_flake"+ i +"\" style=\"position:absolute;z-index:"+i+"\"><\img src=\""+book_img+"\" border=\"0\"><\/div>"); else document.write("<\div id=\"book_flake0\" style=\"position:absolute;z-index:0\"><a href=\"http://peters1.dk/tools/snow.php\" target=\"_blank\"><\img src=\""+book_img+"\" border=\"0\"></a><\/div>");
    }
    
    function BookStart() 
    { 
        for (i = 0; i < book_no; i++) 
        { 
            book_yp[i] += book_sty[i];
            if (book_yp[i] > book_browser_height-50) 
            {
                book_xp[i] = Math.random()*(book_browser_width-book_am[i]-30);
                book_yp[i] = 0;
                book_stx[i] = 0.02 + Math.random()/10;
                book_sty[i] = 0.7 + Math.random();
            }
            book_dx[i] += book_stx[i];
            document.getElementById("book_flake"+i).style.top=book_yp[i]+"px";
            document.getElementById("book_flake"+i).style.left=book_xp[i] + book_am[i]*Math.sin(book_dx[i])+"px";
        }
        book_time = setTimeout("BookStart()", 10); //Permet de controler la vitesse a laquelle tombent les livres
    }
    BookStart();
 </script>