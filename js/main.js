let loadedDay;
let geojson;
const valueList = [];
let text;

//Map position
const latitude = 47.5573696;
const longitude = 13.8831908;
const zoom = 7;
let zoomed = false;

const firstRecordedDay = new Date("09/14/2020");
const changeDay = new Date("10/06/2020");
const today = new Date();
today.setDate(today.getDate() -1);
const date = new Date((today.getMonth()+1) + "/" + today.getDate() + "/" + today.getFullYear());

mapAndInfo = mapSetup();

findFileOpenIfFound(date,mapAndInfo[0], mapAndInfo[1]);


//Setsup the map with all features
function mapSetup(){
	const map = L.map('map', {zoomControl: false}).setView([latitude, longitude], zoom);

	map.dragging.disable();
	map.touchZoom.disable();
	map.doubleClickZoom.disable();
	map.scrollWheelZoom.disable();
	map.boxZoom.disable();
	map.keyboard.disable();
	if (map.tap) map.tap.disable();
	document.getElementById('map').style.cursor='default';
	map.attributionControl.addAttribution('Map Data &copy; <a href="https://github.com/ginseng666/GeoJSON-TopoJSON-Austria/">Flooh Perlot</a>' + ' ,  Infection Data &copy; <a href="https://orf.at/corona/daten/bezirke">ORF.at</a> & <a href="https://www.data.gv.at/covid-19">data.gv.at</a>' +
		' ,	<a href="https://github.com/noahreinalter/better-corona-ampel.netlify.app">Source Code</a>');


	const info = addInfo(map);
	addDatePicker(map, info);
	addLegend(map);

	return [map,info];
}



//Functions to add Addons to the map
function addDatePicker(map, info) {
	const datePickerWidget = L.Control.extend({
		options: {
			position: 'topleft'
		},

		onAdd: function (map) {
			this._div = L.DomUtil.create('div', 'datePicker');
			return this._div;
		}
	});
	map.addControl(new datePickerWidget());

	let language = getLanguage();

	$( ".datePicker" ).datepicker({
		minDate: firstRecordedDay,
		maxDate: date,
		firstDay: 1,
		dayNamesMin: getDayNames(language),
		monthNames: getMonthNames(language),
		onSelect: function(dateText) {
			const selectedDate = new Date(dateText);
			if(loadedDay.getTime() !== selectedDate.getTime()){
				loadedDay = selectedDate;
				loadCsv('data/rawData_' + selectedDate.getDate()+'.'+(selectedDate.getMonth()+1)+'.'+selectedDate.getFullYear() + '.csv', map, info);
			}
		},
		beforeShowDay: function(date) {
			if (changeDay <= date) {
				return [true, "Highlighted", ''];
			}else {
				return [true, '', ''];
			}
		}
	});
}

function addInfo(map){
	//Displays the number of cases
	const info = L.control();

	info.onAdd = function (map) {
		this._div = L.DomUtil.create('div', 'info');
		this.update();
		return this._div;
	};

	info.update = function (props) {
		this._div.innerHTML = text +  (props ?
			'<b>' + props.name + '</b><br />' + props.value
			: getText2(getLanguage()));
	};

	info.addTo(map);
	return info;
}

function addLegend(map){
	const legend = L.control({position: 'bottomright'});

	legend.onAdd = function (map) {

		let div = L.DomUtil.create('div', 'info legend'),
			grades = [0, 0.71, 7.1],
			colorGrades = [0, 0.72, 7.2],
			labels = [],
			from, to;

		for (let i = 0; i < grades.length; i++) {
			from = grades[i];
			to = grades[i + 1];

			labels.push(
				'<i style="background:' + getColor(colorGrades[i]) + '"></i> ' +
				from + (to ? '&ndash;' + to : '+'));
		}

		div.innerHTML = labels.join('<br>');
		return div;
	};

	legend.addTo(map);
}



