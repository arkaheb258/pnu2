// main.js
(function () {
    "use strict";
    var //express = require('express'),
		email   = require("emailjs"),
		fs = require('fs'),
		common = require('./pnu_common.js'),
		baza = require('./dane_z_bazy.js'),
		xlsx_gen = require('./xlsx_gen.js'),
		pptx_gen = require('./pptx_gen.js'),
		// e4n = require('excel4node'),
		app = require('express')(),
		server = require('http').Server(app),
        // io = require('socket.io')(server),
		compression = require('compression'),
		// util = require('util'),
		port = process.env.PORT || 8888;        // set our port

	var email_server  = email.server.connect({
	   user:    "karta.pracy.kmsa", 
	   password:"", 
	   host:    "domino1.kopex.com.pl", 
	   ssl:     true
	});
		
	baza.refresh_data();
	var timer = setInterval(baza.refresh_data, 10*60*1000);	//co 10 minut

	app.use(compression());
	app.use(function (req, res, next) {
		console.log(req.connection.remoteAddress + " -> " + req.url);
		next();
	});

	app.set('views', __dirname + '/views')
	app.set('view engine', 'jade')
	
	app.get('/', function (req, res) {
		res.redirect('/pnu.html');
	})

	app.get('/pnu.html', function (req, res) {
		console.log(req.query);
		var renderrer = 'pnu';
		if (req.query.edit) {
			renderrer = 'edit_' + renderrer;
		}
		if (req.query.sekcja && req.query.projekt) {
			var rbh_all = {};
			for (var ei in baza.dane().karty_pr_pnu[req.query.sekcja][req.query.projekt]) {
				for (var zi in baza.dane().karty_pr_pnu[req.query.sekcja][req.query.projekt][ei]) {
					for (var yi in baza.dane().karty_pr_pnu[req.query.sekcja][req.query.projekt][ei][zi]) {
						for (var mi in baza.dane().karty_pr_pnu[req.query.sekcja][req.query.projekt][ei][zi][yi]) {
							if (!rbh_all[yi]) rbh_all[yi] = {};
							if (!rbh_all[yi][mi]) rbh_all[yi][mi] = {};
							if (!rbh_all[yi][mi][ei]) rbh_all[yi][mi][ei] = {};
							if (!rbh_all[yi][mi][ei][zi]) rbh_all[yi][mi][ei][zi] = {};
							var osoby = baza.dane().karty_pr_pnu[req.query.sekcja][req.query.projekt][ei][zi][yi][mi].osoby;
							for (var oi in osoby){
								if (oi == "obj_length") continue;
								if (!rbh_all[yi][mi][ei][zi][oi]) { 
									rbh_all[yi][mi][ei][zi][oi] = {nr:osoby[oi].nr, nazwa: osoby[oi].nazwa, ile_kp: osoby[oi].ile};
								} else {
									rbh_all[yi][mi][ei][zi][oi].ile_kp = osoby[oi].ile;
								}
							}
						}
					}
				}
			}
			for (var ei in baza.dane().rbh_sprzedane[req.query.sekcja][req.query.projekt]) {
				for (var zi in baza.dane().rbh_sprzedane[req.query.sekcja][req.query.projekt][ei]) {
					for (var yi in baza.dane().rbh_sprzedane[req.query.sekcja][req.query.projekt][ei][zi]) {
						for (var mi in baza.dane().rbh_sprzedane[req.query.sekcja][req.query.projekt][ei][zi][yi]) {
							if (!rbh_all[yi]) rbh_all[yi] = {};
							if (!rbh_all[yi][mi]) rbh_all[yi][mi] = {};
							if (!rbh_all[yi][mi][ei]) rbh_all[yi][mi][ei] = {};
							if (!rbh_all[yi][mi][ei][zi]) rbh_all[yi][mi][ei][zi] = {};
							var osoby = baza.dane().rbh_sprzedane[req.query.sekcja][req.query.projekt][ei][zi][yi][mi];
							for (var oi in osoby){
								// if (oi == "obj_length") continue;
								if (!rbh_all[yi][mi][ei][zi][oi]) { 
									rbh_all[yi][mi][ei][zi][oi] = {nr:osoby[oi].nr, nazwa: osoby[oi].nazwa, ile: osoby[oi].ile};
								} else {
									rbh_all[yi][mi][ei][zi][oi].ile = osoby[oi].ile;
								}
							}
						}
					}
				}
			}

			// console.log(JSON.stringify(baza.dane().projekt[req.query.sekcja][req.query.projekt].weryfikacja));
			// baza.dane().projekt[req.query.sekcja][req.query.projekt].w = JSON.stringify(baza.dane().projekt[req.query.sekcja][req.query.projekt].weryfikacja['01.01.1970 r.']);
			res.render(renderrer, {
				projekt: baza.dane().projekt[req.query.sekcja][req.query.projekt],
				// rbh_mies : baza.dane().rbh_mies[req.query.sekcja][req.query.projekt],
				// budzet_mies : baza.dane().budzet_mies[req.query.sekcja][req.query.projekt],
				karty_pr : baza.dane().karty_pr_pnu[req.query.sekcja][req.query.projekt],
				osoby : baza.dane().osoby,
				rbh_all : rbh_all,
				rbh_sprzedane : baza.dane().rbh_sprzedane[req.query.sekcja][req.query.projekt],
				query: req.query,
				ip: req.connection.remoteAddress
			});
			// console.log(budzet_mies[req.query.sekcja][req.query.projekt]);
		} else {
			var suma = {budzet_plan: 0, budzet_wyk: 0, rbh_plan: 0, rbh_wyk:0};
			for (var si in baza.dane().projekt){
				for (var pi in baza.dane().projekt[si]) {
					var p = baza.dane().projekt[si][pi];
					if (p.status != 1) continue;
					suma.budzet_plan += p.budzet_plan;
					suma.budzet_wyk += p.budzet_wyk;
					suma.rbh_plan += p.rbh_plan;
					suma.rbh_wyk += p.rbh_wyk.sum;
				}
			}
			res.render(renderrer+'_all', {
				pnu: baza.dane().projekt,
				query: req.query,
				karty_pr : baza.dane().karty_pr_pnu,
				suma: suma
			});
		}
	})

	app.get('/projekt.json', function (req, res) {
		if (req.query.sekcja && req.query.projekt) {
			res.jsonp(baza.dane().projekt[req.query.sekcja][req.query.projekt]);
		} else {
			res.jsonp(baza.dane().projekt);
		}
	});

	app.get('/projekt.html', function (req, res) {
		if (req.query.sekcja) {
			if (req.query.projekt) {
				res.send("<pre>projekt:"+JSON.stringify(baza.dane().projekt[req.query.sekcja][req.query.projekt], null, 4)+"</pre>"
				+"<pre>karty_pr:"+JSON.stringify(baza.dane().karty_pr_pnu[req.query.sekcja][req.query.projekt], null, 4)+"</pre>");	//4 spacje
			} else {
				res.send("<pre>"+JSON.stringify(baza.dane().projekt[req.query.sekcja], null, 4)+"</pre>");	//4 spacje
			}
		} else {
			res.send("<pre>"+JSON.stringify(baza.dane().projekt, null, 4)+"</pre>");
		}
	});
	
	app.get('/projekt.pptx', function (req, res) {
		var out = fs.createWriteStream ( 'out.pptx' );
		pptx_gen.prezentacja(res, out);
	});

	app.get('/pnu.xlsx', function (req, res) {
		var out = fs.createWriteStream ( 'out.xlsx' );
		xlsx_gen.generuj(baza.dane().projekt, res, out);
	});

	app.get('/out.pptx', function (req, res) {
		var filestream = fs.createReadStream(__dirname + '/out.pptx');
		res.setHeader('Content-disposition', 'attachment; filename=pnu.pptx');
		filestream.pipe(res);
    });

	app.get('/out.xlsx', function (req, res) {
		var filestream = fs.createReadStream(__dirname + '/out.xlsx');
		res.setHeader('Content-disposition', 'attachment; filename=pnu.xlsx');
		filestream.pipe(res);
    });
	
	app.get('/pnu.js', function (req, res) {
		res.send("pnu = "+JSON.stringify(baza.dane().pnu)+";");
	});

	app.get('/osoby.js', function (req, res) {
		res.send("osoby = "+JSON.stringify(baza.dane().osoby)+";");
	});

	app.get('/edytuj', function (req, res) {
		// console.log(req.query);
		if (req.query.table && req.query.id && req.query.col ) {
			baza.edytuj(req.query.table, req.query.id, req.query.col, req.query.val, function(err){
				var refresh_table = "zad";
				if (req.query.table == "rbh")
					refresh_table = "rbh";
				baza.refresh_data(refresh_table, function(){
					res.jsonp(err);
				});
			});
		} else
			res.jsonp("ERR");
	});
	
	app.get('/sprzedaj', function (req, res) {
		// console.log(req.query);
		if ((req.query.year && req.query.year >=2014 && req.query.year < 2050)
		&& (req.query.month && req.query.month > 0 && req.query.month < 13)
		&& (req.query.rbh && req.query.rbh >= 0 && req.query.rbh < 400)
		) {
			baza.sprzedaj(req.query.proj_id, req.query.year, req.query.month, req.query.kto_id, req.query.rbh, function(err){
				baza.refresh_data("rbh", function(){
					res.jsonp(err);
				});
			});
		} else
			res.jsonp("ERR");
	});
	
	app.get('/email', function (req, res) {
		if ((req.query.od && req.query.kto && req.query.co)) {
			var adresaci = req.query.kto;
			var to = ""
			for (var ik in adresaci) {
				var kto = baza.dane().osoby[adresaci[ik]];
				if (kto) {
					if (to != "")
						to += ", ";
					to += kto.nazwa + "<" + kto.email + ">";
				}
				// console.log(kto);
			}
			var kto = baza.dane().osoby[od];
			if (od && kto) {
				od = kto.nazwa + "<" + kto.email + ">";
			} else {
				od = "Karty Pracy<karta.pracy.kmsa@kopex.com.pl>";
			}
			console.log(od);
			console.log(to);
			console.log(req.query.co);
			if (false)
			email_server.send({
			   // text:    "...<html></html>...", 
			   text:    req.query.co, 
			   from:    od, 
			   to:      to,
			   subject: "[KP]Powiadomienie z Kart Pracy",
			   attachment: [{data:req.query.co, alternative:true}]
			}, function(err, message) { 
				console.log(err || message); 
				if (err) {
					console.log("err");
					console.log(typeof  err);
					console.log(err);
					res.jsonp(err);
				} else {
					res.jsonp("OK");
					console.log(message); 
				}
			});
		} else
			res.jsonp("ERR");
	});

	app.get('/refresh', function (req, res) {
		baza.refresh_data("all");
		clearInterval(timer);
		timer = setInterval(baza.refresh_data, 10*60*1000);	//co 10 minut
		res.send("Dane odświerzone " + baza.dane().counter);
	});
	
	app.get('/budzet_mies.json', function (req, res) {
		res.jsonp(baza.dane().budzet_mies);
		// res.send("budzet_mies = "+JSON.stringify(budzet_mies)+";");
	});

	app.get('/karty_pr_pnu.json', function (req, res) {
		res.jsonp(baza.dane().karty_pr_pnu);
	});

	app.get('/konta.xlsx', function (req, res) {
		// console.log(req.query);
		var date = new Date();
		var year = date.getFullYear();
		var month = date.getMonth()+1;
		if (req.query.year && req.query.year >=2014 && req.query.year < 2050) year = req.query.year;
		if (req.query.month && req.query.month > 0 && req.query.month < 13) month = req.query.month;
		xlsx_gen.konta(baza.dane().projekt, year, (month-1), date, function(wb){
			wb.write(year+"_"+common.pad(month)+".xlsx",res);
		});
	});
	
    server.listen(port, function () {
        console.log("HTTP Server listening on port " + port);
    });

/*	
	app.get('/root_f.json', function (req, res) {
		fs.readFile(__dirname + '/root.json', 'utf8', function (err, data) {
			if (err) throw err;
			var obj = JSON.parse(data.toString('utf8').replace(/^\uFEFF/, ''));
			res.jsonp(obj);
		});
    });

    io.on('connection', function (socket) {
		socket.emit('dane', {error: "Dane nie gotowe - oczekiwanie na PLC"});
		socket.on('strada', function (msg) {
			console.log('strada: ' + msg);
		});
    });
*/	
})();