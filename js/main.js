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
	map.attributionControl.addAttribution('Map Data &copy; <a href="https://github.com/ginseng666/GeoJSON-TopoJSON-Austria/">Flooh Perlot</a>' + ' ,  Infection Data &copy; <a href="https://orf.at/corona/daten/bezirke">ORF.at</a>' +
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

	$( ".datePicker" ).datepicker({
		minDate: firstRecordedDay,
		maxDate: date,
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
			: text2);
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
			if (results.data[0]["Bundesland"] !== undefined) {
				text = text3;
				info.update();

				const sevenDayData = sevenDayChange(results);
				finalData = combiner(sevenDayData, 1, sevenDayData, 0);
			} else {
				finalData = combiner(sevenDayChange(results), 0.5, oneDayChange(results), 0.5);
				text = text1;
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
