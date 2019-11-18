import React from 'react';
import ReactDOM from 'react-dom';
import mapboxgl from 'mapbox-gl';
import { Responsive, Checkbox, Header, Segment, Statistic, Tab, Button, Loader, Icon, Menu, List } from "semantic-ui-react";
import { BrowserRouter as Router, Route, Link, Switch, Redirect, withRouter } from "react-router-dom";
import { Helmet } from "react-helmet";
import { debounce, filter } from 'lodash';
import * as Cookies from 'es-cookie';

import Legend from './legend.jsx';
import TrainList from './trainList.jsx';
import TrainDetails from './trainDetails.jsx';
import StationList from './stationList.jsx';
import StationDetails from './stationDetails.jsx';

import stationData from '../data/station_details.json';
import transfers from '../data/transfers.json';

const apiUrl = 'https://www.goodservice.io/api/routes';
const statusUrl = 'https://www.goodservice.io/api/info'
const arrivalsUrl = 'https://www.goodservice.io/api/arrivals';
const stations = {};
const stationLocations = {};
const center = [-74.003683, 40.7079445]
const defaultBounds = [
  [-74.251961, 40.512764],
  [-73.755405, 40.903125]
]
const trainIds = [
  '2', '3', '1', '4', '5', '6', '6X', '7', '7X', 'A', 'C', 'E', 'F', 'FX',
  'D', 'B', 'M', 'J', 'Z', 'R', 'N', 'Q', 'W', 'G', 'H', 'FS', 'GS', "L", "SI"
];
const prioritizedStations = new Set(['101', '201', '501', '401', 'D01', '601', '213', '608', '112', '116', 'A02',
  'A09', 'R16', '726', 'Q05', 'R01', '701', 'G14', 'G22', 'F01', 'G05', '418', 'L10', 'M01', 'L22', 'L29', 'A65',
  'H15', 'H11', '257', '250', '247', 'R36', 'R41', 'R45', 'D43', 'S31', 'S19', 'A55']);

const majorStations = new Set(['G29', 'L03', '635', 'R20', 'R23', 'Q01', 'F15', 'M18', 'A31', 'A32', 'D20', 'A41', 'A42', 'R29',
  'R31', 'D24', '235', '120', 'R11', 'B08', '621', '631', '640', 'R15', '725', 'R16', '127', 'A27', 'A28', '128', '132',
  'R17', 'D17', 'F23', 'F35', 'G08', '420', '712', '718', 'R09', '723', 'J27', 'L22', 'A51', 'M16', 'M11', 'M08', 'L17']);

const statusColors = {
  'long-headway': '#ff934b',
  'slow': '#fbfb08',
  'delay': '#ff8093'
}

mapboxgl.accessToken = process.env.MAPBOX_TOKEN;

