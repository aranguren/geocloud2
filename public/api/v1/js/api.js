/*global Ext:false */
/*global $:false */
/*global jQuery:false */
/*global OpenLayers:false */
/*global GeoExt:false */
/*global mygeocloud_ol:false */
/*global schema:false */
/*global document:false */
var mygeocloud_host, popup;
var scriptSource = (function (scripts) {
    'use strict';
    scripts = document.getElementsByTagName('script');
    var script = scripts[scripts.length - 1];
    if (script.getAttribute.length !== undefined) {
        return script.src;
    }
    return script.getAttribute('src', -1);
}());
// In IE7 host name is missing if script url is relative
if (scriptSource.charAt(0) === "/") {
    mygeocloud_host = "";
} else {
    mygeocloud_host = scriptSource.split("/")[0] + "//" + scriptSource.split("/")[2];
}
if (typeof jQuery === "undefined") {
    document.write("<script src='https://ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.min.js'><\/script>");
}
document.write("<script src='" + mygeocloud_host + "/js/openlayers/OpenLayers.js'><\/script>");
document.write("<script src='" + mygeocloud_host + "/js/ext/adapter/ext/ext-base.js'><\/script>");
document.write("<script src='" + mygeocloud_host + "/js/ext/ext-all.js'><\/script>");
document.write("<script src='" + mygeocloud_host + "/js/msg.js'><\/script>");
document.write("<script src='" + mygeocloud_host + "/js/GeoExt/script/GeoExt.js'><\/script>");
var mygeocloud_ol = (function () {
    "use strict";
    var map, host = mygeocloud_host, parentThis = this;
    var geoJsonStore = function (db, config) {
        var prop, parentThis = this;
        var defaults = {
            sql: null,
            onLoad: function () {
            },
            styleMap: null,
            projection: "900913",
            strategies: null,
            visibility: true,
            rendererOptions: {
                zIndexing: true
            },
            lifetime: 0,
            movedEnd: function () {
            },
            selectControl: {},
            clientEncoding: "UTF8"
        };
        if (config) {
            for (prop in config) {
                defaults[prop] = config[prop];
            }
        }
        this.sql = defaults.sql;
        this.onLoad = defaults.onLoad;
        this.movedEnd = defaults.movedEnd;
        // Map member for parent map obj. Set when store is added to a map
        this.map = null;
        // Layer Def
        this.layer = new OpenLayers.Layer.Vector("Vector", {
            styleMap: defaults.styleMap,
            visibility: defaults.visibility,
            renderers: ['Canvas', 'SVG', 'VML'],
            rendererOptions: defaults.rendererOptions
        });
        this.hide = function () {
            this.layer.setVisibility(false);
        };
        this.show = function () {
            this.layer.setVisibility(true);
        };
        this.pointControl = new OpenLayers.Control.DrawFeature(this.layer, OpenLayers.Handler.Point);
        this.lineControl = new OpenLayers.Control.DrawFeature(this.layer, OpenLayers.Handler.Path);
        this.polygonControl = new OpenLayers.Control.DrawFeature(this.layer, OpenLayers.Handler.Polygon);
        this.selectControl = new OpenLayers.Control.SelectFeature(this.layer, defaults.selectControl);
        this.selectControl.handlers.feature.stopDown = false;
        this.modifyControl = new OpenLayers.Control.ModifyFeature(this.layer, {});
        this.geoJSON = {};
        this.featureStore = null;
        this.load = function (doNotShowAlertOnError) {
            var sql = this.sql;
            try {
                var map = parentThis.map;
                sql = sql.replace("{centerX}", map.getCenter().lat.toString());
                sql = sql.replace("{centerY}", map.getCenter().lon.toString());
                sql = sql.replace("{minX}", map.getExtent().left);
                sql = sql.replace("{maxX}", map.getExtent().right);
                sql = sql.replace("{minY}", map.getExtent().bottom);
                sql = sql.replace("{maxY}", map.getExtent().top);
                sql = sql.replace("{bbox}", map.getExtent().toString());
            } catch (e) {
                //console.log(e.message);
            }
            //console.log(sql);
            $.ajax({
                dataType: 'jsonp',
                data: 'q=' + encodeURIComponent(sql) + '&srs=' + defaults.projection + '&lifetime=' + defaults.lifetime + '&client_encoding=' + defaults.clientEncoding,
                jsonp: 'jsonp_callback',
                url: host + '/api/v1/sql/' + db,
                success: function (response) {
                    if (response.success === false && doNotShowAlertOnError === undefined) {
                        alert(response.message);
                    }
                    if (response.success === true) {
                        parentThis.geoJSON = response;
                        parentThis.layer.addFeatures(new OpenLayers.Format.GeoJSON().read(response));
                        parentThis.featureStore = new GeoExt.data.FeatureStore({
                            fields: response.forStore,
                            layer: parentThis.layer
                        });
                    }
                },
                complete: function () {
                    parentThis.onLoad();
                }
            });
        };
        this.reset = function () {
            this.layer.destroyFeatures();
        };
        this.getWKT = function () {
            return new OpenLayers.Format.WKT().write(this.layer.features);
        };
    };
    map = function (el, db, config) {
        var prop, // baseLayer wrapper
            parentMap, defaults = {
                numZoomLevels: 20,
                projection: "EPSG:900913",
                maxExtent: new OpenLayers.Bounds(-20037508.34, -20037508.34, 20037508.34, 20037508.34),
                controls: [
                    //new OpenLayers.Control.Navigation(),
                    //new OpenLayers.Control.PanZoomBar(),
                    //new OpenLayers.Control.LayerSwitcher(),
                    //new OpenLayers.Control.PanZoom(),
                    new OpenLayers.Control.Zoom(),
                    new OpenLayers.Control.TouchNavigation({
                        dragPanOptions: {enableKinetic: true}
                    })]
            };
        if (config) {
            for (prop in config) {
                defaults[prop] = config[prop];
            }
        }
        parentMap = this;
        this.bingApiKey = null;
        this.layerStr = "";
        this.db = db;
        this.geoLocation = {
            x: null,
            y: null,
            obj: {}
        };
        this.zoomToExtent = function (extent, closest) {
            if (!extent) {
                this.map.zoomToExtent(this.map.maxExtent);
            } else {
                this.map.zoomToExtent(new OpenLayers.Bounds(extent), closest);
            }
        };
        this.zoomToExtentOfgeoJsonStore = function (store) {
            this.map.zoomToExtent(store.layer.getDataExtent());
        };
        this.getVisibleLayers = function () {
            var layerArr = [];
            //console.log(this.map.layers);
            for (var i = 0; i < this.map.layers.length; i++) {
                if (this.map.layers[i].isBaseLayer === false && this.map.layers[i].visibility === true && this.map.layers[i].CLASS_NAME === "OpenLayers.Layer.WMS") {
                    layerArr.push(this.map.layers[i].params.LAYERS);
                }
            }
            return layerArr.join(";");
        };
        this.getZoom = function () {
            return this.map.getZoom();
        };
        this.getPixelCoord = function (x, y) {
            var p = {};
            p.x = this.map.getPixelFromLonLat(new OpenLayers.LonLat(x, y)).x;
            p.y = this.map.getPixelFromLonLat(new OpenLayers.LonLat(x, y)).y;
            return p;
        };
        this.zoomToPoint = function (x, y, z) {
            this.map.setCenter(new OpenLayers.LonLat(x, y), z);
        };
        this.clickController = OpenLayers.Class(OpenLayers.Control, {
            defaultHandlerOptions: {
                'single': true,
                'double': false,
                'pixelTolerance': 0,
                'stopSingle': false,
                'stopDouble': false
            },
            initialize: function (options) {
                this.handlerOptions = OpenLayers.Util.extend({}, this.defaultHandlerOptions);
                OpenLayers.Control.prototype.initialize.apply(this, arguments);
                this.handler = new OpenLayers.Handler.Click(this, {
                    'click': this.trigger
                }, this.handlerOptions);
            },
            trigger: function (e) {
                var coords = this.map.getLonLatFromViewPortPx(e.xy);
                try {
                    popup.destroy();
                } catch (e) {
                }
                var mapBounds = this.map.getExtent();
                var boundsArr = mapBounds.toArray();
                var boundsStr = boundsArr.join(",");
                var mapSize = this.map.getSize();
                var popupTemplate = '<div style="position:relative;"><div></div><div id="queryResult" style="display: table"></div><button onclick="popup.destroy()" style="position:absolute; top: -10px; right: 5px" type="button" class="close" aria-hidden="true">&times;</button></div>';
                var anchor = new OpenLayers.LonLat(coords.lon, coords.lat);
                popup = new OpenLayers.Popup.Anchored("result", anchor, new OpenLayers.Size(100, 150), popupTemplate, null, false, null);
                popup.panMapIfOutOfView = true;
                $.ajax({
                    dataType: 'jsonp',
                    data: 'proj=900913&lon=' + coords.lon + '&lat=' + coords.lat + '&layers=' + parentMap.getVisibleLayers() + '&extent=' + boundsStr + '&width=' + mapSize.w + '&height=' + mapSize.h,
                    jsonp: 'jsonp_callback',
                    url: mygeocloud_host + '/apps/viewer/servers/query/' + db,
                    success: function (response) {
                        //waitPopup.destroy();

                        if (response.html !== false && response.html !== "") {
                            // Dirty hack! We have to add the popup measure the width, destroy it and add it again width the right width.
                            parentMap.map.addPopup(popup);
                            $("#queryResult").html(response.html);
                            var width = $("#queryResult").width() + 35;
                            popup.destroy();
                            popup = new OpenLayers.Popup.Anchored("result", anchor, new OpenLayers.Size(width, 150), popupTemplate, null, false, null);
                            parentMap.map.addPopup(popup);
                            $("#queryResult").html(response.html);
                            //popup.relativePosition="tr";
                            vectors.removeAllFeatures();
                            parentMap.map.raiseLayer(vectors, 10);
                            for (var i = 0; i < response.renderGeometryArray.length; ++i) {
                                vectors.addFeatures(deserialize(response.renderGeometryArray[i][0]));
                            }
                        } else {
                            $("#alert").fadeIn(400).delay(1000).fadeOut(400);
                            vectors.removeAllFeatures();
                        }
                    }
                });
            }
        });
        this.map = new OpenLayers.Map(el, {
            controls: defaults.controls,
            numZoomLevels: defaults.numZoomLevels,
            projection: defaults.projection,
            maxResolution: defaults.maxResolution,
            minResolution: defaults.minResolution,
            maxExtent: defaults.maxExtent
        });
        var _map = this.map;
        this.click = new this.clickController();
        this.map.addControl(this.click);
        var vectors = new OpenLayers.Layer.Vector("Mark", {
            displayInLayerSwitcher: false
        });
        this.map.addLayers([vectors]);
        this.addMapQuestOSM = function () {
            this.mapQuestOSM = new OpenLayers.Layer.OSM("MapQuest-OSM", ["http://otile1.mqcdn.com/tiles/1.0.0/osm/${z}/${x}/${y}.jpg", "http://otile2.mqcdn.com/tiles/1.0.0/osm/${z}/${x}/${y}.jpg", "http://otile3.mqcdn.com/tiles/1.0.0/osm/${z}/${x}/${y}.jpg", "http://otile4.mqcdn.com/tiles/1.0.0/osm/${z}/${x}/${y}.jpg"]);
            //this.mapQuestOSM.wrapDateLine = false;
            this.map.addLayer(this.mapQuestOSM);
            return (this.mapQuestOSM);
        };
        this.addMapQuestAerial = function () {
            this.mapQuestAerial = new OpenLayers.Layer.OSM("MapQuest Open Aerial Tiles", ["http://oatile1.mqcdn.com/tiles/1.0.0/sat/${z}/${x}/${y}.jpg", "http://oatile2.mqcdn.com/tiles/1.0.0/sat/${z}/${x}/${y}.jpg", "http://oatile3.mqcdn.com/tiles/1.0.0/sat/${z}/${x}/${y}.jpg", "http://oatile4.mqcdn.com/tiles/1.0.0/sat/${z}/${x}/${y}.jpg"]);
            this.mapQuestAerial.wrapDateLine = true;
            this.map.addLayer(this.mapQuestAerial);
            return (this.mapQuestAerial);
        };
        this.addOSM = function () {
            this.osm = new OpenLayers.Layer.OSM("OSM");
            this.osm.wrapDateLine = true;
            this.map.addLayer(this.osm);
            return (this.osm);
        };
        this.addGoogleStreets = function () {
            // v2
            try {
                this.baseGNORMAL = new OpenLayers.Layer.Google("Google Streets", {
                    type: G_NORMAL_MAP,
                    sphericalMercator: true,
                    wrapDateLine: true,
                    numZoomLevels: 20
                });

            } catch (e) {
            }
            // v3
            try {
                this.baseGNORMAL = new OpenLayers.Layer.Google("Google Streets", {// the default
                    wrapDateLine: true,
                    numZoomLevels: 20
                });
            } catch (e) {
            }
            this.map.addLayer(this.baseGNORMAL);
            return (this.baseGNORMAL);
        };
        this.addGoogleHybrid = function () {
            // v2
            try {
                this.baseGHYBRID = new OpenLayers.Layer.Google("Google Hybrid", {
                    type: G_HYBRID_MAP,
                    sphericalMercator: true,
                    wrapDateLine: true,
                    numZoomLevels: 20
                });
            } catch (e) {
            }
            // v3
            try {
                this.baseGHYBRID = new OpenLayers.Layer.Google("Google Hybrid", {
                    type: google.maps.MapTypeId.HYBRID,
                    wrapDateLine: true,
                    numZoomLevels: 20
                });
            } catch (e) {
                alert(e.message)
            }
            this.map.addLayer(this.baseGHYBRID);
            return (this.baseGHYBRID);
        };
        this.addGoogleSatellite = function () {
            // v3
            try {
                this.baseGSATELLITE = new OpenLayers.Layer.Google("Google Satellite", {
                    type: google.maps.MapTypeId.SATELLITE,
                    wrapDateLine: true,
                    numZoomLevels: 20
                });
            } catch (e) {
                alert(e.message)
            }
            this.map.addLayer(this.baseGSATELLITE);
            return (this.baseGSATELLITE);
        };
        this.addGoogleTerrain = function () {
            // v3
            try {
                this.baseGTERRAIN = new OpenLayers.Layer.Google("Google Terrain", {
                    type: google.maps.MapTypeId.TERRAIN,
                    wrapDateLine: true,
                    numZoomLevels: 20
                });
            } catch (e) {
                alert(e.message)
            }
            this.map.addLayer(this.baseGTERRAIN);
            return (this.baseGTERRAIN);
        };
        this.addBing = function (type) {
            var l, name;
            switch (type) {
                case "Road":
                    name = "Bing Road";
                    break;
                case "Aerial":
                    name = "Bing Aerial";
                    break;
                case "AerialWithLabels":
                    name = "Bing Aerial With Labels";
                    break;
            }
            l = new OpenLayers.Layer.Bing({
                name: name,
                wrapDateLine: true,
                key: this.bingApiKey,
                type: type
            });
            this.map.addLayer(l);
            l.setVisibility(false);
            l.baseLayer = true;
            l.id = name;
            return (l);
        };
        this.addStamenToner = function () {
            this.stamenToner = new OpenLayers.Layer.Stamen("toner");
            this.stamenToner.name = "Stamen Toner";
            this.stamenToner.wrapDateLine = true;
            this.map.addLayer(this.stamenToner);
            return (this.stamenToner);
        };
        this.addYandex = function () {
            //this.yandexMaps = new OpenLayers.Layer.Yandex("Яndex", {sphericalMercator: true});
            //this.map.addLayer(this.yandexMaps);
            //return (this.yandexMaps);
        };
        this.addDtkSkaermkort = function () {
            var l, name = "dtkskaermkort", layer = "dtk_skaermkort",
                url = "http://eu1.mapcentia.com/wms/dk/tilecache";
            l = new OpenLayers.Layer.WMS(name, url, {
                layers: layer
            }, {wrapDateLine: true});
            this.map.addLayer(l);
            l.setVisibility(false);
            l.baseLayer = true;
            l.id = name;
            return (l);
        };
        this.setBaseLayer = function (baseLayer) {
            this.map.setBaseLayer(baseLayer);
        };
        this.addBaseLayer = function (l) {
            var o;
            switch (l) {
                case "osm":
                    o = this.addOSM();
                    break;
                case "mapQuestOSM":
                    o = this.addMapQuestOSM();
                    break;
                case "mapBoxNaturalEarth":
                    o = this.addMapBoxNaturalEarth();
                    break;
                case "stamenToner":
                    o = this.addStamenToner();
                    break;
                case "googleStreets":
                    o = this.addGoogleStreets();
                    break;
                case "googleHybrid":
                    o = this.addGoogleHybrid();
                    break;
                case "googleSatellite":
                    o = this.addGoogleSatellite();
                    break;
                case "googleTerrain":
                    o = this.addGoogleTerrain();
                    break;
                case "bingRoad":
                    o = this.addBing("Road");
                    break;
                case "bingAerial":
                    o = this.addBing("Aerial");
                    break;
                case "bingAerialWithLabels":
                    o = this.addBing("AerialWithLabels");
                    break;
                case "yandex":
                    o = this.addYandex();
                    break;
                case "dtkSkaermkort":
                    o = this.addDtkSkaermkort();
                    break;
            }
            return o;
        };
        this.addTileLayers = function (layers, config) {
            var defaults = {
                singleTile: false,
                opacity: 1,
                isBaseLayer: false,
                visibility: true,
                wrapDateLine: true,
                tileCached: true,
                displayInLayerSwitcher: true,
                name: null
            };
            if (config) {
                for (prop in config) {
                    defaults[prop] = config[prop];
                }
            }
            ;
            var layersArr = [];
            for (var i = 0; i < layers.length; i++) {
                var l = this.createTileLayer(layers[i], defaults)
                this.map.addLayer(l);
                layersArr.push(l);
            }
            return layersArr;
        };
        this.createTileLayer = function (layer, defaults) {
            var parts = layer.split(".");
            if (!defaults.tileCached) {
                var url = host + "/wms/" + this.db + "/" + parts[0] + "?";
            } else {
                var url = host + "/wms/" + this.db + "/tilecache?";
            }
            var l = new OpenLayers.Layer.WMS(defaults.name, url, {
                layers: layer,
                transparent: true
            }, defaults);
            l.id = layer;
            return l;
        };
        this.addTileLayerGroup = function (layers, config) {
            var defaults = {
                singleTile: false,
                opacity: 1,
                isBaseLayer: false,
                visibility: true,
                //wrapDateLine : false,
                name: null,
                schema: null
            };
            if (config) {
                for (prop in config) {
                    defaults[prop] = config[prop];
                }
            }
            this.map.addLayer(this.createTileLayerGroup(layers, defaults));
        };
        this.createTileLayerGroup = function (layers, defaults) {
            var l = new OpenLayers.Layer.WMS(defaults.name, host + "/wms/" + this.db + "/" + defaults.schema + "/?", {
                layers: layers,
                transparent: true
            }, defaults);
            return l;
        };
        this.addWmtsLayer = function (layerConfig) {
            var layer = null;

            layerConfig.options.tileSize = new OpenLayers.Size(256, 256);
            layerConfig.options.tileOrigin = new OpenLayers.LonLat(this.map.maxExtent.left, this.map.maxExtent.top);
            layerConfig.options.tileFullExtent = this.map.maxExtent.clone();
            for (var opts in layerConfig.options) {
                layerConfig[opts] = layerConfig.options[opts];
            }
            for (var par in layerConfig.params) {
                layerConfig[par] = layerConfig.params[par];
            }
            if (layerConfig["matrixIds"] != null) {
                if (layerConfig["matrixIds"].indexOf(',') > 0) {
                    layerConfig["matrixIds"] = layerConfig["matrixIds"].split(',');
                }
            }

            layer = new OpenLayers.Layer.WMTS(layerConfig);

            this.map.addLayer(layer);
            return layer;
        };
        this.removeTileLayerByName = function (name) {
            var arr = this.map.getLayersByName(name);
            this.map.removeLayer(arr[0]);
        };
        this.addGeoJsonStore = function (store) {
            store.map = this.map;
            // set the parent map obj
            this.map.addLayers([store.layer]);
            this.map.addControl(store.pointControl);
            this.map.addControl(store.lineControl);
            this.map.addControl(store.polygonControl);
            this.map.addControl(store.selectControl);
            this.map.addControl(store.modifyControl);
            this.map.events.register("moveend", null, store.movedEnd);

        };
        this.addControl = function (control) {
            this.map.addControl(control);
            try {
                control.handlers.feature.stopDown = false;
            } catch (e) {
            }
            control.activate();
            return control;
        };
        this.removeGeoJsonStore = function (store) {
            this.map.removeLayer(store.layer);
            //??????????????
        };
        this.hideLayer = function (name) {
            this.map.getLayersByName(name)[0].setVisibility(false);

        };
        this.showLayer = function (name) {
            this.map.getLayersByName(name)[0].setVisibility(true);
        };
        //this.addGoogleStreets();
        this.getCenter = function () {
            var point = this.map.center;
            return {
                x: point.lon,
                y: point.lat
            };
        };
        this.getExtent = function () {
            var mapBounds = this.map.getExtent();
            return mapBounds.toArray();
        };
        this.getBbox = function () {
            return this.map.getExtent().toString();
        };
        // Geolocation stuff starts here
        var geolocation_layer = new OpenLayers.Layer.Vector('geolocation_layer', {
            displayInLayerSwitcher: false
        });
        var firstGeolocation = true;
        var style = {
            fillColor: '#000',
            fillOpacity: 0.1,
            strokeWidth: 0
        };
        this.map.addLayers([geolocation_layer]);
        var firstCallBack;
        var trackCallBack;
        this.locate = function (config) {
            var defaults = {
                firstCallBack: function () {
                },
                trackCallBack: function () {
                }
            };
            if (config) {
                for (prop in config) {
                    defaults[prop] = config[prop];
                }
            }
            firstCallBack = defaults.firstCallBack;
            trackCallBack = defaults.trackCallBack;
            geolocation_layer.removeAllFeatures();
            geolocate.deactivate();
            //$('track').checked = false;
            geolocate.watch = true;
            firstGeolocation = true;
            geolocate.activate();
        };
        this.stopLocate = function () {
            geolocate.deactivate();
        };
        var geolocate = new OpenLayers.Control.Geolocate({
            bind: false,
            geolocationOptions: {
                enableHighAccuracy: false,
                maximumAge: 0,
                timeout: 7000
            }
        });
        this.map.addControl(geolocate);
        geolocate.events.register("locationupdated", geolocate, function (e) {
            geolocation_layer.removeAllFeatures();
            var circle = new OpenLayers.Feature.Vector(OpenLayers.Geometry.Polygon.createRegularPolygon(new OpenLayers.Geometry.Point(e.point.x, e.point.y), e.position.coords.accuracy / 2, 40, 0), {}, style);
            geolocation_layer.addFeatures([new OpenLayers.Feature.Vector(e.point, {}, {
                graphicName: 'cross',
                strokeColor: '#f00',
                strokeWidth: 1,
                fillOpacity: 0,
                pointRadius: 10
            }), circle]);
            parentMap.geoLocation = {
                x: e.point.x,
                y: e.point.y,
                obj: e
            };
            if (firstGeolocation) {
                this.map.zoomToExtent(geolocation_layer.getDataExtent());
                pulsate(circle);
                firstGeolocation = false;
                this.bind = true;
                firstCallBack();
            } else {
                trackCallBack();
            }

        });
        geolocate.events.register("locationfailed", this, function () {
            alert("No location");
        });
        var pulsate = function (feature) {
            var point = feature.geometry.getCentroid(), bounds = feature.geometry.getBounds(), radius = Math.abs((bounds.right - bounds.left) / 2), count = 0, grow = 'up';

            var resize = function () {
                if (count > 16) {
                    clearInterval(window.resizeInterval);
                }
                var interval = radius * 0.03;
                var ratio = interval / radius;
                switch (count) {
                    case 4:
                    case 12:
                        grow = 'down';
                        break;
                    case 8:
                        grow = 'up';
                        break;
                }
                if (grow !== 'up') {
                    ratio = -Math.abs(ratio);
                }
                feature.geometry.resize(1 + ratio, point);
                geolocation_layer.drawFeature(feature);
                count++;
            };
            window.resizeInterval = window.setInterval(resize, 50, point, radius);
        };
    };
    var deserialize = function (element) {
        // console.log(element);
        var type = "wkt";
        var format = new OpenLayers.Format.WKT;
        var features = format.read(element);
        return features;
    };
    var grid = function (el, store, config) {
        var prop;
        var defaults = {
            height: 300,
            selectControl: {
                onSelect: function (feature) {
                },
                onUnselect: function () {
                }
            },
            columns: store.geoJSON.forGrid
        };
        if (config) {
            for (prop in config) {
                defaults[prop] = config[prop];
            }
        }
        this.grid = new Ext.grid.GridPanel({
            id: "gridpanel",
            viewConfig: {
                forceFit: true
            },
            store: store.featureStore, // layer
            sm: new GeoExt.grid.FeatureSelectionModel({// Only when there is a map
                singleSelect: false,
                selectControl: defaults.selectControl
            }),
            cm: new Ext.grid.ColumnModel({
                defaults: {
                    sortable: true,
                    editor: {
                        xtype: "textfield"
                    }
                },
                columns: defaults.columns
            }),
            listeners: defaults.listeners
        });
        this.panel = new Ext.Panel({
            renderTo: el,
            split: true,
            frame: false,
            border: false,
            layout: 'fit',
            collapsible: false,
            collapsed: false,
            height: defaults.height,
            items: [this.grid]
        });
        this.grid.getSelectionModel().bind().handlers.feature.stopDown = false;
        this.selectionModel = this.grid.getSelectionModel().bind();
    };
    return {
        geoJsonStore: geoJsonStore,
        map: map,
        grid: grid,
        urlVars: (function getUrlVars() {
            var mapvars = {};
            var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function (m, key, value) {
                mapvars[key] = value;
            });
            return mapvars;
        })(),
        pathName: window.location.pathname.split("/")
    };

})
    ();
