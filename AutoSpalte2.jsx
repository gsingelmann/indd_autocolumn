/* ---------------------------------------------------------------------------------- *\ 
MIT License

Copyright (c) [year] [fullname]

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE. 
\* ---------------------------------------------------------------------------------- */ 
/* ---------------------------------------------------------------------------------- *\  
AutoColumn 2
Description:Set all columnwidths of a table numerically
[Ver. 2]  
[Author: Gerald Singelmann. ] 
[Lang: DE, EN, IT]  
[Getestet mit: InDesign CC]  
[Creat: 19-03-21]  
Bugs & Feedback : https://github.com/gsingelmann/indd_autocolumn
www.cuppascript.com  
\* ---------------------------------------------------------------------------------- */ 

	// ----------------------------------------------------------------------------------
	//	localized terms
	// ----------------------------------------------------------------------------------
	var sAutoColumn = { en: "AutoColumn2...", de: "AutoSpalte2...", it: "AutoColumn2..." };
	var sNoSelection = { en: "Place the cursor inside a table", de: "Platzieren Sie den Cursor in einer Tabelle.", it: "Posiziona il cursore all'interno di una cella"};
	var sAutoOn = { en: "All Auto On", de: "Alle \"Auto\" an", it: "Tutto automatico"};
	var sAutoOff = { en: "All Auto Off", de: "Alle \"Auto\" aus", it: "Tutto manuale"};
	var sLoad = { en: "Load from Style", de: "Aus Format laden", it: "Carica da stile"};
	var sStore = { en: "Store in Style", de: "Speichern in Format", it: "Salva nello stile"};
	var sCancel = { en: "Cancel", de: "Abbrechen", it: "Annulla"};




if ( app.selection.length ) 
	app.doScript( autoSpalte, ScriptLanguage.JAVASCRIPT, undefined, UndoModes.ENTIRE_SCRIPT, localize(sAutoColumn) );
else
	alert(localize(sAutoColumn) + "\n" + localize(sNoSelection));