class Mapbox extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      trains: [],
      arrivals: {},
      routing: {},
      displayProblems: false,
      displayDelays: false,
      displaySlowSpeeds: false,
      displayLongHeadways: false,
      processedRoutings: [],
      routeStops: {},
      offsets: {}
    };
    Object.keys(stationData).forEach((key) => {
      stations[key] = stationData[key];
      stations[key]["id"] = key;
      stations[key]["northStops"] = new Set();
      stations[key]["southStops"] = new Set();
      stations[key]["passed"] = new Set();
      stations[key]["stops"] = new Set();
      stations[key]["transfers"] = new Set();
      stationLocations[`${stationData[key].longitude}-${stationData[key].latitude}`] = key
    });
    transfers.forEach((transfer) => {
      if (stations[transfer['from']]) {
        stations[transfer['from']]["transfers"].add(transfer['to']);
      }
    });
    this.showAll = false;
    this.checksum = null;
    this.calculatedPaths = {};
    this.props.history.listen((location) => {
      gtag('config', 'UA-127585516-1', {'page_path': location.pathname});
    });
    this.selectedTrains = trainIds;
    this.selectedStations = [];
  }
  
  componentDidMount() {
    this.map = new mapboxgl.Map({
      container: this.mapContainer,
      style: 'mapbox://styles/theweekendest/ck1fhati848311cp6ezdzj5cm?optimize=true',
      center: center,
      bearing: 29,
      minZoom: 9,
      zoom: 10,
      hash: false,
      maxBounds: [
        [-74.8113, 40.2797],
        [-73.3584, 41.0247]
      ]
    });

    this.map.addControl(new mapboxgl.NavigationControl(), "bottom-right");
    this.map.addControl(new mapboxgl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true
      },
      trackUserLocation: true
    }), 'bottom-right');

    this.map.on('load', () => {
      this.fetchRoutes();
      this.fetchData();
      this.routeTimer = setInterval(() => this.fetchRoutes(), 120000);
      this.dataTimer = setInterval(() => this.fetchData(), 60000);
    });

    this.map.fitBounds(defaultBounds, {
      bearing: 29,
      padding: 100
    });
  }

  fetchRoutes() {
    fetch(apiUrl)
      .then(response => response.json())
      .then(data => {
        if (this.checksum !== data.checksum) {
          this.setState({routing: data.routes, stops: data.stops}, this.processRoutings);
        }
        this.checksum = data.checksum;
      })
  }

  fetchData() {
    fetch(statusUrl)
      .then(response => response.json())
      .then(data => this.setState({ trains: data.routes, timestamp: data.timestamp }, this.renderOverlays));

    fetch(arrivalsUrl)
      .then(response => response.json())
      .then(data => this.setState({ arrivals: data.routes }));
  }

  processRoutings() {
    const { routing } = this.state;
    Object.keys(stationData).forEach((key) => {
      stations[key] = stationData[key];
      stations[key]["northStops"] = new Set();
      stations[key]["southStops"] = new Set();
      stations[key]["passed"] = new Set();
      stations[key]["stops"] = new Set();
    });

    const processedRoutings = [];
    const routeStops = {};

    Object.keys(routing).forEach((key) => {
      const northStops = new Set();
      const southStops = new Set();
      const route = routing[key];
      routeStops[key] = new Set();
      const northRoutings = route.routings.north.filter((r) => {
        return r.every((stopId) => {
          return stopId.substr(3, 1) == 'N';
        })
      }).map((r) => {
        return r.map((stopId) => {
          const stopIdPrefix = stopId.substr(0, 3);
          if (stations[stopIdPrefix]) {
            stations[stopIdPrefix].northStops.add(key);
            stations[stopIdPrefix].stops.add(key);
            routeStops[key].add(stopIdPrefix);
            northStops.add(stopIdPrefix);
          }
          return stopIdPrefix;
        }).filter((stopId) => {
          return stations[stopId];
        });
      });
      const southRoutings = route.routings.south.filter((r) => {
        return r.every((stopId) => {
          return stopId.substr(3, 1) == 'S';
        })
      }).map((r) => {
        return r.map((stopId) => {
          const stopIdPrefix = stopId.substr(0, 3);
          if (stations[stopIdPrefix]) {
            stations[stopIdPrefix].southStops.add(key);
            stations[stopIdPrefix].stops.add(key);
            routeStops[key].add(stopIdPrefix);
            southStops.add(stopIdPrefix);
          }
          return stopIdPrefix;
        }).filter((stopId) => {
          return stations[stopId];
        }).reverse();
      });
      const allRoutings = northRoutings.concat(southRoutings);
      processedRoutings[key] = Array.from(new Set(allRoutings.map(JSON.stringify)), JSON.parse);
    });
    this.setState({processedRoutings: processedRoutings, routeStops: routeStops}, this.calculateOffsets);
  }

  calculateOffsets() {
    const { routeStops } = this.state;
    const offsets = {};
    const results = {};
    const offsetsMap = [0, -2, 2, -4, 4, -6, 6];

    trainIds.forEach((train) => {
      let offset = 0;
      let conflictingOffsets = new Set();
      const stops = routeStops[train];

      if (!stops) {
        return;
      }

      stops.forEach((stop) => {
        stations[stop]["stops"].forEach((route) => {
          if (offsets[route] != undefined) {
            conflictingOffsets.add(offsets[route]);
          }
        });
      });

      while(conflictingOffsets.has(offset)) {
        offset++;
      }

      offsets[train] = offset;
    });

    Object.keys(offsets).forEach((key) => {
      results[key] = offsetsMap[offsets[key]];
    });
    this.setState({offsets: results}, this.renderLines);
  }

  renderLines() {
    const { routing, processedRoutings, offsets } = this.state;

    Object.keys(routing).forEach((key) => {
      if (!processedRoutings[key]) {
        return;
      }

      const route = routing[key];
      const layerId = `${key}-train`;
      const coordinates = processedRoutings[key].map((r) => {
        return this.routingGeoJson(r, [], false)
      });

      coordinates.forEach((r) => {
        r.forEach((coord) => {
          if (stationLocations[`${coord[0]}-${coord[1]}`]) {
            const stationId = stationLocations[`${coord[0]}-${coord[1]}`];
            stations[stationId]["passed"].add(key);
          }
        })
      });

      const geojson = {
        "type": "Feature",
        "properties": {
          "color": route.color,
          "offset": offsets[key],
          "opacity": this.selectedTrains.includes(key) ? 1 : 0.1
        },
        "geometry": {
          "type": "MultiLineString",
          "coordinates": coordinates
        }
      }

      if (this.map.getSource(layerId)) {
        this.map.getSource(layerId).setData(geojson);
      } else {
        this.map.addSource(layerId, {
          "type": "geojson",
          "data": geojson
        });
      }

      if (!this.map.getLayer(layerId)) {
        const layer = {
          "id": layerId,
          "type": "line",
          "source": layerId,
          "layout": {
            "line-join": "round",
            "line-cap": "round",
          },
          "paint": {
            "line-width": {
              "stops": [[8, 1], [14, 3]]
            },
            "line-color": ["get", "color"],
            "line-offset": [
              "interpolate",
              ["linear"],
              ["zoom"],
              8, ["get", "offset"],
              14, ["*", ["get", "offset"], 2],
            ],
            "line-opacity": ["get", "opacity"]
          }
        };

        this.map.addLayer(layer);
        this.map.on('click', layerId, (e) => {
          this.debounceNavigate(`/trains/${key}/#${e.lngLat.lat},${e.lngLat.lng}/${e.target.style.z}`);
        });
        this.map.on('mouseenter', layerId, (() => {
          this.map.getCanvas().style.cursor = 'pointer';
        }).bind(this));
        this.map.on('mouseleave', layerId, (() => {
          this.map.getCanvas().style.cursor = '';
        }).bind(this));
      }
    });
    this.renderOverlays();
    this.renderStops();
  }

  renderOverlays() {
    const { routing, displayDelays, displaySlowSpeeds, displayLongHeadways, processedRoutings, offsets } = this.state;
    const statusSpacing = {
      'long-headway': 11,
      'slow': 7,
      'delay': 5
    }
    const statusVisability = {
      'long-headway': displayLongHeadways,
      'slow': displaySlowSpeeds,
      'delay': displayDelays
    }

    Object.keys(routing).forEach((key) => {
      if (!processedRoutings[key]) {
        return;
      }

      const route = routing[key];
      const layerIdPrefix = `${key}-train`;

      Object.keys(statusColors).forEach((status) => {
        const layerId = `${layerIdPrefix}-${status}`;
        const problemSections = this.calculateProblemSections(route.id, status);
        const coordinates = processedRoutings[key].map((r) => {
          return this.routingGeoJson(r, problemSections, true)
        }).flat();

        const geojson = {
        "type": "Feature",
          "properties": {
            "offset": offsets[key],
            "opacity": this.selectedTrains.includes(key) ? 1 : 0.1
          },
          "geometry": {
            "type": "MultiLineString",
            "coordinates": coordinates
          }
        }

        if (this.map.getSource(layerId)) {
          this.map.getSource(layerId).setData(geojson);
        } else {
          this.map.addSource(layerId, {
            "type": "geojson",
            "data": geojson
          });
        }

        if (!this.map.getLayer(layerId)) {
          const layer = {
            "id": layerId,
            "type": "line",
            "source": layerId,
            "layout": {
              "visibility": statusVisability[status] ? 'visible' : 'none',
              "line-join": "round",
              "line-cap": "round",
            },
            "paint": {
              "line-width": {
                "stops": [[8, 1], [14, 3]]
              },
              "line-color": statusColors[status],
              "line-dasharray": [2, statusSpacing[status]],
              "line-offset": [
                "interpolate",
                ["linear"],
                ["zoom"],
                8, ["get", "offset"],
                14, ["*", ["get", "offset"], 2],
              ],
              "line-opacity": ["get", "opacity"]
            }
          };

          this.map.addLayer(layer);
          this.map.on('click', layerId, (e) => {
            this.debounceNavigate(`/trains/${key}/#${e.lngLat.lat},${e.lngLat.lng}/${e.target.style.z}`);
          });
          this.map.on('mouseenter', layerId, (() => {
            this.map.getCanvas().style.cursor = 'pointer';
          }).bind(this));
          this.map.on('mouseleave', layerId, (() => {
            this.map.getCanvas().style.cursor = '';
          }).bind(this));
        } else {
          this.map.setLayoutProperty(layerId, "visibility", statusVisability[status] ? "visible" : "none");
        }
      });
    });

    if (this.map.getLayer("Stops")) {
      this.map.moveLayer("Stops")
    }
  }

  navigate(path) {
    this.props.history.push(path);
  }

  debounceNavigate = _.debounce(this.navigate, 100, {
    'leading': true,
    'trailing': false
  });

  routingGeoJson(routing, problemSections, filterByProblems) {
    const relevantProblemSections =
      problemSections.filter((ps) => routing.some((s) => ps.first_stops.includes(s)) && routing.some((s) => ps.last_stops.includes(s)));
    const r = routing.slice(0);

    if (filterByProblems && relevantProblemSections.length === 0) {
      return [];
    }

    let path = []
    let filteredPaths = [];
    let cumulativePath = [];
    let prev = r.splice(0, 1);
    let currentProblemSection = null;

    r.forEach((stopId) => {
      let tempPath = [];
      if (!currentProblemSection) {
        currentProblemSection = relevantProblemSections.find((ps) => ps.first_stops.includes(prev));
      }
      tempPath.push([stations[prev].longitude, stations[prev].latitude]);
      let potentialPath = this.findPath(prev, stopId, 0, []);
      if (potentialPath) {
        potentialPath.forEach((coord) => {
          tempPath.push(coord);
        });
      }
      tempPath.push([stations[stopId].longitude, stations[stopId].latitude]);
      path = path.concat(tempPath);
      if (currentProblemSection) {
        cumulativePath = cumulativePath.concat(tempPath);
      }

      prev = stopId;
      if (currentProblemSection && currentProblemSection.last_stops.includes(stopId)) {
        filteredPaths.push(cumulativePath);
        cumulativePath = [];
        currentProblemSection = null;
      }
    });

    if (filterByProblems) {
      return filteredPaths;
    }
    return path;
  }

  calculateProblemSections(routeId, status) {
    const { trains } = this.state;
    const train = trains.find((t) => t.id === routeId);
    const results = [];

    if (!train) {
      return [];
    }

    const northLinesDirections = train.north.map((obj) => {
      return {
        name: obj.name,
        parent_name: obj.parent_name,
        max_actual_headway: obj.max_actual_headway,
        max_scheduled_headway: obj.max_scheduled_headway,
        delay: obj.delay,
        travel_time: obj.travel_time,
        headway_gap: obj.headway_gap,
        slow: obj.slow,
        delayed: obj.delayed,
        first_stops: obj.first_stops.map((s) => s.substr(0, 3)),
        last_stops: obj.last_stops.map((s) => s.substr(0, 3))
      };
    });

    const southLineDirections = train.south.map((obj) => {
      return {
        name: obj.name,
        parent_name: obj.parent_name,
        max_actual_headway: obj.max_actual_headway,
        max_scheduled_headway: obj.max_scheduled_headway,
        delay: obj.delay,
        travel_time: obj.travel_time,
        headway_gap: obj.headway_gap,
        slow: obj.slow,
        delayed: obj.delayed,
        first_stops: obj.last_stops.map((s) => s.substr(0, 3)),
        last_stops: obj.first_stops.map((s) => s.substr(0, 3))
      };
    });

    northLinesDirections.forEach((obj) => {
      if (
        (status === 'long-headway' && obj.headway_gap) ||
        (status === 'slow' && obj.slow) ||
        (status === 'delay' && obj.delayed)
      ) {
        results.push(obj);
      }
    });

    southLineDirections.forEach((obj) => {
      if (
        (status === 'long-headway' && obj.headway_gap) ||
        (status === 'slow' && obj.slow) ||
        (status === 'delay' && obj.delayed)
      ) {
        results.push(obj);
      }
    });

    return results;
  }

  findPath(start, end, stepsTaken, stopsVisited) {
    if (this.calculatedPaths[`${start}-${end}`]) {
      return this.calculatedPaths[`${start}-${end}`];
    }
    if (stopsVisited.includes(start)) {
      return;
    }
    stopsVisited.push(start);
    if (!stations[start] || !stations[start]["north"]) {
      return;
    }
    if (stations[start]["north"][end] != undefined) {
      if (stations[start]["north"][end].length > 0) {
        return stations[start]["north"][end];
      }
      return [[stations[end].longitude, stations[end].latitude]];
    } else if (stepsTaken > 12) {
      return;
    }
    let results = [];
    Object.keys(stations[start]["north"]).forEach((key) => {
      const path = this.findPath(key, end, stepsTaken + 1, stopsVisited);
      if (path && path.length) {
        if (stations[start]["north"][key].length) {
          results = stations[start]["north"][key].concat([[stations[key].longitude, stations[key].latitude]]).concat(path);
        } else {
          results = [[stations[key].longitude, stations[key].latitude]].concat(path);
        }
      }
    });
    this.calculatedPaths[`${start}-${end}`] = results;
    return results;
  }

  renderStops() {
    if (this.map.getSource("Stops")) {
      this.map.getSource("Stops").setData(this.stopsGeoJson());
    } else {
      this.map.addSource("Stops", {
        "type": "geojson",
        "data": this.stopsGeoJson()
      });
    }
    if (!this.map.getLayer("Stops")) {
      this.map.addLayer({
        "id": "Stops",
        "type": "symbol",
        "source": "Stops",
        "layout": {
          "text-field": ['get', 'name'],
          "text-size": {
            "stops": [[8, 10], [12, 14]]
          },
          "text-font": ['Lato Regular', "Open Sans Regular","Arial Unicode MS Regular"],
          "text-optional": true,
          "text-justify": "auto",
          "text-padding": 5,
          "text-variable-anchor": ["right", "bottom-right", "bottom", "left", "bottom-left", "top-left"],
          "icon-image": ['get', 'stopType'],
          "icon-size": {
            "stops": [[8, 0.25], [12, 0.75]]
          },
          "icon-allow-overlap": true,
          "symbol-sort-key": ['get', 'priority'],
        },
        "paint": {
          "text-translate": {
            "stops": [[8, [-5, 0]], [14, [-12, -15]]]
          },
          "text-color": "#aaaaaa",
          "icon-opacity": ['get', 'opacity'],
          "text-opacity": ['get', 'opacity'],
        }
      });
      this.map.on('click', "Stops", e => {
        const path = `/stations/${e.features[0].properties.id}`;
        this.debounceNavigate(path);
      });
      this.map.on('mouseenter', 'Stops', (() => {
        this.map.getCanvas().style.cursor = 'pointer';
      }).bind(this));
      this.map.on('mouseleave', 'Stops', (() => {
        this.map.getCanvas().style.cursor = '';
      }).bind(this));
    }
  }

  stopsGeoJson() {
    const { processedRoutings } = this.state;
    return {
      "type": "FeatureCollection",
      "features": Object.keys(stations).map((key) => {
        let opacity = 1;
        let priority = 5;
        if (!this.selectedTrains.some((train) => stations[key].stops.has(train)) &&
            !this.selectedStations.includes(key) && (this.selectedTrains.length === 1 || stations[key].stops.size > 0)) {
          opacity = 0.1;
          priority = 10;
        } else if (this.selectedStations.length > 0 && !this.selectedStations.includes(key)) {
          opacity = 0.5;
          priority = 7;
        } else if (this.selectedTrains.length == 1 && processedRoutings[this.selectedTrains[0]] &&
          (processedRoutings[this.selectedTrains[0]].some((routing) => routing[0] === key || routing[routing.length - 1] === key))) {
          priority = 1;
        } else if (this.selectedTrains.length > 0 && this.selectedTrains.some((train) => stations[key].stops.has(train))
          && prioritizedStations.has(key)) {
          priority = 3;
        } else if (this.selectedTrains.length === 1 && this.selectedTrains.some((train) => stations[key].stops.has(train))
          && majorStations.has(key)) {
          priority = 4;
        }

        return {
          "type": "Feature",
          "properties": {
            "id": stations[key].id,
            "name": stations[key].name.replace(/ - /g, "–"),
            "stopType": this.stopTypeIcon(key),
            "opacity": opacity,
            "priority": priority
          },
          "geometry": {
            "type": "Point",
            "coordinates": [stations[key].longitude, stations[key].latitude]
          }
        }
      })
    };
  }

  stopTypeIcon(stopId) {
    if (this.selectedTrains.length == 1) {
      const selectedTrain = this.selectedTrains[0];

      if (stations[stopId]["southStops"].has(selectedTrain) && stations[stopId]["northStops"].has(selectedTrain)) {
        return "express-stop";
      }
      if (stations[stopId]["southStops"].has(selectedTrain)) {
        return "all-downtown-trains";
      }
      if (stations[stopId]["northStops"].has(selectedTrain)) {
        return "all-uptown-trains";
      }
      if (stations[stopId]["stops"].size == 0) {
        return "cross-15";
      }
      return "circle-15";
    }

    const passed = Array.from(stations[stopId]["passed"]);
    if (stations[stopId]["stops"].size == 0) {
      return "cross-15";
    }
    if (passed.every((train) => stations[stopId]["southStops"].has(train)) &&
      (passed.every((train) => stations[stopId]["northStops"].has(train)))) {
      return "express-stop";
    }
    if (stations[stopId]["northStops"].size == 0) {
      if (passed.every((train) => stations[stopId]["southStops"].has(train))) {
        return "all-downtown-trains";
      } else {
        return "downtown-only";
      }
    }
    if (stations[stopId]["southStops"].size == 0) {
      if (passed.every((train) => stations[stopId]["northStops"].has(train))) {
        return "all-uptown-trains";
      } else {
        return "uptown-only";
      }
    }
    if (passed.every((train) => stations[stopId]["southStops"].has(train))) {
      return "downtown-all-trains";
    }
    if (passed.every((train) => stations[stopId]["northStops"].has(train))) {
      return "uptown-all-trains";
    }
    return "circle-15";
  }

  goToTrain(train, coords, zoom) {
    const { width } = this.state;
    this.selectTrain(train);

    if (coords && zoom) {
      this.map.easeTo({
        center: coords,
        zoom: zoom,
        bearing: 29,
      });
    } else {
      const source = this.map.getSource(`${train}-train`);
      if (!source) {
        return;
      }
      const data = source._data;
      const coordinatesArray = data.geometry.coordinates;
      if (coordinatesArray[0]) {
        const bounds = coordinatesArray.flat().reduce((bounds, coord) => {
          return bounds.extend(coord);
        }, new mapboxgl.LngLatBounds(coordinatesArray[0][0], coordinatesArray[0][0]));

        this.map.fitBounds(bounds, {
          padding: {
            top: (width >= Responsive.onlyTablet.minWidth) ? 20 : 140,
            right: (width >= Responsive.onlyTablet.minWidth) ? 20 : 60,
            left: (width >= Responsive.onlyTablet.minWidth) ? 480 : 100,
            bottom: 30,
          },
        });
      }
    }

    this.closeMobilePane();
    this.infoBox.scrollTop = 0;
    this.showAll = false;
  }

  selectTrain(train) {
    this.selectedTrains = [train];
    this.selectedStations = [];
    this.renderStops();
    trainIds.forEach((t) => {
      const layerId = `${t}-train`;
      if (this.map.getLayer(layerId)) {
        if (t !== train) {
          this.map.setPaintProperty(layerId, 'line-opacity', 0.1);
        } else {
          this.map.setPaintProperty(layerId, 'line-opacity', 1);
        }
      }

      Object.keys(statusColors).forEach((status) => {
        const l = `${layerId}-${status}`;
        if (this.map.getLayer(l)) {
          if (t !== train) {
            this.map.setPaintProperty(l, 'line-opacity', 0.1);
          } else {
            this.map.setPaintProperty(l, 'line-opacity', 1);
          }
        }
      });
    });
    this.closeMobilePane();
  }

  goToStations(selectedStations, includeTrains) {
    const { width } = this.state;
    const stationsData = selectedStations.map((s) => stations[s]);
    const selectedTrains = includeTrains ? trainIds.filter((t) => stationsData.some((station) => station.stops.has(t))) : [];

    this.selectedTrains = selectedTrains;
    this.selectedStations = selectedStations;
    this.renderStops();
    trainIds.forEach((t) => {
      const layerId = `${t}-train`;
      if (this.map.getLayer(layerId)) {
        if (!includeTrains || !stationsData.some((station) => station.stops.has(t))) {
          this.map.setPaintProperty(layerId, 'line-opacity', 0.1);
        } else {
          this.map.setPaintProperty(layerId, 'line-opacity', 1);
        }
      }

      Object.keys(statusColors).forEach((status) => {
        const l = `${layerId}-${status}`;
        if (this.map.getLayer(l)) {
          if (!includeTrains || !stationsData.some((station) => station.stops.has(t))) {
            this.map.setPaintProperty(l, 'line-opacity', 0.1);
          } else {
            this.map.setPaintProperty(l, 'line-opacity', 1);
          }
        }
      });
    });

    if (selectedStations.length === 1) {
      const stationData = stations[selectedStations[0]];
      let coords = [stationData.longitude, stationData.latitude];
      if (width < Responsive.onlyTablet.minWidth) {
        coords = [coords[0] + 0.002, coords[1] + 0.004];
      } else if (width <= Responsive.onlyTablet.maxWidth) {
        coords = [coords[0] - 0.005, coords[1] + 0.001];
      }
      this.map.easeTo({
        center: coords,
        zoom: 15,
        bearing: 29,
      });
    } else {
      const coordinatesArray = selectedStations.map((s) => [stations[s].longitude, stations[s].latitude]);
      const bounds = coordinatesArray.reduce((bounds, coord) => {
        return bounds.extend(coord);
      }, new mapboxgl.LngLatBounds(coordinatesArray[0], coordinatesArray[0]));

      this.map.fitBounds(bounds, {
        padding: {
          top: (width >= Responsive.onlyTablet.minWidth) ? 20 : 140,
          right: (width >= Responsive.onlyTablet.minWidth) ? 20 : 60,
          left: (width >= Responsive.onlyTablet.minWidth) ? 480 : 100,
          bottom: 30,
        },
      });
    }

    this.openMobilePane();
    this.infoBox.scrollTop = 0;
    this.showAll = false;
  }

  resetView() {
    if (this.showAll) {
      return;
    }

    this.map.fitBounds(defaultBounds, { bearing: 29});
    this.infoBox.scrollTop = 0;
    this.openMobilePane();
    this.selectedTrains = trainIds;
    this.selectedStations = [];

    trainIds.forEach((t) => {
      const layerId = `${t}-train`;
      if (this.map.getLayer(layerId)) {
        this.map.setPaintProperty(layerId, 'line-opacity', 1);
      }

      Object.keys(statusColors).forEach((status) => {
        const l = `${layerId}-${status}`;
        if (this.map.getLayer(l)) {
          this.map.setPaintProperty(l, 'line-opacity', 1);
        }
      });
    });

    this.renderStops();
    this.showAll = true;
  }

  handleToggleMobilePane = _ => {
    this.infoBox.scrollTop = 0;
    this.infoBox.classList.toggle('open');
  };

  handleOnUpdate = (e, { width }) => this.setState({ width })

  handleDisplayProblemsToggle = (e, {checked}) => {
    this.setState({
      displayProblems: checked,
      displayDelays: checked,
      displaySlowSpeeds: checked,
      displayLongHeadways: checked
    }, () => {
      this.renderOverlays();
      this.map.moveLayer('Stops');
    });
    gtag('event', 'toggle', {
      'event_category': 'displayProblems',
      'event_label': checked.toString()
    });
  }

  handleDisplayDelaysToggle = (e, {checked}) => {
    this.setState({displayDelays: checked}, () => {
      this.renderOverlays();
      this.map.moveLayer('Stops');
    });
    gtag('event', 'toggle', {
      'event_category': 'displayDelays',
      'event_label': checked.toString()
    });
  }

  handleDisplaySlowSpeedsToggle = (e, {checked}) => {
    this.setState({displaySlowSpeeds: checked}, () => {
      this.renderOverlays();
      this.map.moveLayer('Stops');
    });
    gtag('event', 'toggle', {
      'event_category': 'displaySlowSpeeds',
      'event_label': checked.toString()
    });
  }

  handleDisplayLongHeadwaysToggle = (e, {checked}) => {
    this.setState({displayLongHeadways: checked}, () => {
      this.renderOverlays();
      this.map.moveLayer('Stops');
    });
    gtag('event', 'toggle', {
      'event_category': 'displayLongHeadways',
      'event_label': checked.toString()
    });
  }

  closeMobilePane() {
    this.infoBox.classList.remove('open');
  }

  openMobilePane() {
    this.infoBox.classList.add('open');
  }

  panes() {
    const { trains } = this.state;
    return [
      {
        menuItem: <Menu.Item as={Link} to='/trains' key='train'>Trains</Menu.Item>,
        render: () => <Tab.Pane attached={false} style={{padding: 0}}><TrainList trains={trains} /></Tab.Pane>,
      },
      {
        menuItem: <Menu.Item as={Link} to='/stations' key='stations'>Stations</Menu.Item>,
        render: () => <Tab.Pane attached={false} style={{padding: 0}}><StationList stations={stations} trains={trains} /></Tab.Pane>,
      },
      {
        menuItem: <Menu.Item as={Link} to='/starred' key='starred'><Icon name='star' /></Menu.Item>,
        render: () => <Tab.Pane attached={false} style={{padding: 0}}><StationList stations={stations} trains={trains} starred={true} /></Tab.Pane>,
      },
      {
        menuItem: <Menu.Item as={Link} to='/advisories' key='advisories'><Icon name='warning sign' /></Menu.Item>,
        render: () => <Tab.Pane attached={false} style={{padding: 0}}><StationList stations={stations} trains={trains} advisories={true} /></Tab.Pane>,
      },
    ];
  }

  renderListings(index) {
    const { trains } = this.state;
    return (
      <div>
        <Helmet>
          <title>the weekendest beta - real-time new york city subway map</title>
          <meta property="og:title" content="the weekendest beta - real-time new york city subway map" />
          <meta name="twitter:title" content="the weekendest beta - real-time new york city subway map" />
        </Helmet>
        <Responsive {...Responsive.onlyMobile} as={Segment} className="mobile-top-bar">
          <Header as='h4'>
            information
          </Header>
          <Legend />
          {
            this.renderOverlayControls()
          }
        </Responsive>
        <Responsive minWidth={Responsive.onlyTablet.minWidth} as={Segment}>
          <Header as='h4'>
            legend
          </Header>
          <Legend />
          {
            this.renderOverlayControls()
          }
        </Responsive>
        <Segment className="selection-pane">
          { trains && trains.length > 1 &&
            <Tab menu={{secondary: true, pointing: true}} panes={this.panes()} activeIndex={index} />
          }
        </Segment>
      </div>
    )
  }

  renderOverlayControls() {
    const { displayProblems, displayDelays, displaySlowSpeeds, displayLongHeadways } = this.state;
    return (
      <List>
        <List.Item>
          <Checkbox toggle onChange={this.handleDisplayProblemsToggle} checked={displayProblems} label={<label title="May cause performance issues">display issues (experimental)</label>} />
          <List.List style={{"display": (displayProblems ? "block" : "none")}}>
            <List.Item>
              <Checkbox toggle onChange={this.handleDisplayDelaysToggle} checked={displayDelays} disabled={!displayProblems} label={<label>delays</label>} />
            </List.Item>
            <List.Item>
              <Checkbox toggle onChange={this.handleDisplaySlowSpeedsToggle} checked={displaySlowSpeeds} disabled={!displayProblems} label={<label>slow speeds</label>} />
            </List.Item>
            <List.Item>
              <Checkbox toggle onChange={this.handleDisplayLongHeadwaysToggle} checked={displayLongHeadways} disabled={!displayProblems} label={<label>long headways</label>} />
            </List.Item>
          </List.List>
        </List.Item>
      </List>
    )
  }

  render() {
    const { trains, arrivals, routing, stops, timestamp } = this.state;
    return (
      <Responsive as='div' fireOnMount onUpdate={this.handleOnUpdate}>
        <div ref={el => this.mapContainer = el}
          style={{top: 0, bottom: 0, left: 0, right: 0, position: "absolute"}}>
        </div>
        <Segment inverted vertical className="infobox">
          { trains.length > 1 &&
            <Responsive as={Button} maxWidth={Responsive.onlyMobile.maxWidth} icon
              className="mobile-pane-control" onClick={this.handleToggleMobilePane}
              title="Expand/Collapse">
              <Icon name='sort'/>
            </Responsive>
          }
          <Responsive {...Responsive.onlyMobile} as='div'>
            <Header inverted as='h3' color='yellow' style={{padding: "5px", float: "left"}}>
            <Link to='/'>
              the weekendest<span id="alpha">beta</span>
            </Link>
              <Header.Subheader>
                real-time new york city subway map
              </Header.Subheader>
            </Header>
          </Responsive>
          <Responsive minWidth={Responsive.onlyTablet.minWidth} as='div'>
            <Header inverted as='h1' color='yellow' style={{padding: "5px"}}>
            <Link to='/'>
              the weekendest<span id="alpha">beta</span>
            </Link>
              <Header.Subheader>
                real-time new york city subway map
              </Header.Subheader>
            </Header>
          </Responsive>
          <div ref={el => this.infoBox = el} className="inner-infobox open">
            <Switch>
              <Route path="/trains/:id?" render={(props) => {
                if (trains.length > 1) {
                  if (props.match.params.id) {
                    const hash = location.hash.substr(1).split('/');
                    let coords = null;
                    let zoom = null;

                    if (hash.length > 1) {
                      const coordsArray = hash[0].split(',');
                      if (coordsArray.length > 1) {
                        coords = [coordsArray[1], coordsArray[0]];
                        zoom = hash[1];
                      }
                    }

                    this.goToTrain(props.match.params.id, coords, zoom);
                    this.closeMobilePane();
                    return (
                      <TrainDetails routing={routing[props.match.params.id]} stops={stops} stations={stations}
                        train={trains.find((train) => train.id == props.match.params.id)}
                      />
                    );
                  } else {
                    this.resetView();
                    return this.renderListings(0);
                  }
                }
              }} />
              <Route path="/stations/:id?" render={(props) => {
                if (trains.length > 1) {
                  if (props.match.params.id) {
                    this.goToStations([props.match.params.id], true);
                    return (
                      <StationDetails routings={routing} trains={trains} station={stations[props.match.params.id]} stations={stations}
                        arrivals={arrivals}
                      />
                    )
                  } else {
                    this.resetView();
                    return this.renderListings(1);
                  }
                }
              }} />
              <Route path="/starred" render={() => {
                if (trains.length > 1) {
                  const favs = Cookies.get('favs') && Cookies.get('favs').split(",") || [];

                  if (favs.length > 0) {
                    this.goToStations(favs, true);
                  } else {
                    this.resetView();
                  }
                  return this.renderListings(2);
                }
              }} />
              <Route path="/advisories" render={() => {
                if (trains.length > 1) {
                  const stationsWithoutService = filter(stations, (result) => result.stops.size === 0);
                  const stationsWithOneWayService = filter(stations, (result) => {
                    return result.stops.size > 0 &&
                      (result.northStops.size === 0 || result.southStops.size === 0 && result.id !== 'H01');
                  });
                  const selectedStations = stationsWithoutService.concat(stationsWithOneWayService).map((s) => s.id);

                  if (selectedStations.length > 1) {
                    this.goToStations(selectedStations, false);
                  }
                  return this.renderListings(3);
                }
              }} />
              <Route render={() => <Redirect to="/trains" /> } />
            </Switch>
            <Loader active={!(trains && trains.length)} />
            <Header inverted as='h5' floated='left' style={{margin: "10px 5px"}}>
              Last updated {timestamp && (new Date(timestamp)).toLocaleTimeString('en-US')}.<br />
              Powered by <a href='https://www.goodservice.io' target='_blank'>goodservice.io</a>.<br />
              Created by <a href='https://twitter.com/_blahblahblah' target='_blank'>Sunny Ng</a>.<br />
              <a href='https://github.com/blahblahblah-/theweekendest' target='_blank'>Source code</a>.
            </Header>
            </div>
        </Segment>
      </Responsive>
    )
  }
}

export default withRouter(Mapbox)