//Looks for the most recent datafile and loads it if found
function findFileOpenIfFound(toCheckDate, map, info) {
	const fileName = 'data/rawData_' + toCheckDate.getDate() + '.' + (toCheckDate.getMonth() + 1) + '.' + toCheckDate.getFullYear() + '.csv';
	$.ajax({
		url:fileName,
		type:'HEAD',
		error: function()
		{
			date.setDate(date.getDate() -1);
			findFileOpenIfFound(date, map, info);
		},
		success: function()
		{
			loadedDay = toCheckDate;
			loadCsv(fileName, map, info);
		}
	});
}



//Main Function
//Loads the datafile and uses the data to display the right colors
function loadCsv(file, map, info) {
	Papa.parse(file, {
		download: true,
		dynamicTyping: true,
		header: true,
		complete: function(results) {
			let finalData;
			if (results.data[0]["GKZ"] !== undefined) {
				text = getText3(getLanguage());
				info.update();

				//Change some district names to match the ones in the geo.json
				results.data[0]["Bezirk"] = "Eisenstadt"
				results.data[1]["Bezirk"] = "Rust"
				results.data[19]["Bezirk"] = "Krems an der Donau"
				results.data[20]["Bezirk"] = "Sankt Pölten"
				results.data[21]["Bezirk"] = "Waidhofen an der Ybbs"
				results.data[22]["Bezirk"] = "Wiener Neustadt"
				results.data[31]["Bezirk"] = "Krems (Land)"
				results.data[37]["Bezirk"] = "Sankt Pölten (Land)"
				results.data[41]["Bezirk"] = "Wiener Neustadt (Land)"
				results.data[43]["Bezirk"] = "Linz"
				results.data[44]["Bezirk"] = "Steyr"
				results.data[45]["Bezirk"] = "Wels"
				results.data[61]["Bezirk"] = "Salzburg"
				results.data[67]["Bezirk"] = "Graz"


				results.data.sort((a, b) => a["Bezirk"].localeCompare(b["Bezirk"]));

				const sevenDayData = sevenDayChangeAbsoluteNumbers(results)
				finalData = combiner(sevenDayData, 1, sevenDayData, 0)

			}else if (results.data[0]["Bundesland"] !== undefined) {
				text = getText3(getLanguage());
				info.update();

				const sevenDayData = sevenDayChange(results);
				finalData = combiner(sevenDayData, 1, sevenDayData, 0);
			} else {
				finalData = combiner(sevenDayChange(results), 0.5, oneDayChange(results), 0.5);
				text = getText1(getLanguage());
				info.update();
			}

			for (let i = 0; i < finalData.length; i++) {
				if(bezirke_999_geo["features"][i]["properties"]["name"] === results.data[i]["Bezirk"]){
					bezirke_999_geo["features"][i]["properties"]["value"] = finalData[i];
					const cache = {};
					cache["Bezirk"] = results.data[i]["Bezirk"];
					cache["value"] = finalData[i];

					valueList[i] = cache;
				}else{
					console.log(bezirke_999_geo["features"][i]["properties"]["name"] + " and " + results.data[i]["Bezirk"]);
					bezirke_999_geo["features"][i]["properties"]["value"] = -50000;
				}
				
			}

			map.eachLayer(function (layer) {
				map.removeLayer(layer);
			});

			geojson = L.geoJson(bezirke_999_geo, {
				style: styleGeojson,
				onEachFeature: onEachFeature
			}).addTo(map);

			console.log("Worst municipality on the " + loadedDay.getDate()+'.'+(loadedDay.getMonth()+1)+'.'+loadedDay.getFullYear());
			console.log(maxValueFromList(valueList));
		}
	});
}



//Functions to calculate the value to display
function combiner(data1, weight1, data2, weight2) {
	let resultArray = [];
	if (Number.EPSILON === undefined) {
		Number.EPSILON = Math.pow(2, -52);
	}
	for (let i = 0; i < data1.length; i++) {
		resultArray[i] = Math.round((((data1[i] * weight1 + data2[i] * weight2) * (5/70))+ Number.EPSILON) * 100) / 100;
	}
	return resultArray;
}

function sevenDayChangeAbsoluteNumbers(argument) {
	let resultArray = [];
	let cache;
	for (let i = 0; i < argument.data.length; i++) {
		cache = (100000 / argument.data[i]["AnzEinwohner"]) * argument.data[i]["AnzahlFaelle7Tage"]

		resultArray[i] = (typeof cache || false) === 'string' ? parseFloat(cache.replace(',', '.')) * 2 : cache * 2;
	}
	return resultArray;
}

