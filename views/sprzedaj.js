$(function() {
	sprzedaj = function(){
		var obj = {
			year: $("#year").val(),
			month: $("#month").val(),
			kto_id: $("#prac").val(),
			proj_id: $("#zad").val(),
			rbh: $("#rbh").val().replace(",",".")
		}
		// console.log(obj);
		$.ajax({
			url: '/sprzedaj?callback=?',
			dataType: 'json',
			data: obj,
			timeout: 2000
		}).success(function(obj){
			window.location.reload();
		}).fail( function() {
			alert('Błąd serwera PNU.');
		});
		// console.log('http://192.168.30.12:8888/sprzedaj?year='+$("#year").val()+'&month='+$("#month").val()+'&kto_id='+$("#prac").val()+'&proj_id='+$("#zad").val()+'&rbh='+$("#rbh").val());
		// a(href='http://192.168.30.12:8888/sprzedaj?year='+rok+'&month='+miesiac+'&kto_id='+kto.nr+'&proj_id='+projekt.etap[etap_nr].zad_gl[zad_nr].id+'&rbh='+1) Sprzedaj
		// window.location.reload();
	};
	
	dialog = $( "#dialog-form" ).dialog({
		autoOpen: false,
		height: 300,
		width: 350,
		modal: true,
		buttons: {
			"Sprzedaj": sprzedaj,
			"Anuluj": function() {
				dialog.dialog( "close" );
			}
		},
		close: function() {
			// form[ 0 ].reset();
			// allFields.removeClass( "ui-state-error" );
		}
	});

	ed_dialog = $( "#edit-form" ).dialog({
		autoOpen: false,
		height: 300,
		width: 350,
		modal: true,
		buttons: {
			"Edytuj": function() { 
				var g_vals = $( "#ed_opis" ).data("vals");
				// g_vals.val
				g_vals.val = $( "#ed_opis" ).val();
				console.log(g_vals);
				edit_send(g_vals);
				ed_dialog.dialog( "close" );
			},
			"Anuluj": function() {
				ed_dialog.dialog( "close" );
			}
		},
		close: function() {
		}
	});

	
	$(".hider").each(function( index ) {
		var rok = $( this ).text();
		$(".y"+rok).hide();
		$( this )//.button()
		.click(function(){
			// console.log(rok)
			$(".y"+rok).toggle();
		});
		//.css('width', '100%');
	});
	$(".y2015").show();

	
	$(".sell").each(function( index ) {
		var title = $( this ).attr("title");
// console.log(title);
		var vals = $( this ).attr("title").split("_");
		var today = new Date();
		var min_year = today.getFullYear();
		var min_month = today.getMonth();
		$( this ).attr("title", "");
		if (vals[0] < min_year) return;
		if (vals[1] < min_month) return;
		$( this ).append("<span>sprzedaj</span>");
		$("span", this).button().css("margin-left", "20px")
		  .click(function( event ) {
			// event.preventDefault();
// console.log(vals);
			$("#year").val(vals[0]);
			$("#month").val(vals[1]);
			$("#prac").val(vals[2]);
			$("#zad").val(vals[3]);
			$("#rbh").val(Math.floor(vals[4]*2)/2);
			dialog.dialog( "open" );
		  });
		// console.log($("span", this));
	});

	$(".edit").each(function( index ) {
		var title = $( this ).parent().attr("title");
		var vals = {};
			// baza.edytuj(req.query.table, req.query.id, req.query.col, req.query.val
		// console.log(title);
		if (title) {
			var vals2 = title.split("_");
			vals.col = $( this ).attr("title");
			if (vals2[0] == "sz") {
				vals.table = "zad_sz";
			} else if (vals2[0] == "gl") {
				vals.table = "zad_gl";
			} else if (vals2[0] == "et") {
				vals.table = "etap";
			} else if (vals2[0] == "rbh") {
				vals.table = "rbh";
				vals.col = "ilosc";
			} else if (vals2[0] == "pr") {
				vals.table = "projekty";
			} else if (vals2[0] == "wer") {
				vals.table = "weryfikacja";
			} else if (vals2[0] == "budz") {
				vals.table = "budzet";
			} else return;
			if (vals2[1] > 0) {
				vals.id = vals2[1];
			} else return;
		}

		// $( this ).append("<span>edytuj</span>");
		var span_html = $( this ).html();
		// console.log($( this ).html());
		$( this ).html('<span class="val">'+span_html+'</span><span class="butt">edytuj</span>');
		$("span.butt", this).button()
		.click(function( event ) {
			// $( this ).parent().text()
			// $(".edit.date").first().text()
			if ($( this ).parent().hasClass("date")) {
				var wzor = /^([0-9]{2})\.([0-9]{2})\.([0-9]{4}).*$/;
				var data = $(".val", $( this ).parent() ).text().match(wzor);
				if (data) {
					data = (data[3])+"-"+(data[2])+"-"+(data[1]);
					// data = (data[3]/1+1)+"-"+data[2]+"-"+data[1];
					// data = (data[3])+"-"+(data[2]/1+1)+"-"+(data[1]);
				}
				vals.val = prompt("Nowa wartość:", data);
				if(!vals.val) return;
				wzor = /^([0-9]{4})\-([0-9]{2})\-([0-9]{2})$/;
				if (!vals.val.match(wzor)) { alert("Niepoprawny format"); return;}
			} else if ($( this ).parent().hasClass("curr")) {
				var wzor = /^([0-9 ]+)[\,\.]{1}([0-9]{2}).*$/;
				var data = $(".val", $( this ).parent() ).text().match(wzor);
				// data = vals.val.match(wzor);
				// console.log($( this ).parent().text());
				if (data) {
					data = data[1].replace(" ","")/1 + data[2]/100;
				}
				vals.val = prompt("Nowa wartość:", data);
				if(!vals.val) return;
				vals.val = vals.val.replace(",",".");
				// console.log(data);
				// console.log(vals);
				// console.log(data[1].replace(" ",""));
			} else if ($( this ).parent().hasClass("rbh")) {
				var wzor = /^([0-9 ]+).*$/;
				var data = $(".val", $( this ).parent() ).text().match(wzor);
				if (data) {
					data = data[1].replace(" ","")/1;
					vals.id = $( this ).parent().attr("title");
				}
				vals.val = prompt("Nowa wartość:", data);
				if(!vals.val) return;
				// console.log(data);
			} else if ($( this ).parent().hasClass("name")) {
				// console.log($(".val", $( this ).parent() ));
				var data = $(".val", $( this ).parent() ).text();
				// vals.val = prompt("Nowy opis:", data);
				// console.log(vals);
				$( "#ed_opis" ).val(data);
				$( "#ed_opis" ).data("vals", vals);
				ed_dialog.dialog( "open" );
				return;
			} else if ($( this ).parent().hasClass("state")) {
				var data = $(".val", $( this ).parent() ).text();
				if (data == "zakończony")
					vals.val = 1;
				else
					vals.val = 3;
				// console.log(vals);
				// console.log(data);
				// return;
			} else {
				console.log($( this ).parent());
				// console.log(span_html);
				return;
			}
			edit_send(vals);
			// console.log(vals);
			// alert(JSON.stringify(vals));
			// return;
		});
	});

	function edit_send(vals){
		$.ajax({
			url: '/edytuj?callback=?',
			dataType: 'json',
			data: vals,
			timeout: 2000
		}).success(function(obj){
			if (obj) {
				console.log(obj);
				alert(obj.message);
			} else
				window.location.reload();
		}).fail( function() {
			alert('Błąd serwera PNU.');
		});		
	}
	var osoby_sort = [];
	if (typeof osoby !== 'undefined') {
		for (var io in osoby)
			osoby_sort.push(osoby[io]);
		osoby_sort.sort(function(a,b){
			if (a.nazwa > b.nazwa) return 1;
			if (a.nazwa < b.nazwa) return -1;
			return 0;
		});
		for (var io in osoby_sort)
			$('#prac').append('<option value=\"'+osoby_sort[io].id+'\">'+osoby_sort[io].nazwa+'</option>');
	}
	var si = $('#sekcja').val();
	var pi = $('#projekt').val();
	if (typeof pnu !== 'undefined') {
		var p = pnu[si][pi];
		for (var ei in p.etap) {
			for (var zi in p.etap[ei]) {
				var z = p.etap[ei][zi];
				$('#zad').append('<option value=\"'+z.id+'\" title=\"'+z.nazwa+'\">'+"Etap: "+ei+", Zad.: "+zi+'</option>');
			}
		}
	}
});