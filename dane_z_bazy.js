(function () {
    "use strict";
	var
		sql = require('mssql'),
		mysql = require('mysql'),
		async = require('async'), 
		common = require('./pnu_common.js'),
		counter = 0;
		
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
	// var weryfikacja = {data:[], proj:{}};
	// var budzet_mies = {};
	// var rbh_mies = {};
	var karty_pr_pnu = {};
	var rbh_sprzedane = {};

	var pnu = {};
	var mpk = {};
	var osoby = {};
	// var osoby_sort = [];
	
	var is_refreshing = false;

	function edytuj(table, id, col, val, callback){
		connection.connect(function(err) {
			if (err && (err.code != 'EALREADYCONNECTED')) {
				console.log(err);
				return "err";
			}
			if (col == 'budzet_plan' || col == 'ilosc') {
				
			} else {
				val = "'"+val+"'";
			}
			var query = "UPDATE [PNU].[dbo].["+table+"] SET ["+col+"] = " + val + " WHERE id = " + id + " ;";
			console.log(query);
			// callback(null);
			// return;
			request.query(
				query
				, function(err, sqlData) {
					if (err) { callback(err);
					} else { callback(null); }
				}
			);
		});
	}
	
	function sprzedaj(proj_id, year, month, kto_id, rbh, callback){
		connection.connect(function(err) {
			if (err && (err.code != 'EALREADYCONNECTED')) {
				console.log(err);
				return "err";
			}
			request.query(
				"SELECT * FROM [PNU].[dbo].[rbh] WHERE rok = " + year + " AND miesiac = " + month + " AND id_osoby = " + kto_id + " AND id_gl = " + proj_id + " ;"
				, function(err, sqlData) {
					if (err) { callback(err);
					} else { 
						if (sqlData.length > 0) {
							//sqlData[0].ilosc
							if (rbh > 0) {
								console.log("UPDATE");
								request.query(
									"UPDATE [PNU].[dbo].[rbh] SET [ilosc] = " + rbh + " WHERE rok = " + year + " AND miesiac = " + month + " AND id_osoby = " + kto_id + " AND id_gl = " + proj_id + " ;"
									, function(err, sqlData) {
										if (err) { callback(err);
										} else { callback(null); }
								})
							} else {
								console.log("DELETE");
								request.query(
									"DELETE FROM [PNU].[dbo].[rbh] WHERE rok = " + year + " AND miesiac = " + month + " AND id_osoby = " + kto_id + " AND id_gl = " + proj_id + " ;"
									, function(err, sqlData) {
										if (err) { callback(err);
										} else { callback(null); }
								})
							}
						} else {
							if (rbh > 0) {
								console.log("INSERT");
								request.query(
									"INSERT INTO [PNU].[dbo].[rbh] ([id_gl],[rok],[miesiac],[ilosc],[id_osoby]) VALUES (" + proj_id + ", " + year + ", " + month + ", " + rbh + ", " + kto_id + ")"
									, function(err, sqlData) {
										if (err) { callback(err);
										} else { callback(null); }
								})
							} else {
								console.log("NOP");
								callback(null);
							}
						}
					}
				});
		});
	}
	
	function refresh_data(what, main_callback){
		var steps = what;
		if (!steps) steps = 30;
		if (what == "rbh" || what == "zad")
			steps = 0;
		if (is_refreshing)
			return;
		is_refreshing = true;
		counter += 1;
		async.series([
			function(callback){ console.log(" 0 polaczenie z baza mssql");
				connection.connect(function(err) {
					if (err && (err.code != 'EALREADYCONNECTED')) callback(err);
					else callback();
				});
			},
			function(callback){ if (steps < 1 && (what != "zad")) {callback(); return;} else console.log(" 1 projekty, etapy i prowadzacy");
				if (what == "all") {
					projekt = {};
					rbh_sprzedane = {};
				}
	//			'select osoby.nazwa as prowadzacy, projekty.*, etap.opis AS etap_opis, etap.nr AS etap_nr, etap.start AS etap_start, etap.stop AS etap_stop from PNU.dbo.etap LEFT JOIN PNU.dbo.projekty on projekty.id = etap.id_proj LEFT JOIN PNU.dbo.przypis on przypis.nr_proj = projekty.id LEFT JOIN PNU.dbo.osoby on osoby.nr = przypis.nr_osoby', 
				request.query(
				"SELECT * FROM [PNU].[dbo].[f_get_proj_et_prow] ()"
/*				
				"SELECT p.*, \
					e.id AS etap_id, e.status AS etap_status, e.opis AS etap_opis, e.nr AS etap_nr, e.data_start AS etap_start, e.data_end AS etap_stop, \
					o.nazwa AS prowadzacy \
					FROM PNU.dbo.etap e \
					FULL JOIN PNU.dbo.projekty p ON p.id = e.id_proj \
					LEFT JOIN PNU.dbo.przypis prz ON prz.id_proj = p.id \
					LEFT JOIN PNU.dbo.osoby o ON o.id = prz.id_osoby \
					WHERE e.id IS NOT NULL" // ORDER BY p.oddzial DESC, p.nr"
*/
				, function(err, sqlData) {
					if (err) { callback(err); }
					else {
						sqlData.forEach(function(i){
							if (!i.oddzial) { i.oddzial = 'Z'; } 
							if (!projekt[i.oddzial]) projekt[i.oddzial] = {};
// if (i.etap_id == 35) i.nr += "w2";
							if (!projekt[i.oddzial][i.nr]) {
								i.etap = {};
								projekt[i.oddzial][i.nr] = i;
								projekt[i.oddzial][i.nr].prowadzacy = [i.prowadzacy];
							} else {
								if (projekt[i.oddzial][i.nr].prowadzacy.indexOf(i.prowadzacy) == -1)
									projekt[i.oddzial][i.nr].prowadzacy.push(i.prowadzacy);
							}
							// if (!projekt[i.oddzial][i.nr].etap[i.etap_nr]) 
							// projekt[i.oddzial][i.nr].etap[i.etap_nr] = { id: i.etap_id, status: i.etap_status, opis: 'ETAP ' + common.toRoman(i.etap_nr) + ' ' + i.etap_opis, nr: i.etap_nr, data_start: i.etap_start, data_end: i.etap_stop, zad_gl:{}};
							projekt[i.oddzial][i.nr].etap[i.etap_nr] = { id: i.etap_id, status: i.etap_status, opis: i.etap_opis, nr: i.etap_nr, data_start: i.etap_start, data_end: i.etap_stop, zad_gl:{}};
							delete projekt[i.oddzial][i.nr].etap_opis;
							delete projekt[i.oddzial][i.nr].etap_start;
							delete projekt[i.oddzial][i.nr].etap_stop;
// if (i.etap_id == 35) projekt[i.oddzial][i.nr].nr = "4";
						});
	// for (var pi in projekt) { console.log(pi); }
	// console.log(projekt);
						callback(null);
					}
				});
			},
			function(callback){ if (steps < 2 && (what != "zad")) {callback(); return;} else console.log(" 2 zad_gl");
				request.query(
				"SELECT * FROM [PNU].[dbo].f_get_zad_gl() ORDER BY proj_oddzial DESC, proj_nr ASC, etap_nr, nr"
/*				
				"SELECT zg.*, e.nr AS etap_nr, p.oddzial AS proj_oddzial, p.nr AS proj_nr \
					FROM PNU.dbo.zad_gl zg \
					LEFT JOIN PNU.dbo.etap e ON zg.id_etap = e.id \
					LEFT JOIN PNU.dbo.projekty p ON e.id_proj = p.id \
					ORDER BY proj_oddzial DESC, proj_nr ASC, etap_nr, zg.nr"
*/
				, function(err, sqlData) {
					if (err) { callback(err); }
					else {
						sqlData.forEach(function(i){
							i.zad_sz = {};
// if (i.id_etap == 35) i.proj_nr += "w2";
							projekt[i.proj_oddzial][i.proj_nr].etap[i.etap_nr].zad_gl[i.nr] = i;
						});
						callback(null);
					}
				});
			},
			function(callback){ if (steps < 3 && (what != "zad")) {callback(); return;} else console.log(" 3 zad_sz");
				request.query(
				"SELECT zad_sz.*, zad_gl.nr AS zad_gl_nr, etap.nr AS etap_nr, p.oddzial AS proj_oddzial, p.nr AS proj_nr, etap.id AS etap_id \
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
// if (i.etap_id == 35) i.proj_nr += "w2";
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
				"SELECT s.*, k.opis AS konto_nazwa, zg.nr AS zad_gl_nr, e.nr AS etap_nr, p.oddzial AS proj_oddzial, p.nr AS proj_nr, e.id AS etap_id \
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
// if (i.etap_id == 35) i.proj_nr += "w2";
							if (i.zad_gl_nr) {
								if (!projekt[i.proj_oddzial][i.proj_nr].etap[i.etap_nr].zad_gl[i.zad_gl_nr].konto) { 
									projekt[i.proj_oddzial][i.proj_nr].etap[i.etap_nr].zad_gl[i.zad_gl_nr].konto = {nazwa: i.konto_nazwa, data:{}};
								}
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
				"SELECT w.*, p.oddzial AS proj_oddzial, p.nr AS proj_nr \
					FROM PNU.dbo.weryfikacja w \
					LEFT JOIN PNU.dbo.projekty p ON p.id = w.id_proj \
					ORDER BY kiedy DESC"
				, function(err, sqlData) {
					if (err) { callback(err); }
					else {
						//czyszczenie poprzednich wpisow
						for (var si in projekt)
							for (var pi in projekt[si]) {
								projekt[si][pi].weryfikacja = {};
								projekt[si][pi].przypis = [];
							}
						sqlData.forEach(function(i){
							var d = new Date(i.kiedy);
							var dd = d.getFullYear() + "-" + common.pad(d.getMonth()+1) + "-" + common.pad(d.getDate());
							if (!i.proj_oddzial || !i.proj_nr) {
								console.log("blad weryfikacji - id:"+i.id);
							} else {
								if (i.typ == 'w') {
									// console.log(i);
									if (projekt[i.proj_oddzial][i.proj_nr]) {
										if (!projekt[i.proj_oddzial][i.proj_nr].weryfikacja[dd])
											projekt[i.proj_oddzial][i.proj_nr].weryfikacja[dd] = [];
										projekt[i.proj_oddzial][i.proj_nr].weryfikacja[dd].push({co: i.opis, id: i.id});
									}
								} else {
									projekt[i.proj_oddzial][i.proj_nr].przypis.push({co: i.opis, id: i.id});
								}
							}
						});
						callback(null);
					}
				});
			},
			function(callback){ if (steps < 6) {callback(); return;} else console.log(" 6 budzet");
				request.query(
				"SELECT b.*, p.oddzial AS proj_oddzial, p.nr AS proj_nr, e.nr AS etap_nr, zg.nr AS zad_gl_nr, zs.nr AS zad_sz_nr, po.nazwa AS podmiot, po.id AS podmiot_id, e.id AS etap_id \
					FROM PNU.dbo.budzet b \
					LEFT JOIN PNU.dbo.zad_sz zs ON zs.id = b.id_szcz \
					LEFT JOIN PNU.dbo.zad_gl zg ON zg.id = COALESCE(b.id_gl, zs.id_gl) \
					LEFT JOIN PNU.dbo.etap e ON e.id = zg.id_etap \
					LEFT JOIN PNU.dbo.projekty p ON p.id = e.id_proj \
					LEFT JOIN PNU.dbo.podmioty po ON po.id = b.id_podmiotu"
				, function(err, sqlData) {
					if (err) { callback(err); }
					else {
						//budzety dla zewnetrznych podmiotow (nie sumować do budzet_plan -> pozycje juz zawarte) docelowo dopisac KMSA i usunac budzet_plan
						sqlData.forEach(function(i){
// if (i.etap_id == 35) i.proj_nr += "w2";
							if (i.id_szcz) {
								var zsz = projekt[i.proj_oddzial][i.proj_nr].etap[i.etap_nr].zad_gl[i.zad_gl_nr].zad_sz[i.zad_sz_nr];
								// if (i.proj_nr == 63) console.log(i);
								if (!zsz.budzet) { zsz.budzet = {sum:0} }
								// zsz.budzet[i.podmiot_id] = {nazwa: i.podmiot, kwota:i.kwota, uwagi:i.uwagi}
								zsz.budzet[i.id] = {nazwa: i.podmiot, kwota:i.kwota, uwagi:i.uwagi}
								if (!i.dofinans)
									zsz.budzet.sum += i.kwota;
								// console.log(i);
								// console.log(zsz);
							} else if (i.id_gl) {
								var zg = projekt[i.proj_oddzial][i.proj_nr].etap[i.etap_nr].zad_gl[i.zad_gl_nr];
								if (!zg.budzet) { zg.budzet = {sum:0} }
								// zg.budzet[i.podmiot_id] = {nazwa: i.podmiot, kwota:i.kwota, uwagi:i.uwagi}
								zg.budzet[i.id] = {nazwa: i.podmiot, kwota:i.kwota, uwagi:i.uwagi}
								zg.budzet.sum += i.kwota;
							}
						});
						callback(null);
					}
				})
			},
			function(callback){ if (steps < 7 && (what != "rbh")) {callback(); return;} else console.log(" 7 rbh");
				request.query(
				"SELECT r.*, p.oddzial AS proj_oddzial, p.nr AS proj_nr, e.nr AS etap_nr, zg.nr AS zad_gl_nr, zs.nr AS zad_sz_nr, o.nazwa AS kto, o.dzial AS kto_dzial, o.id AS kto_nr, o.mpk AS kto_mpk, s.stawka AS stawka, e.id AS etap_id \
					FROM PNU.dbo.rbh r \
					LEFT JOIN PNU.dbo.zad_sz zs ON zs.id = r.id_szcz \
					LEFT JOIN PNU.dbo.zad_gl zg ON zg.id = COALESCE(r.id_gl, zs.id_gl) \
					LEFT JOIN PNU.dbo.etap e ON e.id = zg.id_etap \
					LEFT JOIN PNU.dbo.projekty p ON p.id = e.id_proj \
					LEFT JOIN PNU.dbo.osoby o ON o.id = r.id_osoby \
					LEFT JOIN PNU.dbo.stawki s ON (s.mpk = o.mpk and s.rok = r.rok and s.miesiac = r.miesiac)"	//id_osoby do usuniecia -> kt, kto_dzial i kto_nr tez do usuniecia
				, function(err, sqlData) {
					if (err) { callback(err); }
					else {
						rbh_sprzedane = {};
						sqlData.forEach(function(i){
// if (i.etap_id == 35) i.proj_nr += "w2";
							if (i.id_gl || i.id_szcz) {
								if (!rbh_sprzedane[i.proj_oddzial]) rbh_sprzedane[i.proj_oddzial] = {};
								if (!rbh_sprzedane[i.proj_oddzial][i.proj_nr]) rbh_sprzedane[i.proj_oddzial][i.proj_nr] = {};
								if (!rbh_sprzedane[i.proj_oddzial][i.proj_nr][i.etap_nr]) rbh_sprzedane[i.proj_oddzial][i.proj_nr][i.etap_nr] = {};
								if (!rbh_sprzedane[i.proj_oddzial][i.proj_nr][i.etap_nr][i.zad_gl_nr]) rbh_sprzedane[i.proj_oddzial][i.proj_nr][i.etap_nr][i.zad_gl_nr] = {};
								var rbh_zad = rbh_sprzedane[i.proj_oddzial][i.proj_nr][i.etap_nr][i.zad_gl_nr];
								if (i.id_osoby) {
									if (!rbh_zad[i.rok]) rbh_zad[i.rok] = {};
									if (!rbh_zad[i.rok][i.miesiac]) rbh_zad[i.rok][i.miesiac] = {};
									rbh_zad[i.rok][i.miesiac][i.kto_nr] = {nazwa: i.kto, ile: i.ilosc, nr: i.kto_nr, mpk: i.kto_mpk, dzial: i.kto_dzial};
								}
								if (projekt[i.proj_oddzial][i.proj_nr].etap[i.etap_nr].zad_gl[i.zad_gl_nr]) {
									var zg = projekt[i.proj_oddzial][i.proj_nr].etap[i.etap_nr].zad_gl[i.zad_gl_nr];
									// rbh sprzedane
									if (i.id_osoby) {
										if (!zg.rbh_wyk) { zg.rbh_wyk = {kto:{}, rok:{}, sum:0};}
										if (!zg.rbh_wyk.rok[i.rok]) zg.rbh_wyk.rok[i.rok] = {};
										if (!zg.rbh_wyk.rok[i.rok][i.miesiac]) zg.rbh_wyk.rok[i.rok][i.miesiac] = {};
										zg.rbh_wyk.kto[i.kto_nr] = {nazwa: i.kto, ile: i.ilosc, nr: i.kto_nr, rok: i.rok, miesiac:i.miesiac};
										zg.rbh_wyk.rok[i.rok][i.miesiac][i.kto_nr] = {nazwa: i.kto, ile: i.ilosc, nr: i.kto_nr, mpk: i.kto_mpk, dzial: i.kto_dzial, stawka: i.stawka};
										zg.rbh_wyk.sum += i.ilosc;
									} else {
									// rbh planowane
										if (i.zad_sz_nr) {
											var zsz = zg.zad_sz[i.zad_sz_nr];
											if (!zsz.rbh_plan) { zsz.rbh_plan = 0; zsz.rbh = {};}
											zsz.rbh[i.id] = {dzial: i.dzial, ilosc: i.ilosc};
											zsz.rbh_plan += i.ilosc;
										} else {
											if (!zg.rbh_plan) { zg.rbh_plan = 0; zg.rbh = {};}
											zg.rbh[i.id] = {dzial: i.dzial, ilosc: i.ilosc};
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
						callback(null);
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
						callback(null);
					}
				})
			},
			function(callback){ if (steps < 10 && (what != "zad") && (what != "rbh")) {callback(); return;} else console.log(" 10 kontrola dat, rbh i budzetow");
				for (var si in projekt) {
					for (var pi in projekt[si]) {
						var p = projekt[si][pi];
						var p_b_sum = 0;
						var p_rbh_sum = 0;
						var p_rbh_wyk_sum = 0;
						var p_start = null;
						var p_stop = null;
						p.budzet_wyk = 0;
						p.rbh_plan = 0;
						p.budzet_plan = 0;	// dodano 09-04-2015 !!! 
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
											if (zs.budzet_plan != zs.budzet.sum) console.log("err budzet "+si+p.nr+" e"+e.nr+" zg"+zg.nr+" zs"+zs.nr);
										}
									}
									if (zs.data_start > zs.data_end) { console.log("err data_start > data_end "+si+p.nr+" e"+e.nr+" zg"+zg.nr+" zs"+zs.nr); }
									if (zs.budzet_plan) { zg_bud_sum += zs.budzet_plan; }
									if (zs.rbh_plan) { zg_rbh_sum += zs.rbh_plan; }
									if (zs.data_start && (!zg_start || (zs.data_start < zg_start))) zg_start = zs.data_start;
									if (zs.data_end && (!zg_stop || (zs.data_end > zg_stop))) zg_stop = zs.data_end;
								}
								zg.budzet_wyk = 0;
								if (zg.konto) {
									var max_data = 0;
									for (var kdi in zg.konto.data) {
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
							p.budzet_wyk += e.budzet_wyk;
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
				for (var si in projekt) {
					for (var pi in projekt[si]) {
						var p = projekt[si][pi];
						p.budzet_mies = {};
						p.rbh_mies = {};
						p.rbh_wyk_mies = {};
						if (p.status == 1) {
							for (var ei in p.etap) {
								var e = p.etap[ei];
								for (var zgi in e.zad_gl) {
									var zg = e.zad_gl[zgi];
									zg.budzet_mies = {};
									zg.rbh_mies = {};
									if (!zg.data_start || !zg.data_end) { 
										//brakujaca kwota wrzucona po końcowej dacie projektu
										console.log("Brak daty "+si+pi+" etap:"+ei+" zad_gl:"+zgi);
										var y = p.data_end.getFullYear()+1;
										if (!p.budzet_mies[y]) p.budzet_mies[y] = [0];
										if (!p.rbh_mies[y]) p.rbh_mies[y] = [0];
										zg.budzet_mies[y] = [zg.budzet_plan];
										zg.rbh_mies[y] = [zg.rbh_plan];
										p.budzet_mies[y][0] += zg.budzet_plan;
										p.rbh_mies[y][0] += zg.rbh_plan;
									} else {
										if (zg.budzet_plan_sum_zs > 0) {
											for (var zsi in zg.zad_sz) {
												var zs = zg.zad_sz[zsi]; 
												if (!zs.data_start || !zs.data_end) { 
													console.log("Brak daty "+si+pi+" etap:"+ei+" zad_gl:"+zgi+" zad_sz:"+zsi);
													p.budzet_mies = common.rozbij_na_miesiace(zg.data_start, zg.data_end, zs.budzet_plan, p.budzet_mies);
													zg.budzet_mies = common.rozbij_na_miesiace(zg.data_start, zg.data_end, zs.budzet_plan, zg.budzet_mies);
												} else {
													p.budzet_mies = common.rozbij_na_miesiace(zs.data_start, zs.data_end, zs.budzet_plan, p.budzet_mies);
													zg.budzet_mies = common.rozbij_na_miesiace(zs.data_start, zs.data_end, zs.budzet_plan, zg.budzet_mies);
												}
											}
										} else {
											p.budzet_mies = common.rozbij_na_miesiace(zg.data_start, zg.data_end, zg.budzet_plan, p.budzet_mies);
											zg.budzet_mies = common.rozbij_na_miesiace(zg.data_start, zg.data_end, zg.budzet_plan, zg.budzet_mies);
										}
										if (zg.rbh_plan_sum_zs > 0) {
											for (var zsi in zg.zad_sz) {
												var zs = zg.zad_sz[zsi]; 
												p.rbh_mies = common.rozbij_na_miesiace(zs.data_start, zs.data_end, zs.rbh_plan, p.rbh_mies);
												zg.rbh_mies = common.rozbij_na_miesiace(zs.data_start, zs.data_end, zs.rbh_plan, zg.rbh_mies);
											}
										} else {
											p.rbh_mies = common.rozbij_na_miesiace(zg.data_start, zg.data_end, zg.rbh_plan, p.rbh_mies);
											zg.rbh_mies = common.rozbij_na_miesiace(zg.data_start, zg.data_end, zg.rbh_plan, zg.rbh_mies);
										}
									}
									//godziny sprzedane w rozbiciu na lata i miesiace dla calego projektu
									if (zg.rbh_wyk) {
										for (var rok in zg.rbh_wyk.rok) {
											if (!p.rbh_wyk_mies[rok]) p.rbh_wyk_mies[rok] = [];
											for (var miesiac in zg.rbh_wyk.rok[rok]) {
												if (!p.rbh_wyk_mies[rok][miesiac-1]) p.rbh_wyk_mies[rok][miesiac-1] = {kwota: 0, ile: 0};
												for (var user_id in zg.rbh_wyk.rok[rok][miesiac]) {
													p.rbh_wyk_mies[rok][miesiac-1].ile += zg.rbh_wyk.rok[rok][miesiac][user_id].ile;
													p.rbh_wyk_mies[rok][miesiac-1].kwota += zg.rbh_wyk.rok[rok][miesiac][user_id].ile * zg.rbh_wyk.rok[rok][miesiac][user_id].stawka;
												}
											}
										}
									}
								}
							}
						}
					}
				}
				callback(null);
			},

			
			function(callback){ if (steps < 12) {callback(); return;} else console.log(" 12 wskazniki");
				for (var si in projekt) {
					for (var pi in projekt[si]) {
						var p = projekt[si][pi];
						p.bkph_bud = {};
						p.bkph_bud_cum = {};
						p.rkpw_bud = {};
						// var bkph_bud = {};
						// var bkpw_bud = {};
						// var rkpw_bud = {};
						var temp_cum = 0;
						for (var ri in p.budzet_mies) {
							if (!p.bkph_bud[ri]) p.bkph_bud[ri] = [];
							if (!p.bkph_bud_cum[ri]) p.bkph_bud_cum[ri] = [];
							for (var mi in p.budzet_mies[ri]) {
								if (!p.bkph_bud[ri][mi]) p.bkph_bud[ri][mi] = 0;
								p.bkph_bud[ri][mi] += p.budzet_mies[ri][mi];
							}
							for (var mi = 0 ; mi < 12; mi += 1) {
								// if (!p.bkph_bud_cum[ri][mi]) p.bkph_bud_cum[ri][mi] = 0;
								if (p.bkph_bud[ri][mi])
									temp_cum += p.bkph_bud[ri][mi];
								p.bkph_bud_cum[ri][mi] = temp_cum;
							}
						}
						for (var ei in p.etap) {
							var e = p.etap[ei];
							for (var zgi in e.zad_gl) {
								var zg = e.zad_gl[zgi];
								if (zg.konto && zg.konto.data) {
									for (var ki in zg.konto.data) {
										if (ki && ki != "null") {
											var d = new Date(ki);
											var ri = d.getFullYear();
											var mi = d.getMonth();
											if (!p.rkpw_bud[ri]) p.rkpw_bud[ri] = [];
											if (!p.rkpw_bud[ri][mi]) p.rkpw_bud[ri][mi] = 0;
											p.rkpw_bud[ri][mi] += zg.konto.data[ki];
										}
									}
								}
							}
						}
					/*
						//wyliczenie rzeczywistego uzycia
						each etap, nr_etapu in projekt.etap
							each zadanie, nr_zadania in etap.zad_gl
								if (zadanie.konto && zadanie.konto.data)
									each kwota, kiedy in zadanie.konto.data
										if (kiedy && kwota)
											- var d = new Date(kiedy)
											// div= d.getFullYear() + " " + d.getMonth() +  ": " + kwota + " " + zadanie.konto.nazwa
											if ((d.getFullYear() == (cur_year -1)) && (d.getMonth() == 11))
												// - bkpw_bud.przed += kwota
												- rkpw_bud.przed += kwota
											else if (d.getFullYear() == cur_year)
												- var i = 0
												while i < 12
													if (i == d.getMonth())
														// - bkpw_bud.cum[i] += kwota
														- rkpw_bud.cum[i] += kwota
													- i++
					*/
					}
				}
				callback(null);
			},
			
//mozna odpalać równolegle z innymi
			function(callback){ if (steps < 20) {callback(); return;} else console.log(" 20 osoby");
				request.query(
				"SELECT * FROM [PNU].[dbo].[osoby] ORDER BY nazwa"
				, function(err, sqlData) {
					if (err) { callback(err); }
					else {
						sqlData.forEach(function(i){
							osoby[i.id] = i;
							// osoby_sort.push(i);
						});
						callback(null);
					}
				})
			},
			function(callback){ if (steps < 22) {callback(); return;} else console.log(" 22 karty_pr_pnu");
				// console.log('SELECT COALESCE( z.zlecenie, p.zlecenie ) AS pnu, u.nr, u.nazwa AS kto, SUM( czas ) /60 AS czas FROM `kart_pr_prace` p left join `kart_pr_zadania` z on (p.zadanie=z.id) left join `users` u on (p.user_id = u.id) where p.data >= ' + config.from.getTime() + ' and p.data <= ' + config.to.getTime() + ' and (p.zlecenie like "PNU%" or (p.zadanie is not null and z.zlecenie like "PNU%")) group by p.user_id, pnu ORDER BY kto');
				karty_pr.query(
					'SELECT   MID(FROM_UNIXTIME(p.data/1000),1,4) as year,  MID(FROM_UNIXTIME(p.data/1000),6,2) as month, COALESCE( z.zlecenie, SUBSTR(p.zlecenie, 16)) AS pnu, u.nr AS nr, u.nazwa AS nazwa, SUM( czas ) /60 AS ile \
					FROM (SELECT * from `kart_pr_prace_all` WHERE zlecenie like "PNU Projekt nr %" or zadanie is not null) p \
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
						//0=calosc, 1=projekt, 2=sekcja, 3=etap, 4=zadanie
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

			function(callback){ if (steps < 23) {callback(); return;} else console.log(" 23 % zaawansowania prac");
				karty_pr.query(
					'SELECT z2.id, z2.nazwa, z2.zlecenie, SUM( z2.rbh ) AS plan , SUM( x.wypracowane ) AS wypracowane , SUM( x.wypracowane ) / SUM( z2.rbh ) AS zaawansowanie \
					FROM (\
						SELECT * \
						FROM  `kart_pr_zadania` \
						WHERE typ =  "PNU" \
						AND rbh >0 \
					)z2 \
					LEFT JOIN ( \
						SELECT xx.id, xx.zlecenie, sum(xx.rbh) as rbh, sum(xx.czas)/60 as wypracowane \
						FROM 	( \
							SELECT z.*, sum(p.czas) as czas \
							FROM ( SELECT * FROM  `kart_pr_zadania` WHERE rbh > 0 )z \
							LEFT JOIN  ( SELECT * FROM `kart_pr_prace` where zadanie is not null) p ON p.zadanie = z.id \
							group by z.id \
						UNION \
							SELECT z.*, sum(p.czas) as czas \
							FROM ( SELECT * FROM  `kart_pr_zadania` WHERE rbh > 0 )z \
							RIGHT JOIN ( SELECT * FROM `kart_pr_prace` where zadanie is not null) p ON p.zadanie = z.id	 \
							group by z.id \
						) xx \
						where xx.zlecenie is not null \
						group by xx.zlecenie \
					)x ON z2.id = x.id \
					GROUP BY z2.zlecenie'
				, function(err, rows, fields) {
					if (err) callback(err);
					// karty_pr_pnu = {};
					rows.forEach(function(k){
						var wzor = /^([0-9]{1,3})([A-Z]{0,4})[\/]?([0-9]{1,3})?[\/]?([0-9]{1,3})?$/;
						var temp = k.zlecenie.match(wzor);
						if (!temp)
							console.log(k.zlecenie);
						else {
							if (temp[2] == "") temp[2] = "Z";
							if (!temp[3] || temp[3] == "") temp[3] = "?";
							if (!temp[4] || temp[4] == "") temp[4] = "?";
							// console.log(k.zlecenie);
							// console.log(temp);
							if (projekt[temp[2]] && projekt[temp[2]][temp[1]] && projekt[temp[2]][temp[1]].etap[temp[3]]) {
								var zg = projekt[temp[2]][temp[1]].etap[temp[3]].zad_gl[temp[4]]
								if (zg){
									// console.log(zg.opis);
									zg.zaawansowanie = {plan: k.plan, wyk: k.wypracowane, proc: k.zaawansowanie};
									// console.log(zg.zaawansowanie);
								}
							}
							// karty_pr_pnu[temp[2]][temp[1]][temp[3]][temp[4]][k.year][k.month].sum += k.ile;
						}
					});
					callback(null);
				});
			},
			
//po wszystkich
			function(callback){ if (steps < 120) {callback(); return;} else console.log(" mpk");
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
					pnu[si] = {};
					for (var pi in projekt[si]) {
						var p = projekt[si][pi];
						var p_nr = p.nr;
						if (p.oddzial != "Z")
							p_nr += p.oddzial;
						pnu[si][pi] = {nr: p_nr, nazwa: "PNU Projekt nr "+p_nr, opis: p.opis, etap:[], status: p.status};
						for (var ei in projekt[si][pi].etap) {
							pnu[si][pi].etap[ei] = {};
							for (var zi in projekt[si][pi].etap[ei].zad_gl) {
								var z = projekt[si][pi].etap[ei].zad_gl[zi];
								var temp_date = null;
								if (z.data_end)
									temp_date = z.data_end.getTime();
								pnu[si][pi].etap[ei][zi] = {nr: z.nr, nazwa: z.opis, id: z.id, status: z.status, rbh_pnu_plan: z.rbh_plan, termin: temp_date};
								if (z.zaawansowanie) {
									pnu[si][pi].etap[ei][zi].rbh_plan_czyn = z.zaawansowanie.plan;
									pnu[si][pi].etap[ei][zi].rbh_wyk = z.zaawansowanie.wyk;
								}
							}
						}
					}
				}
				callback(null);
			}
		],
		function(err, results){
			is_refreshing = false;
			// karty_pr.end();
			// connection.close();
			if (main_callback)
				main_callback(err);
			if (err) {
				console.log(err);
			} else {
			}
		});
	}

    module.exports.sprzedaj = sprzedaj;
    module.exports.edytuj = edytuj;
    module.exports.refresh_data = refresh_data;
    module.exports.dane = function() {
		return {
			projekt: projekt,
//			weryfikacja: weryfikacja,
			// budzet_mies: budzet_mies,
			// rbh_mies: rbh_mies,
			karty_pr_pnu: karty_pr_pnu,
			// osoby_sort: osoby_sort,
			osoby: osoby,
			pnu: pnu,
//			mpk: mpk,
			rbh_sprzedane: rbh_sprzedane,
			counter: counter
		};
	}
}());