function autoSpalte(){
	// ----------------------------------------------------------------------------------
	//	Find table in selection
	// ----------------------------------------------------------------------------------
	var mySel = app.selection[0];
	if (app.selection[0].constructor.name == "Cell") {
		myCell = app.selection[0];  
	} else if (app.selection[0].parent.constructor.name == "Cell") {		
		myCell = app.selection[0].parent;  
	} else { 
		alert(localize(sNoSelection)) 
		return;
	} 	
	// ----------------------------------------------------------------------------------
	//	Inspect geometry of table
	// ----------------------------------------------------------------------------------
	var myTable = myCell.parent;
	var myTableStyle = myTable.appliedTableStyle;
	var storedWidths = myTableStyle.extractLabel("gs_autospalte");
	var myColumnCount = myTable.columns.length;
	var myFrame = myTable.parent;
	if (myTable.parent.constructor.name == "Cell") {
		myFrameWidth = myFrame.width-myFrame.leftInset-myFrame.rightInset;
	} else {
		// 210208 Edit: try to get column width instead of simply textframe width
		try {
			myFrameWidth = myFrame.textFramePreferences.textColumnFixedWidth;
		} catch(e) {
			myFrameWidth = myFrame.geometricBounds[3] - myFrame.geometricBounds[1];
		}
	}

	var nuColumnWidths = new Array();
	var nuColumnWidthFields = new Array();
	var nuColumnWidthFieldLabels = new Array();
	var nuColumnWidthCalc = new Array();
	

	// ----------------------------------------------------------------------------------
	//	UI to enter column widths
	// ----------------------------------------------------------------------------------
	var w = new Window("dialog", localize(sAutoColumn));
	w.orientation = "column";
	w.alignChildren = "fill";
	w.alignment = "fill";
	var fields = w.add("group");
	fields.orientation = "row";
	fields.alignChildren = "fill";
	fields.alignment = "fill";
	
	for (var n = 0; n < myColumnCount; n++) {
		nuColumnWidths[n]= myTable.columns[n].width;
		var aPanel = fields.add("panel");
		aPanel.orientation = "column";
		aPanel.alignChildren="left";
		aPanel.ix = n;
		aPanel.text =  (n+1).toString();
		
		aPanel.add("statictext", undefined, Math.floor(myTable.columns[n].width * 1000) / 1000);
		
		nuColumnWidthFields[n] = aPanel.add("edittext", undefined, nuColumnWidths[n]);
		nuColumnWidthFields[n].characters = 5;
		nuColumnWidthFields[n].onChange = function() {
			var ix = this.parent.ix;
			nuColumnWidths[ix] = Number(nuColumnWidthFields[ix].text.replace(/,/g, "."));
			nuColumnWidthCalc[ix].value = false;
			calcAuto();
		}
	
		nuColumnWidthCalc[n] = aPanel.add("checkbox", undefined, "auto");
		nuColumnWidthCalc[n].value = false;
		nuColumnWidthCalc[n].onClick = function() {
			calcAuto();
		}
		
	}
	calcAuto();
	
	w.options = w.add("group");
	w.options.orientation = "row";
	w.options.alignChildren = "left";
	w.options.alignment = "fill";
	w.options.allOnButton = w.options.add("button", undefined, localize(sAutoOn));
	w.options.allOnButton.onClick = function () {
		for (var n = 0; n < myColumnCount; n++) {
			nuColumnWidthCalc[n].value = true;
		}
		calcAuto();
	}
	w.options.allOffButton = w.options.add("button", undefined, localize(sAutoOff));
	w.options.allOffButton.onClick = function () {
		for (var n = 0; n < myColumnCount; n++) {
			if (nuColumnWidthCalc[n].value == true) {
				nuColumnWidthFields[n].text = myTable.columns[n].width;
				nuColumnWidthCalc[n].value = false;
			}
		}
		calcAuto();
	}
	w.options = w.add("group");
	w.options.orientation = "row";
	w.options.alignChildren = "left";
	w.options.alignment = "fill";
	w.options.loadButton = w.options.add("button", undefined, localize(sLoad));
	w.options.loadButton.onClick = loadClick;
	if (myTableStyle.extractLabel("gs_autospalte") == "") {
		w.options.loadButton.enabled = false;
	}
	w.options.store = w.options.add("checkbox", undefined, localize(sStore) +" \"" + myTableStyle.name+ "\"")
	
	w.buttons = w.add("group");
	w.buttons.orientation = "row";
	w.buttons.alignChildren = "left";
	w.defaultElement = w.buttons.add("button", undefined, "OK");
//~ 		w.defaultElement.onClick = okClick;
	w.cancelElement = w.buttons.add( "button", undefined, localize(sCancel) );
	w.cancelElement.onClick = function() {
		this.window.close();
		exit();
	}
	
	w.center();
	var bClickedOK = w.show();
	
	// ----------------------------------------------------------------------------------
	//	User clicked OK, change table
	// ----------------------------------------------------------------------------------
	if (bClickedOK == 1) {
		if (w.options.store.value == true) {
			var nuStore = "";
			for (var n = 0; n < myColumnCount-1; n++) {
				nuStore += (nuColumnWidthCalc[n].value ? "auto" : nuColumnWidths[n]) + "#";
			}
			nuStore += (nuColumnWidthCalc[n].value ? "auto" : nuColumnWidths[n]);
			myTableStyle.insertLabel("gs_autospalte", nuStore);
		}
	
		var manWidth = 0.0;
		var autoColumns = 0;
		for (n=0; n < myColumnCount; n += 1) {
			if (nuColumnWidthCalc[n].value == false) {
				manWidth += Number(nuColumnWidthFields[n].text.replace(/,/g, "."));
			} else {
				autoColumns++;
			}
		}
	
		var autoWidth = 1;
		if (autoColumns > 0) {
			autoWidth = ((myFrameWidth - manWidth) / autoColumns);
		} else {
			autoWidth = 1;
		}
		if (autoWidth < 0) autoWidth = 1;
		for (n=0; n < myColumnCount; n += 1) {
			if (nuColumnWidthCalc[n].value == true) {
				myTable.columns[n].width = autoWidth;
			} else {
				myTable.columns[n].width = Number(nuColumnWidthFields[n].text.replace(/,/g, "."));
			}
		}			
	}
	
	// ----------------------------------------------------------------------------------
	//	Distribute remaining width on auto-columns
	// ----------------------------------------------------------------------------------
	function calcAuto() {
		var manWidth = 0.0;
		var autoColumns = 0;
		for (n=0; n < myColumnCount; n += 1) {
			if (nuColumnWidthCalc[n].value != true) {
				manWidth += Number(nuColumnWidthFields[n].text.replace(/,/g, "."));
			} else {
				autoColumns++;
			}
		}
	
		if (autoColumns > 0) {
			autoWidth = ((myFrameWidth - manWidth) / autoColumns);
		} else {
			autoWidth = 1;
		}
		if (autoWidth < 0) autoWidth = 1;
		for (n=0; n < myColumnCount; n += 1) {
			if (nuColumnWidthCalc[n].value == true) {
				nuColumnWidthFields[n].text = autoWidth;
			} 
		}			
	}
	
	// ----------------------------------------------------------------------------------
	//	extract stored widths for table-style
	// ----------------------------------------------------------------------------------
	function loadClick() {
		if (storedWidths != "") {
			storedWidths = storedWidths.split("#");
			var f = Math.min(storedWidths.length, myColumnCount);
			for (var n = 0; n < f; n++) {
				if (isNaN(Number(storedWidths[n])) == false) {
					nuColumnWidthFields[n].text = storedWidths[n];
					nuColumnWidthCalc[n].value = false;
				} else if (storedWidths[n] == "auto") {
					nuColumnWidthFields[n].text = 0;
					nuColumnWidthCalc[n].value = true;
				} 
			}
		}
		calcAuto();
	}
}
