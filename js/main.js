var loadedDay;
var geojson; 
var valueList = {};
var text;

var firstRecordedDay = new Date("09/14/2020");
var changeDay = new Date("10/06/2020");
var dateCache = new Date("09/14/2020");
var date = new Date();
date.setDate(date.getDate() -1);
findFileOpenIfFound(date);


var latitude = 47.5573696
var longitude = 13.8831908
var zoom = 7

var map = L.map('map', { zoomControl: false }).setView([latitude, longitude], zoom);
var zoomed = false;

//DatePicker
var datePickerWidget =  L.Control.extend({
	options: {
		position: 'topleft'
	},

	onAdd: function (map) {
		this._div = L.DomUtil.create('div', 'datePicker');
		return this._div;
	}
});
map.addControl(new datePickerWidget());


// control that shows state info on hover
var info = L.control();

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

map.dragging.disable();
map.touchZoom.disable();
map.doubleClickZoom.disable();
map.scrollWheelZoom.disable();
map.boxZoom.disable();
map.keyboard.disable();
if (map.tap) map.tap.disable();
document.getElementById('map').style.cursor='default';

function loadCsv(file) {
	Papa.parse(file, {
		download: true,
		dynamicTyping: true,
		header: true,
		complete: function(results) {
			map.eachLayer(function (layer) {
				map.removeLayer(layer);
			});

			if(results.data[0]["Bundesland"] != undefined){
				text = text3;
				info.update();

				var sevenDayData = sevenDayChange(results);
				finalData = fuser(sevenDayData, 1, sevenDayData, 0);
			}else{
				finalData = fuser(sevenDayChange(results), 0.5, oneDayChange(results), 0.5);
				text = text1;
				info.update();
			}

			valueList.length = 0;

			for (var i = 0; i < finalData.length; i++) {
				if(bezirke_999_geo["features"][i]["properties"]["name"] === results.data[i]["Bezirk"]){
					bezirke_999_geo["features"][i]["properties"]["value"] = finalData[i];
					var cache = {};
					cache["Bezirk"] = results.data[i]["Bezirk"];
					cache["value"] = finalData[i];
					valueList[i] = cache;
					valueList.length == undefined ? valueList.length = 1 : valueList.length++;

				}else{
					console.log(bezirke_999_geo["features"][i]["properties"]["name"] + " and " + results.data[i]["Bezirk"]);
					bezirke_999_geo["features"][i]["properties"]["value"] = -50000;
				}
				
			}

			geojson = L.geoJson(bezirke_999_geo, {
				style: styleGeojson,
				onEachFeature: onEachFeature
			}).addTo(map);

			map.attributionControl.addAttribution('Map Data &copy; <a href="https://github.com/ginseng666/GeoJSON-TopoJSON-Austria/">Flooh Perlot</a>' + ' ,  Infection Data ©; <a href="https://orf.at/corona/daten/bezirke">ORF.at</a>');
			$( ".datePicker" ).datepicker({
				minDate: firstRecordedDay,
				maxDate: date,
				onSelect: function(dateText) {
					var selectedDate = new Date(dateText);
					if(loadedDay.getTime() !== selectedDate.getTime()){
						loadCsv('data/rawData_' + selectedDate.getDate()+'.'+(selectedDate.getMonth()+1)+'.'+selectedDate.getFullYear() + '.csv')
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
	});
}

function getColor(value) {
	return value > 7.142857 ? '#ca0200' :
           value > 0.7142857  ? '#edca00' :
           value > -10000 ? '#5fb56f' :
                      '#0000ff';}

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

function highlightFeature(e) {
	var layer = e.target;

	layer.setStyle({
		weight: 5,
		color: '#666',
		dashArray: '',
		fillOpacity: 0.7
	});

	if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
		layer.bringToFront();
	}

	info.update(layer.feature.properties);
}

function resetHighlight(e) {
	geojson.resetStyle(e.target);
	info.update();
}

function onEachFeature(feature, layer) {
	layer.on({
		mouseover: highlightFeature,
		mouseout: resetHighlight,
		click: zoomToFeature
	});
}

function zoomToFeature(e) {
	if(e.target.feature.properties.name === zoomed){
		map.setView([latitude, longitude], zoom);
		zoomed = false;
		$(".datePicker").show();
	}else{
		map.fitBounds(e.target.getBounds(), {padding: [100,100]});
		zoomed = e.target.feature.properties.name;
		$(".datePicker").hide();
	}
}

var legend = L.control({position: 'bottomright'});

legend.onAdd = function (map) {

	var div = L.DomUtil.create('div', 'info legend'),
		grades = [0, 0.71, 7.1],
		colorGrades = [0, 0.72, 7.2],
		labels = [],
		from, to;

	for (var i = 0; i < grades.length; i++) {
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







function fuser(data1, weight1, data2, weight2) {
	let resultArray = [];
	if (Number.EPSILON === undefined) {
    	Number.EPSILON = Math.pow(2, -52);
	}
	for (var i = 0; i < data1.length; i++) {
		resultArray[i] = Math.round((((data1[i] * weight1 + data2[i] * weight2) * (5/70))+ Number.EPSILON) * 100) / 100;
	}
	return resultArray;
}

function sevenDayChange(argument) {
	let resultArray = [];
	for (var i = 0; i < argument.data.length; i++){
		cache = argument.data[i]["Δ 7 Tage / 100.000 EW"];

		resultArray[i] = (typeof cache || false) === 'string' ? parseFloat(cache.replace(',','.')) * 2 : cache * 2;
	}
	return resultArray;
}

function oneDayChange(argument) {
	let resultArray = [];
	for (var i = 0; i < argument.data.length; i++){
		cache = argument.data[i]["Δ Vortag / 100.000 EW"];
		resultArray[i] = (typeof cache || false) === 'string' ? parseFloat(cache.replace(',','.')) * 14 : cache * 14;
	}
	return resultArray;
}

function findFileOpenIfFound(toCheckDate) {
	var fileName = 'data/rawData_' + toCheckDate.getDate()+'.'+(toCheckDate.getMonth()+1)+'.'+toCheckDate.getFullYear() + '.csv';
	$.ajax({
	    url:fileName,
	    type:'HEAD',
	    error: function()
	    {
	        date.setDate(date.getDate() -1);
	        findFileOpenIfFound(date);
	    },
	    success: function()
	    {
	    	loadedDay = date;
	        loadCsv(fileName);
	    }
	});	
}

function maxValueFromList(list) {
	var max;
	for(var i = 0; i < list.length; i++){
		if(max == undefined || max.value < list[i].value){
			max = list[i];
		}
	}
	return max;
}
