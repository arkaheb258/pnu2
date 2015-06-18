// main.js
(function () {
    "use strict";
    var express = require('express'),
		fs = require('fs'),
		// sql = require('mssql'),
		// mysql = require('mysql'),
		// async = require('async'), 
		common = require('./pnu_common.js'),
		e4n = require('excel4node'),
		app = express(),
		server = require('http').Server(app),
        io = require('socket.io')(server),
		baza = require('./dane_z_bazy.js'),
		compression = require('compression'),
		util = require('util'),
		port = process.env.PORT || 8888;        // set our port
/*
	var config = {
		user: 'user1',
		password: 'kopex',
		server: '192.168.30.12\\SQLEXPRESS',
		options: {
			encrypt: true // Use this if you're on Windows Azure
		}
	}
	var connection = new sql.Connection(config);
	var request = new sql.Request(connection);
	var karty_pr = mysql.createConnection({
		host     : '127.0.0.1',
		database : 'wwwkop',
		user     : 'pnu',
		password : 'kopex'
	});

	var projekt = {};
	var weryfikacja = {data:[], proj:{}};
	var budzet_mies = {};
	var rbh_mies = {};
	var karty_pr_pnu = {};

	var pnu = {};
	var mpk = {};

	function refresh_data(steps){
		if (!steps) steps = 30;
		async.series([
			function(callback){ console.log(" 0 polaczenie z baza mssql");
				connection.connect(function(err) {
					if (err && (err.code != 'EALREADYCONNECTED')) callback(err);
					else callback();
				});
			},
			function(callback){ if (steps < 1) {callback(); return;} else console.log(" 1 projekty, etapy i prowadzacy");
	//			'select osoby.nazwa as prowadzacy, projekty.*, etap.opis AS etap_opis, etap.nr AS etap_nr, etap.start AS etap_start, etap.stop AS etap_stop from PNU.dbo.etap LEFT JOIN PNU.dbo.projekty on projekty.id = etap.id_proj LEFT JOIN PNU.dbo.przypis on przypis.nr_proj = projekty.id LEFT JOIN PNU.dbo.osoby on osoby.nr = przypis.nr_osoby', 
				request.query(
				"SELECT p.*, \
					e.opis AS etap_opis, e.nr AS etap_nr, e.data_start AS etap_start, e.data_end AS etap_stop, \
					o.nazwa AS prowadzacy \
					FROM PNU.dbo.etap e \
					LEFT JOIN PNU.dbo.projekty p ON p.id = e.id_proj \
					LEFT JOIN PNU.dbo.przypis prz ON prz.id_proj = p.id \
					LEFT JOIN PNU.dbo.osoby o ON o.id = prz.id_osoby "
//					WHERE p.status = 1"
				, function(err, sqlData) {
					if (err) { callback(err); }
					else {
						sqlData.forEach(function(i){
							if (!i.oddzial) { i.oddzial = 'Z'; } 
							if (!projekt[i.oddzial]) projekt[i.oddzial] = {};
							if (!projekt[i.oddzial][i.nr]) {
								i.etap = {};
								projekt[i.oddzial][i.nr] = i;
							}
							// if (!projekt[i.oddzial][i.nr].etap[i.etap_nr]) 
							projekt[i.oddzial][i.nr].etap[i.etap_nr] = {opis: 'ETAP ' + common.toRoman(i.etap_nr) + ' ' + i.etap_opis, nr: i.etap_nr, data_start: i.etap_start, data_end: i.etap_stop, zad_gl:{}};
							delete projekt[i.oddzial][i.nr].etap_opis;
							delete projekt[i.oddzial][i.nr].etap_start;
							delete projekt[i.oddzial][i.nr].etap_stop;
						});
	// for (var pi in projekt) { console.log(pi); }
	// console.log(projekt);
						callback(null);
					}
				});
			},
			function(callback){ if (steps < 2) {callback(); return;} else console.log(" 2 zad_gl");
				request.query(
				"SELECT zg.*, e.nr AS etap_nr, p.oddzial AS proj_oddzial, p.nr AS proj_nr \
					FROM PNU.dbo.zad_gl zg \
					LEFT JOIN PNU.dbo.etap e ON zg.id_etap = e.id \
					LEFT JOIN PNU.dbo.projekty p ON e.id_proj = p.id \
					ORDER BY proj_oddzial DESC, proj_nr ASC, etap_nr, zg.nr"
//				WHERE p.status = 1

				, function(err, sqlData) {
					if (err) { callback(err); }
					else {
						sqlData.forEach(function(i){
							i.zad_sz = {};
							projekt[i.proj_oddzial][i.proj_nr].etap[i.etap_nr].zad_gl[i.nr] = i;
						});
						callback(null);
					}
				});
			},
			function(callback){ if (steps < 3) {callback(); return;} else console.log(" 3 zad_sz");
				request.query(
				"SELECT zad_sz.*, zad_gl.nr AS zad_gl_nr, etap.nr AS etap_nr, p.oddzial AS proj_oddzial, p.nr AS proj_nr \
					FROM PNU.dbo.zad_sz \
					LEFT JOIN PNU.dbo.zad_gl ON zad_gl.id = zad_sz.id_gl \
					LEFT JOIN PNU.dbo.etap ON etap.id = zad_gl.id_etap \
					LEFT JOIN PNU.dbo.projekty p ON p.id = etap.id_proj \
					ORDER BY proj_oddzial DESC, etap_nr ASC, proj_nr ASC, zad_gl_nr ASC, zad_sz.nr ASC"
				// WHERE p.status = 1
				, function(err, sqlData) {
					if (err) { callback(err); }
					else {
						sqlData.forEach(function(i){
							if (projekt[i.proj_oddzial][i.proj_nr].etap[i.etap_nr].zad_gl[i.zad_gl_nr].zad_sz[i.nr]) { 
								console.log("duplikat proj:"+i.proj_nr+" etap:"+i.etap_nr+" zad_gl:"+i.zad_gl_nr+" zad_sz:"+i.nr+" id="+i.id);
							}
							projekt[i.proj_oddzial][i.proj_nr].etap[i.etap_nr].zad_gl[i.zad_gl_nr].zad_sz[i.nr] = i;
						});
						callback(null);
					}
				});
			},
			function(callback){ if (steps < 4) {callback(); return;} else console.log(" 4 konta / salda");
				//docelowo scalic z "projekt"
				request.query(
				"SELECT s.*, k.opis AS konto_nazwa, zg.nr AS zad_gl_nr, e.nr AS etap_nr, p.oddzial AS proj_oddzial, p.nr AS proj_nr \
					FROM [PNU].[dbo].[salda] s \
					FULL JOIN  [PNU].[dbo].[konta] k ON (s.id_konta = k.id) \
					LEFT JOIN  [PNU].[dbo].[zad_gl] zg ON (zg.id = k.id_gl) \
					LEFT JOIN PNU.dbo.etap e ON e.id = zg.id_etap \
					LEFT JOIN PNU.dbo.projekty p ON p.id = e.id_proj \
					ORDER BY s.data"
				, function(err, sqlData) {
					if (err) { callback(err); }
					else {
						sqlData.forEach(function(i){
							if (i.zad_gl_nr) {
								// if (!projekt[i.proj_oddzial][i.proj_nr].etap[i.etap_nr].zad_gl[i.zad_gl_nr].konta) { 
									// projekt[i.proj_oddzial][i.proj_nr].etap[i.etap_nr].zad_gl[i.zad_gl_nr].konta = {}
								// }
								// if (!projekt[i.proj_oddzial][i.proj_nr].etap[i.etap_nr].zad_gl[i.zad_gl_nr].konta[i.id_konta]) { 
									// projekt[i.proj_oddzial][i.proj_nr].etap[i.etap_nr].zad_gl[i.zad_gl_nr].konta[i.id_konta] = {nazwa: i.konto_nazwa, data:{}};
								// }
								if (!projekt[i.proj_oddzial][i.proj_nr].etap[i.etap_nr].zad_gl[i.zad_gl_nr].konto) { 
									projekt[i.proj_oddzial][i.proj_nr].etap[i.etap_nr].zad_gl[i.zad_gl_nr].konto = {nazwa: i.konto_nazwa, data:{}};
								}
								// projekt[i.proj_oddzial][i.proj_nr].etap[i.etap_nr].zad_gl[i.zad_gl_nr].konta[i.id_konta].data[i.data] = i.stan;
								projekt[i.proj_oddzial][i.proj_nr].etap[i.etap_nr].zad_gl[i.zad_gl_nr].konto.data[i.data] = i.stan;
							}
						});
						callback(null);
					}
				});
			},
			function(callback){ if (steps < 5) {callback(); return;} else console.log(" 5 weryfikacje");
				//docelowo scalic z "projekt"
				request.query(
				"SELECT w.*, p.oddzial AS proj_oddzial, p.nr AS proj_nr, e.nr AS etap_nr, zg.nr AS zad_gl_nr, zs.nr AS zad_sz_nr, o.nazwa AS kto, o.dzial AS kto_dzial, o.id AS kto_nr \
					FROM PNU.dbo.weryfikacja w \
					LEFT JOIN PNU.dbo.zad_sz zs ON zs.id = w.id_sz \
					LEFT JOIN PNU.dbo.zad_gl zg ON zg.id = COALESCE(w.id_gl, zs.id_gl) \
					LEFT JOIN PNU.dbo.etap e ON e.id = zg.id_etap \
					LEFT JOIN PNU.dbo.projekty p ON p.id = COALESCE(w.id_proj, e.id_proj) \
					LEFT JOIN PNU.dbo.osoby o ON o.id = w.nr_osoby \
					ORDER BY kiedy"
				, function(err, sqlData) {
					if (err) { callback(err); }
					else {
						weryfikacja = {data:[], proj:{}};
						sqlData.forEach(function(i){
							var d = new Date(i.kiedy);
							var dd = common.formatDate(d);
							if (!i.proj_oddzial || !i.proj_nr) {
								if (!weryfikacja.data[dd])
									weryfikacja.data[dd] = [];
								weryfikacja.data[dd].push(i.co);
							} else {
// if (!weryfikacja.proj[i.proj_oddzial + " " + i.proj_nr])
	// weryfikacja.proj[i.proj_oddzial + " " + i.proj_nr] = {data:[], etap_zad:{}};
								if (!i.etap_nr || !i.zad_gl_nr) {
// if (!weryfikacja.proj[i.proj_oddzial + " " + i.proj_nr].data[dd])
	// weryfikacja.proj[i.proj_oddzial + " " + i.proj_nr].data[dd] = [];
// weryfikacja.proj[i.proj_oddzial + " " + i.proj_nr].data[dd].push(i.co);
									if (!projekt[i.proj_oddzial][i.proj_nr].weryfikacja)
										projekt[i.proj_oddzial][i.proj_nr].weryfikacja = [];
									if (!projekt[i.proj_oddzial][i.proj_nr].weryfikacja[dd])
										projekt[i.proj_oddzial][i.proj_nr].weryfikacja[dd] = [];
									projekt[i.proj_oddzial][i.proj_nr].weryfikacja[dd].push(i.co);
								} else {
// if (!weryfikacja.proj[i.proj_oddzial + " " + i.proj_nr].etap_zad[i.etap_nr+" "+i.zad_gl_nr])
	// weryfikacja.proj[i.proj_oddzial + " " + i.proj_nr].etap_zad[i.etap_nr+" "+i.zad_gl_nr] = {data:[], zad_sz:{}};
									if (!i.zad_sz_nr) {
										if (!projekt[i.proj_oddzial][i.proj_nr].etap[i.etap_nr].zad_gl[i.zad_gl_nr].weryfikacja)
											projekt[i.proj_oddzial][i.proj_nr].etap[i.etap_nr].zad_gl[i.zad_gl_nr].weryfikacja = [];
										if (!projekt[i.proj_oddzial][i.proj_nr].etap[i.etap_nr].zad_gl[i.zad_gl_nr].weryfikacja[dd])
											projekt[i.proj_oddzial][i.proj_nr].etap[i.etap_nr].zad_gl[i.zad_gl_nr].weryfikacja[dd] = [];
										projekt[i.proj_oddzial][i.proj_nr].etap[i.etap_nr].zad_gl[i.zad_gl_nr].weryfikacja[dd].push(i.co);
// if (!weryfikacja.proj[i.proj_oddzial + " " + i.proj_nr].etap_zad[i.etap_nr+" "+i.zad_gl_nr].data[dd])
	// weryfikacja.proj[i.proj_oddzial + " " + i.proj_nr].etap_zad[i.etap_nr+" "+i.zad_gl_nr].data[dd] = [];
// weryfikacja.proj[i.proj_oddzial + " " + i.proj_nr].etap_zad[i.etap_nr+" "+i.zad_gl_nr].data[dd].push(i.co);
									} else {
										if (!projekt[i.proj_oddzial][i.proj_nr].etap[i.etap_nr].zad_gl[i.zad_gl_nr].zad_sz[i.zad_sz_nr].weryfikacja)
											projekt[i.proj_oddzial][i.proj_nr].etap[i.etap_nr].zad_gl[i.zad_gl_nr].zad_sz[i.zad_sz_nr].weryfikacja = [];
										if (!projekt[i.proj_oddzial][i.proj_nr].etap[i.etap_nr].zad_gl[i.zad_gl_nr].zad_sz[i.zad_sz_nr].weryfikacja[dd])
											projekt[i.proj_oddzial][i.proj_nr].etap[i.etap_nr].zad_gl[i.zad_gl_nr].zad_sz[i.zad_sz_nr].weryfikacja[dd] = [];
										projekt[i.proj_oddzial][i.proj_nr].etap[i.etap_nr].zad_gl[i.zad_gl_nr].zad_sz[i.zad_sz_nr].weryfikacja[dd].push(i.co);
// if (!weryfikacja.proj[i.proj_oddzial + " " + i.proj_nr].etap_zad[i.etap_nr+" "+i.zad_gl_nr].zad_sz[i.zad_sz_nr])
	// weryfikacja.proj[i.proj_oddzial + " " + i.proj_nr].etap_zad[i.etap_nr+" "+i.zad_gl_nr].zad_sz[i.zad_sz_nr] = {data:[]};
// if (!weryfikacja.proj[i.proj_oddzial + " " + i.proj_nr].etap_zad[i.etap_nr+" "+i.zad_gl_nr].zad_sz[i.zad_sz_nr].data[dd])
	// weryfikacja.proj[i.proj_oddzial + " " + i.proj_nr].etap_zad[i.etap_nr+" "+i.zad_gl_nr].zad_sz[i.zad_sz_nr].data[dd] = [];
// weryfikacja.proj[i.proj_oddzial + " " + i.proj_nr].etap_zad[i.etap_nr+" "+i.zad_gl_nr].zad_sz[i.zad_sz_nr].data[dd].push(i.co);
									}
								}
							}
						});
						callback(null);
					}
				});
			},
			function(callback){ if (steps < 6) {callback(); return;} else console.log(" 6 budzet - (tylko dla zad_sz)");
				request.query(
				"SELECT b.*, p.oddzial AS proj_oddzial, p.nr AS proj_nr, e.nr AS etap_nr, zg.nr AS zad_gl_nr, zs.nr AS zad_sz_nr, po.nazwa AS podmiot, po.id AS podmiot_id \
					FROM PNU.dbo.budzet b \
					LEFT JOIN PNU.dbo.zad_sz zs ON zs.id = b.id_szcz \
					LEFT JOIN PNU.dbo.zad_gl zg ON zg.id = COALESCE(b.id_gl, zs.id_gl) \
					LEFT JOIN PNU.dbo.etap e ON e.id = zg.id_etap \
					LEFT JOIN PNU.dbo.projekty p ON p.id = COALESCE(b.id_proj, e.id_proj) \
					LEFT JOIN PNU.dbo.podmioty po ON po.id = b.id_podmiotu"
				, function(err, sqlData) {
					if (err) { callback(err); }
					else {
						//budzety dla zewnetrznych podmiotow (nie sumować do budzet_plan -> pozycje juz zawarte) docelowo dopisac KMSA i usunac budzet_plan
						sqlData.forEach(function(i){
							if (i.id_szcz) {
								var zsz = projekt[i.proj_oddzial][i.proj_nr].etap[i.etap_nr].zad_gl[i.zad_gl_nr].zad_sz[i.zad_sz_nr];
								if (!zsz.budzet) { zsz.budzet = {sum:0} }
								zsz.budzet[i.podmiot_id] = {nazwa: i.podmiot, kwota:i.kwota}
								zsz.budzet.sum += i.kwota;
								// console.log(i);
								// console.log(zsz);
							}
						});
						callback(null);
					}
				})
			},
			function(callback){ if (steps < 7) {callback(); return;} else console.log(" 7 rbh");
				request.query(
				"SELECT r.*, p.oddzial AS proj_oddzial, p.nr AS proj_nr, e.nr AS etap_nr, zg.nr AS zad_gl_nr, zs.nr AS zad_sz_nr, o.nazwa AS kto, o.dzial AS kto_dzial, o.id AS kto_nr, o.mpk AS kto_mpk \
					FROM PNU.dbo.rbh r \
					LEFT JOIN PNU.dbo.zad_sz zs ON zs.id = r.id_szcz \
					LEFT JOIN PNU.dbo.zad_gl zg ON zg.id = COALESCE(r.id_gl, zs.id_gl) \
					LEFT JOIN PNU.dbo.etap e ON e.id = zg.id_etap \
					LEFT JOIN PNU.dbo.projekty p ON p.id = COALESCE(r.id_proj, e.id_proj) \
					LEFT JOIN PNU.dbo.osoby o ON o.id = r.id_osoby"	//id_osoby do usuniecia -> kt, kto_dzial i kto_nr tez do usuniecia
				, function(err, sqlData) {
					if (err) { callback(err); }
					else {
						sqlData.forEach(function(i){
							if (i.id_gl || i.id_szcz) {
								// console.log(i.proj_oddzial + i.proj_nr);
								if (projekt[i.proj_oddzial][i.proj_nr].etap[i.etap_nr].zad_gl[i.zad_gl_nr]) {
									var zg = projekt[i.proj_oddzial][i.proj_nr].etap[i.etap_nr].zad_gl[i.zad_gl_nr];
									if (i.id_osoby) {
										if (!zg.rbh_wyk) { zg.rbh_wyk = {kto:[], rok:{}, sum:0};}
										zg.rbh_wyk.kto.push({nazwa: i.kto, ile: i.ilosc, nr: i.kto_nr, rok: i.rok, miesiac:i.miesiac});
		if (!zg.rbh_wyk.rok[i.rok]) zg.rbh_wyk.rok[i.rok] = {};
		if (!zg.rbh_wyk.rok[i.rok][i.miesiac]) zg.rbh_wyk.rok[i.rok][i.miesiac] = { obj_length: 0};
		zg.rbh_wyk.rok[i.rok][i.miesiac].obj_length += 1;
		zg.rbh_wyk.rok[i.rok][i.miesiac][i.kto_nr] = ({nazwa: i.kto, ile: i.ilosc, nr: i.kto_nr, mpk: i.kto_mpk, dzial: i.kto_dzial});
										zg.rbh_wyk.sum += i.ilosc;
									} else {
										if (i.zad_sz_nr) {
											var zsz = zg.zad_sz[i.zad_sz_nr];
											if (!zsz.rbh_plan) { zsz.rbh_plan = 0;}
											zsz.rbh_plan += i.ilosc;
										} else {
											if (!zg.rbh_plan) { zg.rbh_plan = 0;}
											zg.rbh_plan += i.ilosc;
										}
									}
								} else {
									console.log("rbh err");
								}
							} else {
								console.log("rbh proj err");
							}
						});
						// callback(true);
						callback(null);
// console.log(util.inspect(projekt["Z"][66].etap[2].zad_gl[1], false, 1));
					}
				})
			},
			function(callback){ if (steps < 8) {callback(); return;} else console.log(" 8 przypisy do zad_sz");
				request.query(
				"SELECT pr.*, p.oddzial AS proj_oddzial, p.nr AS proj_nr, e.nr AS etap_nr, zg.nr AS zad_gl_nr, zs.nr AS zad_sz_nr, o.nazwa AS kto, o.dzial AS kto_dzial, o.id AS kto_nr \
					FROM PNU.dbo.przypis pr \
					LEFT JOIN PNU.dbo.zad_sz zs ON zs.id = pr.id_szcz \
					LEFT JOIN PNU.dbo.zad_gl zg ON zg.id = zs.id_gl \
					LEFT JOIN PNU.dbo.etap e ON e.id = zg.id_etap \
					LEFT JOIN PNU.dbo.projekty p ON p.id = e.id_proj \
					LEFT JOIN PNU.dbo.osoby o ON o.id = pr.id_osoby \
					WHERE id_szcz IS NOT NULL"
				, function(err, sqlData) {
					if (err) { callback(err); }
					else {
						sqlData.forEach(function(i){
							if (!projekt[i.proj_oddzial][i.proj_nr].etap[i.etap_nr].zad_gl[i.zad_gl_nr].zad_sz[i.zad_sz_nr].przypis)
								projekt[i.proj_oddzial][i.proj_nr].etap[i.etap_nr].zad_gl[i.zad_gl_nr].zad_sz[i.zad_sz_nr].przypis = [];
							// projekt[i.proj_oddzial][i.proj_nr].etap[i.etap_nr].zad_gl[i.zad_gl_nr].zad_sz[i.zad_sz_nr].przypis.push(i);
							projekt[i.proj_oddzial][i.proj_nr].etap[i.etap_nr].zad_gl[i.zad_gl_nr].zad_sz[i.zad_sz_nr].przypis.push({kto:i.kto, kto_dzial:i.kto_dzial, kto_nr:i.kto_nr, dzial: i.dzial});
						});
						// callback(true);
						callback(null);
					}
				})
			},
			function(callback){ if (steps < 9) {callback(); return;} else console.log(" 9 mpk");
				request.query(
				"SELECT mpk, dzial  FROM [PNU].[dbo].[stawki]"
				, function(err, sqlData) {
					if (err) { callback(err); }
					else {
						sqlData.forEach(function(i){
							mpk[i.mpk] = i.dzial;
						});
						callback(null);
					}
				})
			},
			function(callback){ if (steps < 10) {callback(); return;} else console.log(" 10 kontrola dat, rbh i budzetow");
				for (var si in projekt) {
					for (var pi in projekt[si]) {
						var p = projekt[si][pi];
						var p_b_sum = 0;
						var p_rbh_sum = 0;
						var p_rbh_wyk_sum = 0;
						var p_start = null;
						var p_stop = null;
						for (var ei in p.etap) {
							var e = p.etap[ei];
							var e_b_sum = 0;
							var e_rbh_sum = 0;
							var e_rbh_wyk_sum = 0;
							var e_start = null;
							var e_stop = null;
							e.budzet_wyk = 0;
							for (var zgi in e.zad_gl) {
								var zg = e.zad_gl[zgi];
								var zg_bud_sum = 0;
								var zg_rbh_sum = 0;
								var zg_start = null;
								var zg_stop = null;
								for (var zsi in zg.zad_sz) {
									var zs = zg.zad_sz[zsi];
									if (zs.budzet_plan == null ) {
										if (zs.budzet) zs.budzet_plan = zs.budzet.sum;
									} else {
										if (zs.budzet) {
											if (zs.budzet_plan != zs.budzet.sum) console.log("err budzet p"+p.nr+" e"+e.nr+" zg"+zg.nr+" zs"+zs.nr);
										}
									}
									if (zs.data_start > zs.data_end) { console.log("err data_start > data_end "+si+p.nr+" e"+e.nr+" zg"+zg.nr+" zs"+zs.nr); }
									if (zs.budzet_plan) { zg_bud_sum += zs.budzet_plan; }
									if (zs.rbh_plan) { zg_rbh_sum += zs.rbh_plan; }
									if (zs.data_start && (!zg_start || (zs.data_start < zg_start))) zg_start = zs.data_start;
									if (zs.data_end && (!zg_stop || (zs.data_end > zg_stop))) zg_stop = zs.data_end;
									// console.log(zs);
								}
								zg.budzet_wyk = 0;
								if (zg.konto) {
									// zg.konto.data
									var max_data = 0;
									for (var kdi in zg.konto.data) {
										// console.log(kdi);
										// console.log(new Date(kdi));
										if (max_data < (new Date(kdi)).getTime()){
											max_data = (new Date(kdi)).getTime();
											zg.budzet_wyk = zg.konto.data[kdi];
										}
									}
								}
								e.budzet_wyk += zg.budzet_wyk;
// if (si == "Z" && pi == 63 && ei == 1 && zgi == 2) { console.log(util.inspect(projekt[si][pi].etap[ei].zad_gl[zgi], false, 0)); }
								zg.budzet_plan_sum_zs = zg_bud_sum;
								zg.rbh_plan_sum_zs = zg_rbh_sum;
								if (!zg.budzet_plan) zg.budzet_plan = zg_bud_sum;
								else if (zg_bud_sum &&(zg.budzet_plan != zg_bud_sum)) console.log("err budzet_plan "+si+p.nr+" e"+e.nr+" zg"+zg.nr);
								if (!zg.rbh_plan) zg.rbh_plan = zg_rbh_sum;
								else if (zg_rbh_sum && (zg.rbh_plan != zg_rbh_sum)) console.log("err rbh "+si+p.nr+" e"+e.nr+" zg"+zg.nr);
								if (zg_start) {
									if (!zg.data_start) {zg.data_start = new Date(zg_start); }
									else if (zg.data_start.getTime() != zg_start.getTime()) console.log("err data_start "+si+p.nr+" e"+e.nr+" zg"+zg.nr);
								}
								if (zg_stop) {
									if (!zg.data_end) { zg.data_end = new Date(zg_stop); }
									else if (zg.data_end.getTime() != zg_stop.getTime()) console.log("err data_stop "+si+p.nr+" e"+e.nr+" zg"+zg.nr);
								}
								e_b_sum += zg.budzet_plan;
								e_rbh_sum += zg.rbh_plan;
								if (zg.rbh_wyk && zg.rbh_wyk.sum) { e_rbh_wyk_sum += zg.rbh_wyk.sum; }
								
								if (zg.data_start && (!e_start || (zg.data_start < e_start))) e_start = zg.data_start;
								if (zg.data_end && (!e_stop || (zg.data_end > e_stop))) e_stop = zg.data_end;
							}
							if (!e.budzet_plan) e.budzet_plan = e_b_sum;
							else  if (e_b_sum && (e.budzet_plan != e_b_sum)) console.log("err budzet_plan "+si+p.nr+" e"+e.nr);
							if (!e.rbh_plan) e.rbh_plan = e_rbh_sum;
							else  if (e_rbh_sum && (e.rbh_plan != e_rbh_sum)) console.log("err rbh "+si+p.nr+" e"+e.nr);
							if (e_start) {
								if (!e.data_start) {e.data_start = new Date(e_start); }
								else if (e.data_start.getTime() != e_start.getTime()) console.log("err data_start "+si+p.nr+" e"+e.nr);
							}
							if (e_stop) {
								if (!e.data_end) { e.data_end = new Date(e_stop); }
								else if (e.data_end.getTime() != e_stop.getTime()) console.log("err data_stop "+si+p.nr+" e"+e.nr);
							}
							p_b_sum += e.budzet_plan;
							p_rbh_sum += e.rbh_plan;
							// if (e.rbh_wyk && e.rbh_wyk.sum) { 
							e.rbh_wyk = {sum: e_rbh_wyk_sum};
							p_rbh_wyk_sum += e.rbh_wyk.sum;
							if (e.data_start && (!p_start || (e.data_start < p_start))) p_start = e.data_start;
							if (e.data_end && (!p_stop || (e.data_end > p_stop))) p_stop = e.data_end;
						}
						if (!p.budzet_plan) p.budzet_plan = p_b_sum;//
						else  if (p_b_sum && (p.budzet_plan != p_b_sum)) console.log("err budzet_plan "+si+p.nr);
						if (!p.rbh_plan) p.rbh_plan = p_rbh_sum;
						else  if (p_rbh_sum && (p.rbh_plan != p_rbh_sum)) console.log("err rbh "+si+p.nr);
						if (p_start) {
							if (!p.data_start) {p.data_start = new Date(p_start); }
							else if (p.data_start.getTime() != p_start.getTime()) console.log("err data_start "+si+p.nr);
						}
						if (p_stop) {
							if (!p.data_end) { p.data_end = new Date(p_stop); }
							else if (p.data_end.getTime() != p_stop.getTime()) console.log("err data_stop "+si+p.nr);
						}
						p.rbh_wyk = {sum: p_rbh_wyk_sum};
					}
				}
				callback(null);
			},
			function(callback){ if (steps < 11) {callback(); return;} else console.log(" 11 wylicznie budzetow miesiecznych");
				budzet_mies = {};
				rbh_mies = {};
				for (var si in projekt) {
					if (!budzet_mies[si]) budzet_mies[si] = {}
					if (!rbh_mies[si]) rbh_mies[si] = {}
					for (var pi in projekt[si]) {
						var p = projekt[si][pi];
						if (p.status == 1)
						for (var ei in p.etap) {
							var e = p.etap[ei];
							for (var zgi in e.zad_gl) {
								
								var zg = e.zad_gl[zgi];
								if (!zg.data_start || !zg.data_end) { 
									console.log("Brak daty "+si+pi+" etap:"+ei+" zad_gl:"+zgi);
								} else {
									if (zg.budzet_plan_sum_zs > 0) {
										for (var zsi in zg.zad_sz) {
											var zs = zg.zad_sz[zsi]; 
											if (!zs.data_start || !zs.data_end) { 
												console.log("Brak daty "+si+pi+" etap:"+ei+" zad_gl:"+zgi+" zad_sz:"+zsi);
												budzet_mies[si][pi] = common.rozbij_na_miesiace(zg.data_start, zg.data_end, zs.budzet_plan, budzet_mies[si][pi]);
											} else {
												budzet_mies[si][pi] = common.rozbij_na_miesiace(zs.data_start, zs.data_end, zs.budzet_plan, budzet_mies[si][pi]);
											}
										}
									} else {
										budzet_mies[si][pi] = common.rozbij_na_miesiace(zg.data_start, zg.data_end, zg.budzet_plan, budzet_mies[si][pi]);
									}
									if (zg.rbh_plan_sum_zs > 0) {
										for (var zsi in zg.zad_sz) {
											var zs = zg.zad_sz[zsi]; 
											rbh_mies[si][pi] = common.rozbij_na_miesiace(zs.data_start, zs.data_end, zs.rbh_plan, rbh_mies[si][pi]);
										}
									} else {
										rbh_mies[si][pi] = common.rozbij_na_miesiace(zg.data_start, zg.data_end, zg.rbh_plan, rbh_mies[si][pi]);
									}
								}
							}
						}
					}
				}
				for (var si in budzet_mies) {
					for (var pi in budzet_mies[si]) {
						var sum_p = 0;
						for (var y in budzet_mies[si][pi]){
							var sum_y = 0;
							for (var m in budzet_mies[si][pi][y]){
								sum_y += budzet_mies[si][pi][y][m];
							}
							sum_p += sum_y;
							budzet_mies[si][pi][y].sum = sum_y;
						}
						if (!budzet_mies[si]) { budzet_mies[si] = {};}
						if (!budzet_mies[si][pi]) { budzet_mies[si][pi] = {};}
						budzet_mies[si][pi].sum = sum_p;
						budzet_mies[si][pi].corr = projekt[si][pi].budzet_plan - sum_p;

						if (budzet_mies[si][pi].corr > 10) {
							console.log("Budzet miesieczny dla " + si + " " + pi + " rozjechal sie o " + common.formatCurr(budzet_mies[si][pi].corr) + " zl.");
						}
					}
				}
				callback(null);
			},
			function(callback){ if (steps < 12) {callback(); return;} else console.log(" 12 karty_pr_pnu");
				// console.log('SELECT COALESCE( z.zlecenie, p.zlecenie ) AS pnu, u.nr, u.nazwa AS kto, SUM( czas ) /60 AS czas FROM `kart_pr_prace` p left join `kart_pr_zadania` z on (p.zadanie=z.id) left join `users` u on (p.user_id = u.id) where p.data >= ' + config.from.getTime() + ' and p.data <= ' + config.to.getTime() + ' and (p.zlecenie like "PNU%" or (p.zadanie is not null and z.zlecenie like "PNU%")) group by p.user_id, pnu ORDER BY kto');
				karty_pr.query(
					'SELECT   MID(FROM_UNIXTIME(p.data/1000),1,4) as year,  MID(FROM_UNIXTIME(p.data/1000),6,2) as month, COALESCE( z.zlecenie, SUBSTR(p.zlecenie, 16)) AS pnu, u.nr AS nr, u.nazwa AS nazwa, SUM( czas ) /60 AS ile \
					FROM (SELECT * from `kart_pr_prace` WHERE zlecenie like "PNU Projekt nr %" or zadanie is not null) p \
					left join (SELECT * FROM `kart_pr_zadania` WHERE typ = "PNU") z on (p.zadanie=z.id) \
					left join `users` u on (p.user_id = u.id) \
					where 1=1 \
					and (p.zlecenie like "PNU%" or z.typ = "PNU") \
					group by year, month, pnu, p.user_id \
					ORDER BY pnu, year, month, p.user_id'
				// where p.data >= ' + config.from.getTime() + ' and p.data <= ' + config.to.getTime() + ' and (p.zlecenie like "PNU%" or (p.zadanie is not null and z.zlecenie like "PNU%"))
				, function(err, rows, fields) {
					if (err) callback(err);
					karty_pr_pnu = {};
					rows.forEach(function(k){
						k.month /= 1;
						var wzor = /^([0-9]{1,3})([A-Z]{0,4})[\/]?([0-9]{1,3})?[\/]?([0-9]{1,3})?$/;
						//0=calosc, 1=projekt, 2=sekcja, 3=zadanie
						var temp = k.pnu.match(wzor);
						if (!temp)
							console.log(k.pnu);
						else {
							if (temp[2] == "") temp[2] = "Z";
							if (!temp[3] || temp[3] == "") temp[3] = "?";
							if (!temp[4] || temp[4] == "") temp[4] = "?";
							// console.log(">"+temp+"<");
							if (!karty_pr_pnu[temp[2]]) karty_pr_pnu[temp[2]] = {};
							if (!karty_pr_pnu[temp[2]][temp[1]]) karty_pr_pnu[temp[2]][temp[1]] = {};
							if (!karty_pr_pnu[temp[2]][temp[1]][temp[3]]) karty_pr_pnu[temp[2]][temp[1]][temp[3]] = {};
							if (!karty_pr_pnu[temp[2]][temp[1]][temp[3]][temp[4]]) karty_pr_pnu[temp[2]][temp[1]][temp[3]][temp[4]] = {};
							if (!karty_pr_pnu[temp[2]][temp[1]][temp[3]][temp[4]][k.year]) karty_pr_pnu[temp[2]][temp[1]][temp[3]][temp[4]][k.year] = {};
							if (!karty_pr_pnu[temp[2]][temp[1]][temp[3]][temp[4]][k.year][k.month]) karty_pr_pnu[temp[2]][temp[1]][temp[3]][temp[4]][k.year][k.month] = {sum:0, osoby:{obj_length:0}};
							karty_pr_pnu[temp[2]][temp[1]][temp[3]][temp[4]][k.year][k.month].sum += k.ile;
							karty_pr_pnu[temp[2]][temp[1]][temp[3]][temp[4]][k.year][k.month].osoby.obj_length += 1;
							karty_pr_pnu[temp[2]][temp[1]][temp[3]][temp[4]][k.year][k.month].osoby[k.nr] = k;
						}
					});
// console.log(util.inspect(karty_pr_pnu["Z"][80][2015], false, 4));
// console.log(util.inspect(karty_pr_pnu["DHTP"][1][2015], false, 4));
					callback(null, karty_pr_pnu);
				});
			},
			
			function(callback){ if (steps < 20) {callback(); return;} else console.log(" mpk");
				request.query(
				"SELECT mpk, dzial  FROM [PNU].[dbo].[stawki]"
				, function(err, sqlData) {
					if (err) { callback(err); }
					else {
						sqlData.forEach(function(i){
							mpk[i.mpk] = i.dzial;
						});
						callback(null);
					}
				})
			},
			function(callback){ if (steps < 21) {callback(); return;} else console.log(" pnu");
				for (var si in projekt) {
					for (var pi in projekt[si]) {
						var p = projekt[si][pi];
						var p_nr = p.nr;
						if (p.oddzial != "Z")
							p_nr += p.oddzial;
						pnu[p_nr] = {nr: p_nr, nazwa: "PNU Projekt nr "+p_nr, opis: p.opis};
					}
				}
				callback(null);
			}
		],
		function(err, results){
			if (err) {
				console.log(err);
			} else {
			}
		});
	}

*/
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
		// res.render('index',
			// { title : 'Home' }
		// )
	})

	app.get('/pnu.html', function (req, res) {
		console.log(req.query);
		if (req.query.sekcja && req.query.projekt) {
			res.render('pnu', {
				projekt: baza.dane().projekt[req.query.sekcja][req.query.projekt],
				rbh_mies : baza.dane().rbh_mies[req.query.sekcja][req.query.projekt],
				budzet_mies : baza.dane().budzet_mies[req.query.sekcja][req.query.projekt],
				karty_pr : baza.dane().karty_pr_pnu[req.query.sekcja][req.query.projekt]
			});
			// console.log(budzet_mies[req.query.sekcja][req.query.projekt]);
		} else {
			res.render('pnu_lista', {pnu: baza.dane().projekt});
		}
	})

	app.get('/projekt.json', function (req, res) {
		if (req.query.sekcja && req.query.projekt) {
			res.jsonp(projekt[req.query.sekcja][req.query.projekt]);
		} else {
			res.jsonp(projekt);
		}
	});

	app.get('/projekt.html', function (req, res) {
		if (req.query.sekcja && req.query.projekt) {
			res.send("<pre>"+JSON.stringify(projekt[req.query.sekcja][req.query.projekt], null, 4)+"</pre>");	//4 spacje
		} else {
			res.send("<pre>"+JSON.stringify(projekt, null, 4)+"</pre>");
		}
	});
	
	
	app.get('/root.json', function (req, res) {
		var sekcje = ['Z','RY','W','DHTP'];
		var sekcja_opis = ['TR-1 i TR-2','RTR','TR-3','DHTP'];
		var mpk_t = [];
		for (var mi in mpk) {
			mpk_t.push({"text":mi,a_attr:{title:mpk[mi]},"children":[]});
		}
		var pnu_t = [];
		for (var si in sekcje) if (projekt[sekcje[si]]) {
			var sekcja = [];
			for (var pi in projekt[sekcje[si]]) {
				var p = projekt[sekcje[si]][pi];
				var p_nr = p.nr;
				if (p.oddzial != "Z")
					p_nr += p.oddzial;
				var etap = [];
				for (var ei in p.etap) {
					var e = p.etap[ei];
					var zad_gl = [];
					for (var zgi in e.zad_gl) {
						zad_gl.push({text:"Zadanie "+e.zad_gl[zgi].nr, children: [], a_attr: {title: e.zad_gl[zgi].opis} });
					}
					if (Object.keys(p.etap).length > 1) {
						etap.push({text:"Etap "+ei, children: zad_gl, a_attr: {title: e.opis} });
					} else {
						etap = zad_gl;
					}
				}
				sekcja.push({text:"Projekt nr "+p_nr, children: etap, a_attr: {title: p.opis} });
			}
			pnu_t.push({text: sekcja_opis[si], children: sekcja });
		}
		res.jsonp([
			{ text: "PNU", children: pnu_t }, 
			{ text: "MPK", children: mpk_t }, 
			{ text: "DH", children: []}
		]);
	});
	
	app.get('/pnu.js', function (req, res) {
		res.send("pnu = "+JSON.stringify(pnu)+";");
	});

	app.get('/mpk.js', function (req, res) {
		res.send("mpk = "+JSON.stringify(mpk)+";");
	});

	app.get('/refresh', function (req, res) {
		refresh_data();
		clearInterval(timer);
		timer = setInterval(refresh_data, 10*60*1000);	//co 10 minut
		res.send("Dane odświerzone");
	});
	
	app.get('/budzet_mies.json', function (req, res) {
		res.jsonp(budzet_mies);
		// res.send("budzet_mies = "+JSON.stringify(budzet_mies)+";");
	});

	app.get('/karty_pr_pnu.json', function (req, res) {
		res.jsonp(karty_pr_pnu);
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