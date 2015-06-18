(function () {
    "use strict";
	var
		async = require('async'),
		officegen = require('officegen'),
		wkhtmltoimage = require('wkhtmltoimage').setCommand("C:\\Program Files\\wkhtmltopdf\\bin\\wkhtmltoimage.exe"),
		path = require('path');

	function pnu_slide(callback2, tab2, pptx){
		var url = 'http://192.168.30.12:8888/pnu.html?';
		var slides = [];
		for (var iter=0; iter<=tab2[2];iter+=1){
			slides.push([tab2[0], tab2[1], iter]);
		}
		async.eachSeries(slides, function(tab, callback){
			slide_from_url(pptx, url+"sekcja="+tab[0]+"&projekt="+tab[1]+"&slajd="+tab[2], 'temp/'+tab[1]+tab[0]+tab[2]+'.png', callback);
		}, function(err){
			callback2();
		});
	}

	function slide_from_url(pptx, url, file, callback){
			// console.log(url);
			// console.log(file);
			var slide = pptx.makeNewSlide ();
			slide.addImage ( path.resolve(__dirname, 'img/stopka.png' ), { y: '89%', x: 0, cy: '12%', cx: '100%' } );
			slide.addText ( 'Raport z realizacji projektów z Planu Nowych Uruchomień', 
				{ y: '89%', x: '25%', cx: '75%', cy: '10%', font_face: 'Calibri', font_size: 16, align: 'center', color: 'FF6600', bold: true } 
			);
			wkhtmltoimage.generate(url, { output: file }, function(err){
				if (err)
					console.log ( err );
				slide.addImage ( path.resolve(__dirname, file ), { y: '1%', x: '1%', cx: '99%' } );
				callback(); 
			});
	}

	var gen_pptx = function(res, out) {
		var pptx = officegen ( 'pptx' )
			.on ( 'finalize', function ( written ) {
				console.log ( 'Finish to create a PowerPoint file.\nTotal bytes created: ' + written + '\n' );
			}).on ( 'error', function ( err ) {
				console.log ( err );
			});
		async.series([
			function(callback){ 
				console.log("first");
				var slide = pptx.makeNewSlide ();
				slide.addText ( 'Raport z realizacji projektów\n   z Planu Nowych Uruchomień', 
					{ y: 100, x: 100, cx: '75%', cy: 100, font_face: 'Calibri', font_size: 40, align: 'center', color: 'FF6600', bold: true } 
				);
				slide.addImage ( path.resolve(__dirname, 'img/kopex.png' ), { y: 300, x: 400, cy: '25%', cx: '53%' } );
				slide.addText ( 'Zabrze, dnia ......', { y: 550, x: 600}); 
				callback(); 
			},
//*
			function(callback){ slide_from_url(pptx, 'http://192.168.30.12:8888/pnu.html?slajd=1', 'temp/1.png', callback); },
			function(callback){ slide_from_url(pptx, 'http://192.168.30.12:8888/pnu.html?slajd=2', 'temp/2.png', callback); },
			function(callback){ slide_from_url(pptx, 'http://192.168.30.12:8888/pnu.html?slajd=3', 'temp/3.png', callback); },
			function(callback){ slide_from_url(pptx, 'http://192.168.30.12:8888/pnu.html?slajd=4', 'temp/4.png', callback); },
			function(callback){ slide_from_url(pptx, 'http://192.168.30.12:8888/pnu.html?slajd=0', 'temp/0.png', callback); },
			// function(callback){ slide_from_url(pptx, 'http://192.168.30.12:8888/pnu.html?slajd=5', 'temp/5.png', callback); },
			// function(callback){ slide_from_url(pptx, 'http://192.168.30.12:8888/pnu.html?slajd=6', 'temp/6.png', callback); },
//*/
			function(callback){ pnu_slide(callback, ["Z", 63, 2], pptx); },
			function(callback){ pnu_slide(callback, ["Z", 66, 8], pptx); },
//*/
			// function(callback){ pnu_slide(callback, ["Z", 69, 1], pptx); },
			function(callback){ pnu_slide(callback, ["Z", 70, 1], pptx); },
			function(callback){ pnu_slide(callback, ["Z", 77, 3], pptx); },
			function(callback){ pnu_slide(callback, ["Z", 78, 2], pptx); },
			function(callback){ pnu_slide(callback, ["Z", 79, 1], pptx); },
			function(callback){ pnu_slide(callback, ["Z", 80, 1], pptx); },
			function(callback){ pnu_slide(callback, ["Z", 81, 1], pptx); },
			
			function(callback){ pnu_slide(callback, ["RY", 1, 2], pptx); },
			function(callback){ pnu_slide(callback, ["RY", 2, 3], pptx); },
			// function(callback){ pnu_slide(callback, ["RY", 3, 1], pptx); },
			function(callback){ pnu_slide(callback, ["RY", 4, 2], pptx); },
			// function(callback){ pnu_slide(callback, ["RY", "4w2", 1], pptx); },
			function(callback){ pnu_slide(callback, ["RY", 5, 1], pptx); },
			function(callback){ pnu_slide(callback, ["RY", 6, 1], pptx); },
			function(callback){ pnu_slide(callback, ["W", 1, 1], pptx); },
			function(callback){ pnu_slide(callback, ["W", 2, 1], pptx); },
			// function(callback){ pnu_slide(callback, ["W", 3, 1], pptx); },
			function(callback){ pnu_slide(callback, ["W", 4, 1], pptx); },
			function(callback){ pnu_slide(callback, ["W", 5, 1], pptx); },
			function(callback){ pnu_slide(callback, ["DHTP", 1, 2], pptx); },
// */
			function(callback){ 
				console.log("last");
				var slide = pptx.makeNewSlide ();
				slide.addText ( 'DZIĘKUJĘ ZA UWAGĘ', 
					{ y: 100, x: 100, cx: '75%', cy: 100, font_face: 'Calibri', font_size: 40, align: 'center', color: 'FF6600', bold: true } 
				);
				slide.addImage ( path.resolve(__dirname, 'img/kopex.png' ), { y: 300, x: 400, cy: '25%', cx: '53%' } );
				callback(); 
			}
		],
		function(err, results){
			console.log("final");
			if (err) {console.log(err);}
			pptx.generate ( res );
			if (out)
				pptx.generate ( out );
		});
	}
    module.exports.prezentacja = gen_pptx;
	
}());		