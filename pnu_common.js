// pnu_common.js 
(function () {
    "use strict";

	var monthNames = [ "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
		"Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień" ];
	
	function pad(num) {
		var s = "00" + num;
		return s.substr(s.length-2);
	}
	
	function formatDate(curr_date){
		if (!curr_date) return "";
		if (typeof curr_date == "string")
			curr_date = new Date(curr_date);
		return pad(curr_date.getDate())+'.'+pad(curr_date.getMonth()+1)+'.'+curr_date.getFullYear()+' r.';
	}
	
	function formatCurr(n){
		if (!n) return "";
		if (typeof n == "string")
			n = parseFloat(n);
		//http://stackoverflow.com/questions/149055/how-can-i-format-numbers-as-money-in-javascript Short solution #1:
		return n.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$& ').replace(".",",");
		// return n.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
	}

	var compareStringsNumbers = function(a,b) {
		var matchPattern_A = /^\D*(\d+)\D*/g.exec(a);
		var matchPattern_B = /^\D*(\d+)\D*/g.exec(b);
		// console.log(matchPattern_A[1] + ' '+ matchPattern_B[1]);
		if(matchPattern_A && matchPattern_B) {
			if (parseInt(matchPattern_A[1], 10) < parseInt(matchPattern_B[1], 10)){
				// console.log(-1);
				return -1;
			}
			if (parseInt(matchPattern_A[1], 10) > parseInt(matchPattern_B[1], 10)) {
				// console.log(1);
				return 1;
			} else {
				// console.log(0);
				return 0;
			}
		} else {
			// console.log('err');
			if (a < b)
				return -1;
			if (a > b)
				return 1;
			return 0;
		}			
	}
	
	var roman = new Array(); 
	roman = ["M","CM","D","CD","C","XC","L","XL","X","IX","V","IV","I"]; 
	var decimal = new Array(); 
	decimal = [1000,900,500,400,100,90,50,40,10,9,5,4,1]; 
	function decimalToRomanSimple(value) { 
	  if (value <= 0 || value >= 4000) return value; 
		var romanNumeral = ""; 
		for (var i=0; i<roman.length; i++) { 
		  while (value >= decimal[i]) {  
			value -= decimal[i]; 
			romanNumeral += roman[i]; 
		  } 
		} 
		return romanNumeral; 
	}
	
	function rozbij_na_miesiace(start, end, val_2_add, obj) {
		//zaokraglenie do pelnych zlotowek i wyrownanie w pierwszym miesiacu
		// mozna jeszcze dopisac wyliczenie dni roboczych w miesiacu :)
		if (!start || !end || !val_2_add) return obj;
		var data_start = new Date(start);
		var data_end = new Date(end);
		var days_count = (data_end - data_start)/(24*60*60*1000);
		var per_day = val_2_add / days_count;
		// var bud_2_add = obj || {};
		var bud_2_add = {};
		var d = new Date();
		if (!obj) obj = {};
		for (d.setTime(data_start.getTime()); d.getTime() < data_end.getTime(); d.setDate(d.getDate()+1)){
		// for (var d = data_start; d < data_end; d.setDate(d.getDate()+1)){
			var y = d.getFullYear();
			// var m = d.getMonth()+1;
			// var m = monthNames[d.getMonth()];
			var m = d.getMonth();
			if (!bud_2_add[y]) bud_2_add[y] = [];
			if (!bud_2_add[y][m]) bud_2_add[y][m] = 0;
			if (!obj[y]) obj[y] = [];
			if (!obj[y][m]) obj[y][m] = 0;
			bud_2_add[y][m] += per_day;
		}
		//zaokraglenie i wyliczenie reszty
		var round_sum = 0;
		for (var y in bud_2_add) {
			for (var m in bud_2_add[y]) {
				var per_month = Math.floor(bud_2_add[y][m]);
				obj[y][m] += per_month;
				round_sum += per_month;
			}			
		}
		//dodanie reszty do pierwszego miesiaca
		d.setTime(data_start.getTime());
// console.log(ds);
// console.log(obj);
// console.log(val_2_add);
// console.log(round_sum);
		if (!obj[d.getFullYear()]) obj[d.getFullYear()] = [];
		obj[d.getFullYear()][d.getMonth()] += val_2_add - round_sum;
		return obj;
	}
	
    module.exports.toRoman = decimalToRomanSimple;
    module.exports.compareStringsNumbers = compareStringsNumbers;
    module.exports.pad = pad;
    module.exports.formatDate = formatDate;
    module.exports.formatCurr = formatCurr;
    module.exports.rozbij_na_miesiace = rozbij_na_miesiace;
    module.exports.monthNames = monthNames;
}());
