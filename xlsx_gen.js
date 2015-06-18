// xlsx_gen.js 
(function () {
    "use strict";
	var e4n = require('excel4node'),
		common = require('./pnu_common.js'),
		async = require('async');

	var monthNames = [ "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
		"Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień" ];
	var sekcja = ['Z','RY','W','DHTP'];
	var sekcja_opis = ['Zabrze ścianowe','Rybnik','Zabrze chodnikowe','Zabrze DHTP'];
	
	function Generuj(projekt, res, out){
		var wb;
		async.series([
			function(callback){ console.log("firstPage");
				PnuFirstPage(null, new Date(), function(new_wb){ wb = new_wb; callback()});
			},
			function(callback){ console.log("PNUPage");
				PnuAll(wb, projekt, callback);
			}
		],
		function(err, results){
			console.log("final");
			wb.write("pnu.xlsx", res);
			if (out)
				wb.write("pnu.xlsx");
		});
	}

	function KontaPage(projekt, year, month, date, callback){
		var wsOpts = {
			margins:{
				left : .5,
				right : .5,
				top : .75,
				bottom : .75,
				footer : .25,
				header : .25
			},
			fitToPage:{
				fitToWidth: 1
			},
			printOptions:{
				centerHorizontal : true,
				centerVertical : false
			}
		}
		var wb = new e4n.WorkBook();
		var styles = require('./style.js').styles(wb);
		var ws = wb.WorkSheet('Konta', wsOpts);
		// var year = 2015;
		// var month = 1;
		// var date = new Date();

		ws.Cell(1,1).String('DR i W').Style(styles.firstStyle)
		.Format.Font.Size(12)
		.Format.Font.Alignment.Horizontal('left');
		ws.Cell(1,5).String('Zabrze, '+common.formatDate(date)).Style(styles.firstStyle)
		.Format.Font.Size(12)
		.Format.Font.Alignment.Horizontal('right');

		ws.Row(2).Height(40);
		ws.Cell(2,1,2,5,true).String("Tabela godzin pracy pracowników działu TR-1, TR-2, DHTP, RTR  przy realizacji zadań planu nowych uruchomień za "+monthNames[month].toLowerCase() + " "+year+".")
		.Style(styles.firstStyle)
		.Format.Font.Size(12)
		.Format.Font.WrapText(true);
		
		var styleCol4 = styles.styleCenter.Clone();
		styleCol4.Font.Size(10);
		var styleCol5 = styles.styleCenter.Clone();
		styleCol5.Font.Size(8);
		
		var columnDefinitions = [
			{head:'L.p.', col:1, style: styles.styleCenter, width: 5},
			{head:'Treść zadania', col:2, style: styles.styleCenter, width: 50},
			{head:'Nr projektu', col:3, style: styles.styleCenter, width: 8},
			{head:'Konto', col:4, style: styles.styleCenter, width: 10},
			{head:'Liczba godzin przepracowanych w miesiącu '+monthNames[month].toLowerCase(), col:5, style: styles.styleCenter, width: 20}
		]

		var curRow = 4;
		columnDefinitions.forEach(function(i){
			ws.Cell(curRow,i.col).Style(i.style).String(i.head);
			ws.Column(i.col).Width(i.width);
		});
		curRow+=1;
		var lp = 1;
		var rbh_wyk_sum = 0;
		var mpk_sum = {};
		for (var si in sekcja) {
			if (projekt[sekcja[si]]) {
				var keysSorted = Object.keys(projekt[sekcja[si]]).sort();
				for (var pi in keysSorted) {
					var p = projekt[sekcja[si]][keysSorted[pi]];
					if (p.status == 3) continue;
					var p_start = curRow;
					ws.Cell(curRow,1).String(lp + '.');
					lp += 1;
					ws.Cell(curRow,2).Style(styles.styleJustify).String(p.opis).Format.Font.Bold();
					if (p.oddzial == "Z") {
						ws.Cell(curRow,3).String(p.nr);
					} else {
						ws.Cell(curRow,3).String(p.nr + p.oddzial);
					}
					ws.Cell(curRow,4).Style(styles.PNUtable);
					ws.Cell(curRow,5).Style(styles.PNUtable);
					curRow += 1;
					for (var ei in p.etap) {
						var e = p.etap[ei];
						//wyjątek w kontach analitycznych (pominąć etap 1 w PNU 66)
						if (p.nr == 66 && ei == 1) continue;
						// console.log(p.oddzial + ' ' + p.nr + ': ' + e.nr + '/' + Object.keys(p.etap).length + ' - ' + e.opis);
						if (Object.keys(p.etap).length > 1) {
							ws.Cell(curRow,2).Style(styles.styleJustify).String(e.opis).Format.Font.Bold();
							ws.Cell(curRow,4).Style(styles.PNUtable);
							ws.Cell(curRow,5).Style(styles.PNUtable);
							curRow += 1;
						}
						for (var zi in e.zad_gl) {
							var z = e.zad_gl[zi];
							ws.Cell(curRow,2).Style(styles.PNUtable).String(z.nr + ". " + z.opis).Format.Font.WrapText(true);
	//						ws.Cell(curRow,4).Style(styles.PNUtable);
	//						ws.Cell(curRow,5).Style(styles.PNUtable);
							// if (!z.konto) z.konto = 'PNP-..-..';
							if (!z.konto) z.konto = {nazwa : ""};
							ws.Cell(curRow,4).Style(styleCol4).String(z.konto.nazwa);
							z.rbh = "";
							z.rbh_wyk_sum = 0;
							var mpk_sort = {};
							if (z.rbh_wyk) {
								for (var rbri in z.rbh_wyk.rok) {
									for (var rbmi in z.rbh_wyk.rok[rbri]) {
										for (var rbnri in z.rbh_wyk.rok[rbri][rbmi]) {
											if (rbnri != "obj_length") {
												var kto = z.rbh_wyk.rok[rbri][rbmi][rbnri];
												if (rbri == year && rbmi == (month+1)) {
													// console.log(kto);
													if (!kto.mpk) kto.mpk = " ";
													if (!mpk_sort[kto.mpk]) mpk_sort[kto.mpk] = {string: "", sum:0, dzial: kto.dzial, mpk: kto.mpk};
													if (!mpk_sum[kto.mpk]) mpk_sum[kto.mpk] = 0;
													mpk_sum[kto.mpk] += kto.ile;
													mpk_sort[kto.mpk].string += kto.nr + " " + kto.nazwa + " - " + kto.ile + "\r\n";
													mpk_sort[kto.mpk].sum += kto.ile;
													// z.rbh += kto.nr + " " + kto.nazwa + " - " + kto.ile + "\r\n";
													z.rbh_wyk_sum += kto.ile;
												}
											}
										}
									}
								}
							}
							// console.log(mpk_sort);
							for (var mpki in mpk_sort) {
								// z.rbh += mpk_sort[mpki].dzial + " " + mpk_sort[mpki].mpk + "\r\n" + mpk_sort[mpki].string + "\r\n";
								z.rbh += mpk_sort[mpki].mpk + " - suma (" + mpk_sort[mpki].sum + " h)\r\n" + mpk_sort[mpki].string + "\r\n";
							}
							// if (z.rbh == "") z.rbh = '-';
							if (z.rbh == "") z.rbh = ' ';
							else z.rbh += 'RAZEM - ' + z.rbh_wyk_sum;	//"\r\n"
							rbh_wyk_sum += z.rbh_wyk_sum;
							ws.Cell(curRow,5).Style(styleCol5).String(z.rbh).Format.Font.WrapText(true);//.Size(10);
							curRow += 1;
						};
					};
					ws.Cell(p_start,1,curRow-1,1, true).Style(styles.styleJustify)
					.Format.Font.Alignment.Vertical('top');
					ws.Cell(p_start,3,curRow-1,3, true).Style(styles.styleJustify)
					.Format.Font.WrapText()
					.Format.Font.Bold()
					.Format.Font.Alignment.Vertical('top');
				}
			}
		}
		ws.Cell(curRow,1,curRow,4, true).Style(styles.styleJustify).String("Razem")
		.Format.Font.Bold();
		// console.log(rbh_wyk_sum);
		ws.Cell(curRow,5).Style(styles.styleJustify).String(rbh_wyk_sum + " h")
		.Format.Font.Bold();
		curRow += 1;
		ws.Cell(curRow,1,curRow,3, true).Style(styles.styleJustify).String("W tym:");
		for (var mpki in mpk_sum) {
			ws.Cell(curRow,4).Style(styles.styleJustify).String(mpki);
			ws.Cell(curRow,5).Style(styles.styleJustify).String(mpk_sum[mpki] + " h")
			.Format.Font.Bold();
			curRow += 1;
		}
		if (callback)
			callback(wb);
	}
	
	function PnuFirstPage(wb, date, callback) {
		if (!wb)
			wb = new e4n.WorkBook();
		var styles = require('./style.js').styles(wb);
		var wsOpts = {
			margins:{
				left : .5,
				right : .5,
				top : .75,
				bottom : .75,
				footer : .25,
				header : .25
			},
			fitToPage:{
				fitToHeight: 1,
				fitToWidth: 1
			},
			printOptions:{
				centerHorizontal : true,
				centerVertical : true
			}
		}
		var ws = wb.WorkSheet('1', wsOpts);
		for (var i=1; i<=7; i++)
			ws.Column(i).Width(10);
		ws.Column(4).Width(20);
		ws.Cell(1,1).String('Kopex Machinery S.A.').Style(styles.firstStyle)
		.Format.Font.Size(12)
		.Format.Font.Alignment.Horizontal('left');
		ws.Cell(1,7).String('Zabrze, '+common.formatDate(date)).Style(styles.firstStyle)
		.Format.Font.Size(12)
		.Format.Font.Alignment.Horizontal('right');
		ws.Cell(2,1).String('Dział DR i W').Style(styles.firstStyle)
		.Format.Font.Size(12)
		.Format.Font.Alignment.Horizontal('left');
		ws.Cell(5,7).String('ZASTRZEŻONE').Style(styles.firstStyle).Format.Font.Bold()
		.Format.Font.Alignment.Horizontal('right');
		ws.Cell(14,1,14,7,true).String('PLAN  NOWYCH  URUCHOMIEŃ').Style(styles.firstStyle)
		.Format.Font.Size(18)
		.Format.Font.Bold();
		ws.Cell(33,2).String('Opracował').Style(styles.firstStyle);
		ws.Cell(33,6).String('Zatwierdził').Style(styles.firstStyle);
		ws.Cell(36,2).String('. . . . . . . . . . .').Style(styles.firstStyle);
		ws.Cell(36,6).String('. . . . . . . . . . .').Style(styles.firstStyle);
		ws.Cell(38,2).String('Dyrektor DR i W').Style(styles.firstStyle);
		// ws.Cell(45,4).String(common.formatDate(date)).Style(styles.firstStyle);
		ws.Cell(45,4).String(monthNames[date.getMonth()] + " " + date.getFullYear() + " r.").Style(styles.firstStyle);
		callback(wb, 'firstPage');
	}

	function zs_row(ws, styles, zs, curRow, zg){
		zs.budzet_plan = common.formatCurr(zs.budzet_plan);
		if (zg) {
			ws.Cell(curRow,1)
				.String('Z ' + zs.nr + '. ' + zs.opis)
				.Style(styles.styleJustify);
		} else {
			ws.Cell(curRow,1)
				.String(zs.nr + ". " + zs.opis)
				.Style(styles.styleJustify);
		}

		var temp_str = "";
		for (var bi in zs.budzet) {
			if (zs.budzet[bi].nazwa)
				temp_str += zs.budzet[bi].nazwa + "\r\n";
		}
		ws.Cell(curRow,2).String(temp_str)
			.Style(styles.styleJustify)
			.Format.Font.Alignment.Horizontal('center');
		ws.Cell(curRow,3).String(common.formatDate(zs.data_start))
			.Style(styles.styleJustify);
		ws.Cell(curRow,4).String(common.formatDate(zs.data_end))
			.Style(styles.styleJustify);
		temp_str = "";
		for (var bi in zs.budzet) {
			if (zs.budzet[bi].kwota)
				temp_str += common.formatCurr(zs.budzet[bi].kwota);
		}
		if (temp_str == "") {
			temp_str += zs.budzet_plan;
		} else {
			temp_str += "\r\n";
		}
		for (var bi in zs.budzet) {
			if (zs.budzet[bi].kwota)
				temp_str += zs.budzet[bi].uwagi;
		}
		ws.Cell(curRow,5).String(temp_str)
			.Style(styles.styleRight);
		temp_str = "";
		if (zs.rbh_plan)
			temp_str += zs.rbh_plan
		ws.Cell(curRow,6).String(common.formatCurr(temp_str).replace(',00',''))
			.Style(styles.styleRight);
			
		if (zs.status == 2)
			ws.Cell(curRow,1,curRow,6)
				.Format.Fill.Pattern('solid')
				.Format.Fill.Color('CCCCCC');
	}
	
	function Zal(wb, weryfikacja, styles, lp, p){
		console.log('Zał. ' + lp);
		var wsOpts = {
			margins:{
				left : .5,
				right : .5,
				top : .75,
				bottom : .75,
				footer : .25,
				header : .25
			},
			fitToPage:{
				fitToHeight: false,
				fitToWidth: 1,
				orientation: 'landscape'
			},
			printOptions:{
				centerHorizontal : false,
				centerVertical : false
			}
		}

		var ws = wb.WorkSheet('Zał. ' + lp, wsOpts);
	//							curRow+=1;
		var columnDefinitions2 = [	//szerokosc 121
			{head:'Przedsięwzięcia', col:1, span:1, style: styles.styleCenter, width: 55},
			{head:'Realizujący', col:2, style: styles.styleCenter, width: 10},
			{head:'Termin rozpoczęcia', col:3, style: styles.styleCenter, width: 13},
			{head:'Termin zakończenia', col:4, style: styles.styleCenter, width: 13},
			{head:'Planowane koszty [PLN]', col:5, style: styles.styleCenter, width: 18},
			{head:'Planowana pracochłonność DRiW [RBH]', col:6, style: styles.styleCenter, width: 15}
		];
		var temp_str = "";
		if (p.oddzial == "Z")
			temp_str = 'Załącznik nr '+lp+' (projekt nr '+p.nr+')';
		else 
			temp_str = 'Załącznik nr '+lp+' (projekt nr '+p.nr+p.oddzial+')';
		ws.Cell(1,1).String(temp_str).Style(styles.firstStyle).Format.Font.Underline()
	//	.Format.Font.Size(12)
		.Format.Font.Alignment.Horizontal('left');
		ws.Cell(1,3,1,6,true).String('Termin rozpoczęcia '+common.formatDate(new Date(p.data_start))).Style(styles.firstStyle)
		.Format.Font.Size(12)
		.Format.Font.Alignment.Horizontal('center');
		var curRow = 2;
		// ws.Cell(curRow,1).String('Prowadzący projekt:').Style(styles.firstStyle)
			// .Format.Font.Alignment.Horizontal('left');
		// ws.Cell(curRow,2,curRow,7,true).String(p.prowadzacy.join(', ')).Style(styles.firstStyle)
			// .Format.Font.Alignment.Horizontal('left');
		ws.Cell(curRow,1,curRow,6,true).String('Prowadzący projekt: ').Style(styles.firstStyle)
			.Format.Font.Alignment.Horizontal('left');
		curRow += 1;
		ws.Cell(curRow,1,curRow,6,true).String(p.prowadzacy.join(', ')).Style(styles.firstStyle)
			.Format.Font.Bold()
			.Format.Font.Alignment.Horizontal('left');
		curRow += 1;
		// ws.Cell(curRow,1).String('Nazwa:').Style(styles.firstStyle)
			// .Format.Font.Alignment.Horizontal('left');
		// if (p.opis.length > 90)
			// ws.Row(curRow).Height(35);
		// ws.Cell(curRow,1,curRow,6,true)
			// .String('Nazwa:                     ' + p.opis)
		ws.Cell(curRow,1,curRow,6,true).String('Nazwa projektu:')
			.Style(styles.firstStyle)
			.Format.Font.Alignment.Horizontal('left')
			.Format.Font.WrapText(true)
		curRow += 1;
		ws.Row(curRow).Height(40);
		ws.Cell(curRow,1,curRow,6,true).String(p.opis)
			.Style(styles.firstStyle)
			.Format.Font.Alignment.Vertical('top')
			.Format.Font.Alignment.Horizontal('left')
			.Format.Font.WrapText(true)
			.Format.Font.Bold();
		curRow += 1;
		// ws.Cell(curRow,1).String("Przedmiot:\t").Style(styles.firstStyle)
			// .Format.Font.Alignment.Horizontal('left')
			// .Format.Font.Bold();
		// if (p.przedmiot.length > 90)
			// ws.Row(curRow).Height(35);
		// ws.Cell(curRow,1,curRow,6,true).String("Przedmiot:                " + p.przedmiot).Style(styles.firstStyle)
		ws.Cell(curRow,1,curRow,6,true).String("Przedmiot uruchomienia:").Style(styles.firstStyle)
			.Format.Font.Alignment.Horizontal('left')
			.Format.Font.WrapText(true)
		curRow += 1;
		ws.Row(curRow).Height(40);
		if (p.przedmiot.length > 90)
			ws.Row(curRow).Height(60);
		ws.Cell(curRow,1,curRow,6,true).String(p.przedmiot).Style(styles.firstStyle)
			.Format.Font.Alignment.Horizontal('left')
			.Format.Font.Alignment.Vertical('top')
			.Format.Font.WrapText(true)
			.Format.Font.Bold();
		curRow += 1;
		// if (p.cel.length > 90)
			// ws.Row(curRow).Height(35);
		// ws.Cell(curRow,1).String('Cel:').Style(styles.firstStyle)
			// .Format.Font.Alignment.Horizontal('left');
		// ws.Cell(curRow,1,curRow,6,true).String('Cel:                          ' + p.cel).Style(styles.firstStyle)
		ws.Cell(curRow,1,curRow,6,true).String('Cel uruchomienia:').Style(styles.firstStyle)
			.Format.Font.Alignment.Horizontal('left')
			.Format.Font.WrapText(true)
		curRow += 1;
		ws.Row(curRow).Height(40);
		if (p.cel.length > 90)
			ws.Row(curRow).Height(60);
		ws.Cell(curRow,1,curRow,6,true).String(p.cel).Style(styles.firstStyle)
			.Format.Font.Alignment.Horizontal('left')
			.Format.Font.Alignment.Vertical('top')
			.Format.Font.WrapText(true)
			.Format.Font.Bold();
		curRow += 1;
		curRow += 1;

		columnDefinitions2.forEach(function(i){
			if (i.span > 1){
				ws.Cell(curRow,i.col,curRow,i.col+i.span-1,true).Style(i.style).String(i.head);
			} else {
				ws.Cell(curRow,i.col).Style(i.style).String(i.head);
			}
			ws.Column(i.col).Width(i.width);
		});
		curRow += 1;

		var p_start = curRow;
		var sum_zl = 0;
		var sum_tab = [];
		// ws.Cell(curRow,1).String(p.opis);
		// ws.Cell(curRow,2).String(p.cel);

		for (var ei in p.etap) {
			var e = p.etap[ei];
			if (Object.keys(p.etap).length > 1) {
				ws.Cell(curRow,1,curRow,6,true).Style(styles.styleJustify).String(e.opis).Format.Font.Bold();
				curRow += 1;
			}
			for (var zi in e.zad_gl) {
				var z = e.zad_gl[zi];
				zs_row(ws, styles, z, curRow, true);
				ws.Cell(curRow,1,curRow,6)
					.Format.Font.Bold()
				curRow += 1;
				// if (z.zad_sz.length != 0) {
					for (var zsi in z.zad_sz) {
						var zs = z.zad_sz[zsi];
						zs_row(ws, styles, zs, curRow);
						curRow += 1;
					}
				// }
			}
		}

		ws.Cell(curRow,4).String("Razem").Style(styles.styleJustify);
		// ws.Cell(curRow,5).String(common.formatCurr(p.budzet_plan)).Style(styles.styleRight);
		ws.Cell(curRow,5).Number(p.budzet_plan).Style(styles.styleSumBud);
		
		// ws.Cell(curRow,6).String(common.formatCurr(p.rbh_plan).replace(',00','')).Style(styles.styleRight);
		ws.Cell(curRow,6).Number(p.rbh_plan).Style(styles.styleSumRbh);
		curRow += 1;
		/*
		if (Object.keys(sum_tab).length > 1) {
			for (var di in sum_tab) {
				ws.Cell(curRow,6).String("W tym wykazane przez " + di).Style(styles.styleJustify);
				ws.Cell(curRow,7).String(common.formatCurr(sum_tab[di])).Style(styles.styleJustify);
				curRow += 1;
			}
		}
		*/
		if (weryfikacja) {
			for (var di in weryfikacja){
				ws.Cell(curRow,1,curRow,6,true).Style(styles.styleWer).Format.Font.Bold().String("Weryfikacja " + di);
				curRow+=1;
				for (var wi in weryfikacja[di]){
					ws.Cell(curRow,1,curRow,6,true).Style(styles.styleWer).String("- " + weryfikacja[di][wi].co);
					curRow+=1;
				}
			}
		}
	}

	function PnuAll(wb, projekt, callback){
		var wsOpts = {
			margins:{
				left : .5,
				right : .5,
				top : .75,
				bottom : .75,
				footer : .25,
				header : .25
			},
			fitToPage:{
				fitToWidth: 1
			},
			printOptions:{
				centerHorizontal : true,
				centerVertical : false
			}
		}
		var ws = wb.WorkSheet('PNU', wsOpts);
		var styles = require('./style.js').styles(wb);
		var columnDefinitions = [
			{head:'L.p.', col:1, style: styles.styleCenter, width: 7},
			{head:'Treść zadania', col:2, style: styles.styleJustify, width: 50},
			{head:'Nr projektu', col:3, style: styles.styleCenter, width: 12},
			{head:'Nr załącznika', col:4, style: styles.styleCenter, width: 13}
		]

		var curRow = 1;
		columnDefinitions.forEach(function(i){
			ws.Cell(curRow,i.col).Style(i.style).String(i.head);
			// if (i.col == 1) {
				// ws.sheet.cols[0].col['@width'] = i.width;	// !!!!!!!!!
			// } else {
				ws.Column(i.col).Width(i.width);
			// }
		});

		curRow+=1;
		var lp = 1;
		var sekcja = ['Z','RY','W','DHTP'];
		var sekcja_opis = ['Zabrze ścianowe','Rybnik','Zabrze chodnikowe','Zabrze DHTP'];
		for (var si in sekcja) {
			if (projekt[sekcja[si]]) {
				ws.Cell(curRow,1,curRow,4,true).Style(styles.PNUtable).String(sekcja_opis[si]);
				curRow+=1;
				for (var pi in projekt[sekcja[si]]) {
					var p = projekt[sekcja[si]][pi];
					if (p.status == 3) continue;
					ws.Cell(curRow,columnDefinitions[0].col).Style(columnDefinitions[0].style).String(lp + '.');
					ws.Cell(curRow,columnDefinitions[1].col).Style(columnDefinitions[1].style).String(p.opis);
					if (p.oddzial == "Z") {
						ws.Cell(curRow,columnDefinitions[2].col).Style(columnDefinitions[2].style).String(p.nr);
					} else {
						ws.Cell(curRow,columnDefinitions[2].col).Style(columnDefinitions[2].style).String(p.oddzial + " " + p.nr);
					}
					ws.Cell(curRow,columnDefinitions[3].col).Style(columnDefinitions[3].style).String('- zał. nr ' + lp);
	 // if (lp == 1 || lp < 7) {
	 if (true) {
	// console.log(util.inspect(p.etap[1].zad_gl[5], false, 2));
	// console.log(util.inspect(p.etap[1].zad_gl[5], false, 2));

					Zal(wb, p.weryfikacja, styles, lp, p);
	 }
					lp += 1;
					curRow+=1;
				};
			}
		}
		//wyszukanie dat weryfikacji
		var daty = [];
		for (var si in sekcja) {
			if (projekt[sekcja[si]]) {
				for (var pi in projekt[sekcja[si]]) {
					var p = projekt[sekcja[si]][pi];
					for (var di in p.weryfikacja)
						if (daty.indexOf(di) == -1)
							daty.push(di);
				}
			}
		}
		daty.sort();
		daty.reverse();
		// console.log(daty);

		curRow+=1;
		ws.Cell(curRow,1,curRow,2,true).Style(styles.styleWer).Format.Font.Bold().String("Weryfikacja " + daty[0]);
		curRow+=1;
		for (var si in sekcja) {
			if (projekt[sekcja[si]]) {
				for (var pi in projekt[sekcja[si]]) {
					var pw = projekt[sekcja[si]][pi].weryfikacja;
					for (var di in pw){
						if (di == daty[0]){
							var wpis = "Projekt " + pi;
							if (sekcja[si] != "Z")
								wpis += sekcja[si];
							ws.Cell(curRow,1).Style(styles.styleWer).String(wpis);
							for (var wi in pw[di]){
								ws.Cell(curRow,2).Style(styles.styleWer).String("- " + pw[di][wi].co);
								curRow+=1;
							}
						}
					}
				}
			}
		}

		curRow+=1;
		ws.Cell(curRow,1,curRow,2,true).Style(styles.styleWer).Format.Font.Bold().String("Weryfikacja " + daty[1]);
		curRow+=1;
		for (var si in sekcja) {
			if (projekt[sekcja[si]]) {
				for (var pi in projekt[sekcja[si]]) {
					var pw = projekt[sekcja[si]][pi].weryfikacja;
					for (var di in pw){
						if (di == daty[1]){
							var wpis = "Projekt " + pi;
							if (sekcja[si] != "Z")
								wpis += sekcja[si];
							ws.Cell(curRow,1).Style(styles.styleWer).String(wpis);
							for (var wi in pw[di]){
								ws.Cell(curRow,2).Style(styles.styleWer).String("- " + pw[di][wi].co);
								curRow+=1;
							}
						}
					}
				}
			}
		}
		
		curRow+=1;
		ws.Cell(curRow,1).Style(styles.firstStyle).String("*");
		ws.Cell(curRow,2).Style(styles.firstStyle).String("- terminy zadań zależne od pozyskania klienta").Format.Font.Alignment.Horizontal('left');
		curRow+=1;
		ws.Cell(curRow,1).String("   ").Style(styles.styleEnd);
		ws.Cell(curRow,2).Style(styles.firstStyle).String("- zadania zakończone").Format.Font.Alignment.Horizontal('left');
		          
		callback(null, 'PNUPage');
	}

    module.exports.konta = KontaPage;
    module.exports.first = PnuFirstPage;
    module.exports.pnu = PnuAll;
    module.exports.generuj = Generuj;
}());