function sevenDayChange(argument) {
	let resultArray = [];
	let cache;
	for (let i = 0; i < argument.data.length; i++) {
		cache = argument.data[i]["Δ 7 Tage / 100.000 EW"];

		resultArray[i] = (typeof cache || false) === 'string' ? parseFloat(cache.replace(',', '.')) * 2 : cache * 2;
	}
	return resultArray;
}

function oneDayChange(argument) {
	let resultArray = [];
	let cache;
	for (let i = 0; i < argument.data.length; i++) {
		cache = argument.data[i]["Δ Vortag / 100.000 EW"];
		resultArray[i] = (typeof cache || false) === 'string' ? parseFloat(cache.replace(',', '.')) * 14 : cache * 14;
	}
	return resultArray;
}



//Functions to change the style of the Geojson
function styleGeojson(feature) {
    return {
        fillColor: getColor(parseFloat(feature.properties.value)),
        weight: 2,
        opacity: 1,
        color: 'white',
        dashArray: '3',
        fillOpacity: 0.7
    };
}

function getColor(value) {
	return value > 7.142857 ? '#ca0200' :
		value > 0.7142857  ? '#edca00' :
			value > -10000 ? '#5fb56f' :
				'#0000ff';
}



//Adds information on mouseover and the zoom feature
function onEachFeature(feature, layer) {
	layer.on({
		mouseover: highlightFeature,
		mouseout: resetHighlight,
		click: zoomToFeature
	});
}

function highlightFeature(e) {
	const layer = e.target;

	layer.setStyle({
		weight: 5,
		color: '#666',
		dashArray: '',
		fillOpacity: 0.7
	});

	if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
		layer.bringToFront();
	}

	mapAndInfo[1].update(layer.feature.properties);
}

function resetHighlight(e) {
	geojson.resetStyle(e.target);
	mapAndInfo[1].update();
}

function zoomToFeature(e) {
	if(e.target.feature.properties.name === zoomed){
		mapAndInfo[0].setView([latitude, longitude], zoom);
		zoomed = false;
		$(".datePicker").show();
	}else{
		mapAndInfo[0].fitBounds(e.target.getBounds(), {padding: [100,100]});
		zoomed = e.target.feature.properties.name;
		$(".datePicker").hide();
	}
}



//Function to find the municipality with the most Covid cases calculated with the combine function
function maxValueFromList(list) {
	let max;
	for(let i = 0; i < list.length; i++){
		if(max === undefined || max.value < list[i].value){
			max = list[i];
		}
	}
	return max;
}

function getLanguage() {
	let cache = window.location.pathname.split("/");

	if(cache[1] == "") {
		return "de";
	} else {
		return cache[1];
	}
}

function getDayNames(language) {
	switch (language) {
		case "de":
			return ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
		case "en":
		default:
			return ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
	}
}

function getMonthNames(language) {
	switch (language) {
		case "de":
			return ["Jänner", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
		case "en":
		default:
			return ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
	}
}

function getText1(language) {
	switch (language) {
		case "de":
			return "<h4>Täglicher Wochen-/Tages-Mittelwert der Infizierten pro 100.000 Einwohner</h4>";
		case "en":
		default:
			return "<h4>Daily Week-/Day-Average of the infected per 100.000 inhabitants</h4>";
	}
}

function getText2(language) {
	switch (language) {
		case "de":
			return "Bewegen Sie die Maus über einen Bezirk, um den Wert zu sehen. Klicken Sie um heranzuzoomen";
		case "en":
		default:
			return "Move the curser over a district to see the value. Click to zoom.";
	}
}

function getText3(language) {
	switch (language) {
		case "de":
			return "<h4>Mittelwert der Infizierten pro 100.000 Einwohner in den letzten 7 Tagen</h4>";
		case "en":
		default:
			return "<h4>Average of the infected per 100.000 inhabitants of the last 7 days</h4>";
	}
}