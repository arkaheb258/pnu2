// style.js 
(function () {
    "use strict";

    module.exports.styles = function(wb) {
		var styles = {};
		styles.mainStyle = wb.Style();
		styles.mainStyle.Font.Family('Times New Roman');
		styles.mainStyle.Font.Size(12);
		styles.mainStyle.Font.Color('000000');
		styles.mainStyle.Font.Alignment.Horizontal('left');
		
		styles.firstStyle = wb.Style();
		styles.firstStyle.Font.Family('Times New Roman');
		styles.firstStyle.Font.Size(14);
		styles.firstStyle.Font.Color('000000');
		styles.firstStyle.Font.Alignment.Horizontal('center');

		styles.PNUtable = wb.Style();
		styles.PNUtable.Font.Color('000000');
		styles.PNUtable.Font.Family('Times New Roman');
		styles.PNUtable.Font.Size(12);
		styles.PNUtable.Border({
			left:{
				style:'thin'
			},
			right:{
				style:'thin'
			},
			top:{
				style:'thin'
			},
			bottom:{
				style:'thin'
			},
			inside:{
				style:'thin'
			}
		});
		styles.PNUtable.Font.Alignment.Vertical('top');
		
	//	styles.PNUtable.Font.WrapText(true);
		styles.styleCenter = styles.PNUtable.Clone();
		styles.styleJustify = styles.PNUtable.Clone();
		styles.styleRight = styles.PNUtable.Clone();
		styles.styleSumBud = styles.PNUtable.Clone();

		styles.styleCenter.Font.Alignment.Vertical('center');
		styles.styleCenter.Font.Alignment.Horizontal('center');
		styles.styleCenter.Font.WrapText(true);
		styles.styleJustify.Font.Alignment.Horizontal('justify');
		styles.styleJustify.Font.Alignment.Vertical('top');
		styles.styleJustify.Font.WrapText(true);
		styles.styleRight.Font.Alignment.Horizontal('right');
		styles.styleRight.Font.Alignment.Vertical('top');
		styles.styleRight.Font.WrapText(true);
		styles.styleSumBud.Number.Format("#,##0.00;($#,##0.00);-");
		styles.styleSumRbh = styles.PNUtable.Clone();
		styles.styleSumRbh.Number.Format("#,##0;($#,##0);-");
		styles.styleEnd = styles.PNUtable.Clone();
		styles.styleEnd.Fill.Pattern('solid');
		styles.styleEnd.Fill.Color('CCCCCC');

		styles.styleWer = styles.firstStyle.Clone();
		styles.styleWer.Font.Size(10);
		// styles.styleWer.Font.WrapText(true);
		// styles.styleWer.Font.Alignment.Horizontal('left');
		styles.styleWer.Font.Alignment.Horizontal('justify');
		styles.styleWer.Font.Alignment.Vertical('top');
		return styles;
	}
}());
