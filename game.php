<?php
include 'templates/header.php';
?>

<script src="js/jquery.min.js"></script>
<script src="js/story.js" charset="UTF-8"></script>
		 
		<script>
			jQuery(function($){
				$('#squiffy').squiffy();
				var restart = function () {
					$('#squiffy').squiffy('restart');
				};
				$('#restart').click(restart);
				$('#restart').keypress(function (e) {
					if (e.which !== 13) return;
					restart();
				});
			});
		</script>
		<link rel="stylesheet" href="style.css"/>
	</head>
	<body>
		<div id="squiffy-container">
			<div id="squiffy-header">
				<a class="squiffy-header-link" id="restart" tabindex="0">Restart</a>
			</div>
			<div id="squiffy">
			</div>
		</div>