import React from 'react';
import ReactDOM from 'react-dom';
import mapboxgl from 'mapbox-gl';
import { Responsive, Checkbox, Header, Segment, Statistic, Tab, Button, Loader, Icon, Menu, List, Grid } from "semantic-ui-react";
import { BrowserRouter as Router, Route, Link, Switch, Redirect, withRouter } from "react-router-dom";
import { Helmet } from "react-helmet";
import { debounce, filter, map } from 'lodash';
import * as Cookies from 'es-cookie';
import * as turf from './vendor/turf.js';

import LegendModal from './legendModal.jsx';
import OverlayControls from './overlayControls.jsx';
import TrainList from './trainList.jsx';
import TrainDetails from './trainDetails.jsx';
import TripDetails from './tripDetails.jsx';
import StationList from './stationList.jsx';
import StationDetails from './stationDetails.jsx';

import stationData from '../data/station_details.json';
import transfers from '../data/transfers.json';

const apiUrl = 'https://www.goodservice.io/api/routes';
const summaryUrl = 'https://www.goodservice.io/api/info/summary';
const statusUrl = 'https://www.goodservice.io/api/info';
const arrivalsUrl = 'https://www.goodservice.io/api/arrivals';
const accessibilityUrl = 'https://www.goodservice.io/api/accessibility';
const stations = {};
const stationLocations = {};
const center = [-74.003683, 40.7079445]
const defaultBounds = [
  [-74.251961, 40.512764],
  [-73.755405, 40.903125]
]
const trainIds = [
  '2', '3', '1', '4', '5', '6', '6X', '7', '7X', 'A', 'AL', 'C', 'E', 'F', 'FX',
  'D', 'B', 'M', 'J', 'Z', 'R', 'N', 'Q', 'W', 'G', 'H', 'FS', 'GS', "L", "SI"
];

const statusColors = {
  'long-headway': '#dddddd',
  'slow': '#fbfb08',
  'delay': '#ff8093'
}

const M_TRAIN_SHUFFLE = ["M18", "M16", "M14", "M13", "M12", "M11"];

// Trains passing through these stations can be physically in the opposite direction of trains that are running in the same direction
// The keys represent such stations, the values represent subsequent stations that if a train stops there, we would need to reverse its direction of the keys
const STATIONS_TO_FLIP_DIRECTIONS = {
  "D14": "F12",
  "D43": "D42",
  "A42": "G36",
}
const STATIONS_THAT_OVERLAP_EACH_OTHER = {
  "A12": "D13",
  "D13": "A12",
  "A32": "D20",
  "D20": "A32",
  "718": "R09",
  "R09": "718",
}

mapboxgl.accessToken = process.env.MAPBOX_TOKEN;

class Mapbox extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      trains: [],
      arrivals: {},
      routing: {},
      displayAccessibleOnly: false,
      displayProblems: false,
      displayDelays: false,
      displaySlowSpeeds: false,
      displayLongHeadways: false,
      displayTrainPositions: true,
      loading: true,
      processedRoutings: {},
      routingByDirection: {},
      routeStops: {},
      destinations: [],
      transferStations: [],
      offsets: {},
      trainPositions: {},
      accessibleStations: {
        north: [],
        south: [],
      },
      elevatorOutages: {},
      loadFullInfo: false,
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
    this.mapLoaded = false;
    this.calculatedPaths = {};
    this.props.history.listen((location) => {
      gtag('config', 'UA-127585516-1', {'page_path': location.pathname});
    });
    this.selectedTrains = trainIds;
    this.selectedTrip = null;
    this.selectedStations = [];
    this.selectedTripCoords = null;
    this.clickCount = 0;
  }
  
  componentDidMount() {
    this.fetchData();

    this.map = new mapboxgl.Map({
      container: this.mapContainer,
      style: 'mapbox://styles/theweekendest/ck1fhati848311cp6ezdzj5cm?optimize=true',
      center: center,
      bearing: 29,
      minZoom: 9,
      zoom: 10,
      hash: true,
      maxBounds: [
        [-74.8113, 40.1797],
        [-73.3584, 41.1247]
      ],
      maxPitch: 0,
    });

    this.geoControl = new mapboxgl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true
      },
      trackUserLocation: true
    });

    this.map.addControl(new mapboxgl.NavigationControl(), "bottom-right");
    this.map.addControl(this.geoControl, 'bottom-right');

    this.map.on('load', () => {
      this.mapLoaded = true;
      this.dataTimer = setInterval(this.fetchData.bind(this), 30000);
    });

    this.map.on('rotateend', () => {
      this.renderTrainPositions();
    })

    this.map.on('click', (e) => {
      if (!this.showAll) {
        this.clickCount++;

        if (this.clickCount === 1) {
          setTimeout(() => {
            if(this.clickCount === 1) {
              const center = this.map.getCenter();
              const zoom = this.map.getZoom();
              const bearing = this.map.getBearing();
              this.debounceLayerNavigate(`/trains#${center.lat},${center.lng}/${zoom}/${bearing}`);
              e.originalEvent.stopPropagation();
            }
            this.clickCount = 0;
          }, 300);
        }
      }
    });

    this.map.on('dblclick', (e) => {
      return false;
    });

    this.geoControl.on('geolocate', (e) => {
      this.setState({geoLocation: e.coords});
    });

    this.map.fitBounds(defaultBounds, {
      bearing: 29,
      padding: 100
    });
  }

  fetchData() {
    const { loadFullInfo } = this.state;

    this.setState({loading: true}, () => {
      fetch(accessibilityUrl)
        .then(response => response.json())
        .then(data => this.setState({ accessibleStations: data.accessible_stations, elevatorOutages: data.outages }))

      fetch(apiUrl)
        .then(response => response.json())
        .then(data => {
          if (this.checksum !== data.checksum) {
            this.setState({routing: data.routes, stops: data.stops}, this.processRoutings);
          }
          this.checksum = data.checksum;
        })
        .then(() => {
          fetch(arrivalsUrl)
            .then(response => response.json())
            .then(data => this.setState({ arrivals: data.routes, loading: false }, () => {
              this.renderTrainPositions();
            }));
        })

      fetch(loadFullInfo ? statusUrl : summaryUrl)
        .then(response => response.json())
        .then(data => this.setState({ trains: data.routes, blogPost: data.blog_post, timestamp: data.timestamp }, this.renderOverlays));
    });
  }

  processRoutings() {
    const { routing, stops } = this.state;
    Object.keys(stationData).forEach((key) => {
      stations[key] = stationData[key];
      stations[key]["northStops"] = new Set();
      stations[key]["southStops"] = new Set();
      stations[key]["passed"] = new Set();
      stations[key]["stops"] = new Set();
    });

    const processedRoutings = {};
    const routingByDirection = {};
    const routeStops = {};
    const destinations = new Set();
    const transferStations = new Set();

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
        });
      });
      routingByDirection[key] = {
        "north": northRoutings,
        "south": southRoutings
      };
      [northRoutings, southRoutings].forEach((direction) => {
        direction.forEach((routing) => {
          destinations.add(routing[routing.length - 1]);
        });
      });
      const allRoutings = northRoutings.concat(southRoutings.map((routing) => routing.slice(0).reverse()));
      processedRoutings[key] = Array.from(new Set(allRoutings.map(JSON.stringify)), JSON.parse);
    });

    Object.keys(processedRoutings).forEach((key) => {
      const routings = processedRoutings[key];
      routings.forEach((route) => {
        let prevStop = null;
        let prevTrains = [];

        route.forEach((stop) => {
          const stopData = stops[stop];

          if (!stopData) {
            return;
          }

          const trains = stops[stop].trains.map((t) => t.directions.map((d) => `${t.id}-${d}`)).flat();

          if (prevStop) {
            if (trains.filter(n => !prevTrains.includes(n) && n.split('-')[0] !== key).length > 0) {
              transferStations.add(stop);
            }
            if (prevTrains.filter(n => !trains.includes(n) && n.split('-')[0] !== key).length > 0) {
              transferStations.add(prevStop)
            }
          }

          prevStop = stop;
          prevTrains = trains;
        });
      });
    });

    this.setState({
      processedRoutings: processedRoutings,
      routeStops: routeStops,
      routingByDirection: routingByDirection,
      destinations: [...destinations],
      transferStations: [...transferStations],
    }, this.calculateOffsets);
  }

  calculateOffsets() {
    if (!this.mapLoaded) {
      this.map.on('load', () => {
        this.calculateOffsets();
      });
      return;
    }

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
            let offsetToUse = offsets[route];
            if (this.shouldReverseDirection(train, route, stop)) {
              if (offsetToUse > 0) {
                if (offsetToUse % 2 === 1) {
                  offsetToUse++;
                } else {
                  offsetToUse--;
                }
              }
            }
            conflictingOffsets.add(offsetToUse);
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

  // Some stations have same direction trains going in opposite directions
  shouldReverseDirection(fromRouteId, toRouteId, stationId) {
    return Object.keys(STATIONS_TO_FLIP_DIRECTIONS).some((targetStation) => {
      const triggerStation = STATIONS_TO_FLIP_DIRECTIONS[targetStation];
      return stationId === targetStation && stations[triggerStation].stops.has(fromRouteId) !== stations[triggerStation].stops.has(toRouteId);
    })
    return false;
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
          "opacity": this.selectedTrains.includes(key) ? 1 : 0.1,
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
            "line-join": "miter",
            "line-cap": "round",
          },
          "paint": {
            "line-width": [
              "interpolate",
              ["linear"],
              ["zoom"],
              8, 1,
              13, 2,
              14, 5,
            ],
            "line-color": ["get", "color"],
            "line-offset": [
              "interpolate",
              ["linear"],
              ["zoom"],
              8, ["get", "offset"],
              13, ["*", ["get", "offset"], 1.5],
              14, ["*", ["get", "offset"], 3],
            ],
            "line-opacity": ["get", "opacity"]
          }
        };

        this.map.addLayer(layer);
        this.map.on('click', layerId, (e) => {
          if (this.showAll) {
            setTimeout(() => {
              this.debounceLayerNavigate(`/trains/${key}/#${e.lngLat.lat},${e.lngLat.lng}/${e.target.style.z}`);
              e.originalEvent.stopPropagation();
            })
          }
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

  renderTrainPositions(callback) {
    const { displayTrainPositions } = this.state;
    const currentTime = Date.now() / 1000;

    if (!this.mapLoaded) {
      this.map.on('load', () => {
        this.renderTrainPositions();
      });
      return;
    }

    if (!displayTrainPositions && !this.selectedTrip) {
      if (this.map.getLayer("TrainPositions")) {
        this.map.setLayoutProperty("TrainPositions", "visibility", "none");
      }
      return;
    }

    const trainPositions = this.calculateTrainPositions(currentTime);

    if (!trainPositions) {
      return;
    }

    const geoJson = this.trainPositionGeoJson(currentTime, trainPositions, callback);

    if (this.map.getSource("TrainPositions")) {
      this.map.getSource("TrainPositions").setData(geoJson);
    } else {
      this.map.addSource("TrainPositions", {
        "type": "geojson",
        "data": geoJson
      });
    }

    if (!this.map.getLayer("TrainPositions")) {
      this.map.addLayer({
        "id": "TrainPositions",
        "type": "symbol",
        "source": "TrainPositions",
        "layout": {
          "icon-image": ['get', 'icon'],
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
          "icon-size": {
            "stops": [[10, 0.5], [11, 1], [12, 1.5], [13, 2]]
          },
          "icon-rotate": ['get', 'bearing'],
          "icon-rotation-alignment": "map",
          "text-field": ['get', 'route'],
          "text-font": ['Lato Bold', "Open Sans Bold","Arial Unicode MS Bold"],
          "text-size": {
            "stops": [[10, 6], [11, 8], [12, 10], [13, 12]]
          },
          "text-ignore-placement": true,
          "text-allow-overlap": true,
          "text-offset": ['get', 'offset'],
          "text-rotate": ['get', 'text-rotate']
        },
        "paint": {
          "text-color": ['get', 'text-color']
        },
        "filter": ['get', 'visibility']
      });

      this.map.on('click', "TrainPositions", e => {
        const path = `/trains/${e.features[0].properties.routeId}/${e.features[0].properties.tripId.replace("..", "-")}`;
        this.debounceLayerNavigate(path);
        e.originalEvent.stopPropagation();
      });
      this.map.on('mouseenter', 'TrainPositions', (() => {
        this.map.getCanvas().style.cursor = 'pointer';
      }).bind(this));
      this.map.on('mouseleave', 'TrainPositions', (() => {
        this.map.getCanvas().style.cursor = '';
      }).bind(this));
    }

    this.map.setLayoutProperty("TrainPositions", "visibility", "visible");

    this.map.moveLayer("TrainPositions")
  }

  renderTrip(callback) {
    const { offsets, routing, trainPositions, arrivals } = this.state;

    if (!this.mapLoaded) {
      this.map.on('load', () => {
        this.renderTrip();
      });
      return;
    }

    if (!this.selectedTrip) {
      if (this.map.getLayer("SelectedTrip")) {
        this.map.setLayoutProperty("SelectedTrip", "visibility", "none");
      }
      return;
    }

    const tripData = arrivals[this.selectedTrip.train].trains[this.selectedTrip.direction].find((t) => t.id === this.selectedTrip.id);

    if (!tripData) {
      return;
    }

    const tripRoute = Object.keys(tripData.times).map((key) => key.substr(0, 3));
    const northboundRouting = (this.selectedTrip.direction === 'north') ? tripRoute : tripRoute.slice().reverse();
    const northboundCoordinatesArray = this.routingGeoJson(northboundRouting, [], false);
    const coords = (this.selectedTrip.direction === 'north') ? northboundCoordinatesArray : northboundCoordinatesArray.reverse();

    if (coords.length < 2) {
      return coords;
    }

    const route = routing[this.selectedTrip.train];
    const line = turf.helpers.lineString(coords);
    const lineSlice = trainPositions[this.selectedTrip.id] ? turf.lineSlice(turf.helpers.point(trainPositions[this.selectedTrip.id]), turf.helpers.point(coords[coords.length - 1]), line) : line;

    const geojson = {
      "type": "Feature",
      "properties": {
        "color": route.color,
        "offset": (this.selectedTrip.direction === 'north') ? offsets[route.id] : offsets[route.id] * -1,
        "opacity": 1
      },
      "geometry": {
        "type": "LineString",
        "coordinates": lineSlice.geometry.coordinates
      }
    }

    if (this.map.getSource("SelectedTrip")) {
      this.map.getSource("SelectedTrip").setData(geojson);
    } else {
      this.map.addSource("SelectedTrip", {
        "type": "geojson",
        "data": geojson
      });
    }

    if (!this.map.getLayer("SelectedTrip")) {
      const layer = {
        "id": "SelectedTrip",
        "type": "line",
        "source": "SelectedTrip",
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

      if (this.map.getLayer("Stops")) {
        this.map.moveLayer("Stops")
      }
      if (this.map.getLayer("TrainOutlines")) {
        this.map.moveLayer("TrainOutlines")
      }

      if (this.map.getLayer("TrainPositions")) {
        this.map.moveLayer("TrainPositions")
      }
    } else {
      this.map.setLayoutProperty("SelectedTrip", "visibility", "visible");
    }

    if (callback) {
      callback(coords);
    }
  }

  calculateTrainPositions(currentTime) {
    const { arrivals, routing, routingByDirection } = this.state;
    const trainPositions = [];

    if (!arrivals || !routing || !routingByDirection) {
      return;
    }

    Object.keys(arrivals).forEach((routeId) => {
      const arrivalInfo = arrivals[routeId];

      if (!arrivalInfo) {
        return;
      }

      ['north', 'south'].forEach((direction) => {
        const fullRoutings = routingByDirection[routeId] && routingByDirection[routeId][direction];
        const trainArrivals = arrivalInfo.trains[direction];

        trainArrivals.forEach((arr) => {
          const nextStation = Object.keys(arr.times).find((key) => arr.times[key] > currentTime && stations[key.substr(0, 3)]);
          const nextStationEstimatedTime = arr.times[nextStation];

          const precedingStations = Object.keys(arr.times).slice(0, Object.keys(arr.times).indexOf(nextStation)).reverse();
          let previousStation = precedingStations.find((key) => arr.times[key] <= currentTime && stations[key.substr(0, 3)]);
          let previousStationEstimatedTime = arr.times[previousStation];

          if (!nextStation) {
            return;
          }

          if (!previousStation) {
            const nextId = nextStation.substr(0, 3);
            if (fullRoutings.some((r) => r[0] === nextId)) {
              return;
            }

            const matchedRouting = fullRoutings.find((r) => r.includes(nextId))
            if (!matchedRouting) {
              return;
            }

            const precedingStops = matchedRouting.slice(0, matchedRouting.indexOf(nextId)).reverse();
            previousStation = precedingStops.find((stop) => stations[stop.substr(0, 3)]);
            let timeDiff = (nextStationEstimatedTime - currentTime) * 2;
            timeDiff = (timeDiff < 420) ? 420 : timeDiff;
            previousStationEstimatedTime = nextStationEstimatedTime - timeDiff;
          }

          const next = {
            stop_id: nextStation.substr(0, 3),
            estimated_time: nextStationEstimatedTime,
          };

          const prev = {
            stop_id: previousStation.substr(0, 3),
            estimated_time: previousStationEstimatedTime,
          }


          trainPositions.push({
            route: routeId,
            routeName: routing[routeId].name,
            id: arr.id,
            direction: direction,
            prev: prev,
            next: next
          });
        });
      });
    })

    return trainPositions;
  }

  trainPositionGeoJson(currentTime, trainPositions, callback) {
    const { routing } = this.state;
    const trainPositionsObj = {};

    if (!routing) {
      return;
    }

    const results = {
      "type": "FeatureCollection",
      "features": trainPositions.map((pos) => {
        const prev = pos.prev.stop_id.substr(0, 3);
        const next = pos.next.stop_id.substr(0, 3);
        const array = pos.direction === 'north' ? [prev, next] : [next, prev];
        const geoJson = this.routingGeoJson(array, [], false);
        const lineSegment = turf.helpers.lineString(pos.direction === 'north' ? geoJson : geoJson.reverse());
        const lineLength = turf.length(lineSegment);
        const diffTime = pos.next.estimated_time - pos.prev.estimated_time;
        const progress = (currentTime - pos.prev.estimated_time) / diffTime;
        const estimatedDistanceTraveled = progress * lineLength;
        const feature = turf.along(lineSegment, estimatedDistanceTraveled);
        const pointAhead = turf.along(lineSegment, estimatedDistanceTraveled + 0.01);
        const bearing = turf.bearing(
          turf.helpers.point(feature.geometry.coordinates), turf.helpers.point(pointAhead.geometry.coordinates)
        );
        const bearingInRads = (bearing - this.map.getBearing()) * (Math.PI / 180);
        let visibility = false;

        if ((this.selectedTrip && this.selectedTrip.id === pos.id) || this.selectedTrains.includes(pos.route)) {
          visibility = true;
        }
        let textRotate = 0;

        if (pos.routeName.endsWith('X')) {
          textRotate = (bearing + 225) % 90 - 45 - this.map.getBearing();
        }

        trainPositionsObj[pos.id] = feature.geometry.coordinates;

        feature.properties = {
          "route": pos.routeName.endsWith('X') ? pos.routeName[0] : pos.routeName,
          "routeId": pos.route,
          "tripId": pos.id,
          "direction": pos.direction,
          "color": routing[pos.route].color,
          "icon": pos.routeName.endsWith('X') ? `train-pos-x-${routing[pos.route].color.slice(1).toLowerCase()}` : `train-pos-${routing[pos.route].color.slice(1).toLowerCase()}`,
          "text-color": routing[pos.route].color.toLowerCase() === '#fbbd08' ? '#000000' : '#ffffff',
          "bearing": bearing,
          "text-rotate": textRotate,
          "offset": [Math.sin(bearingInRads) * -0.3, Math.cos(bearingInRads) * 0.3],
          "visibility": visibility
        }

        return feature;
      })
    }
    this.setState({trainPositions: trainPositionsObj}, () => {
      this.renderTrip(callback)
    });

    return results;
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

    if (!this.mapLoaded) {
      this.map.on('load', () => {
        this.renderOverlays();
      });
      return;
    }

    Object.keys(routing).forEach((key) => {
      if (!processedRoutings[key]) {
        return;
      }

      const route = routing[key];
      const layerIdPrefix = `${key}-train`;

      Object.keys(statusColors).forEach((status) => {
        const layerId = `${layerIdPrefix}-${status}`;

        if (!this.map.getLayer(layerId) && !statusVisability[status]) {
          return;
        }

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
        } else {
          this.map.setLayoutProperty(layerId, "visibility", statusVisability[status] ? "visible" : "none");
        }
      });
    });

    if (this.map.getLayer("Stops")) {
      this.map.moveLayer("Stops");
    }

    if (this.map.getLayer("TrainOutlines")) {
      this.map.moveLayer("TrainOutlines")
    }

    if (this.map.getLayer("TrainPositions")) {
      this.map.moveLayer("TrainPositions");
    }
  }

  navigate(path) {
    this.props.history.push(path);
  }

  debounceLayerNavigate = _.debounce((path) => {
    this.debounceNavigate(path);
  }, 300, {
    'leading': true,
    'trailing': false
  });

  debounceNavigate = _.debounce(this.navigate, 450, {
    'leading': false,
    'trailing': true
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
    let prev = r.splice(0, 1)[0];
    let currentProblemSection = null;

    r.forEach((stopId, index) => {
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
      if (currentProblemSection && currentProblemSection.last_stops.includes(stopId) &&
        !r.slice(index + 1).some((s) => currentProblemSection.last_stops.includes(s))) {
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
    if (this.map.getSource("TrainOutlines")) {
      this.map.getSource("TrainOutlines").setData(this.lineOutlineGeojson());
    } else {
      this.map.addSource("TrainOutlines", {
        "type": "geojson",
        "data": this.lineOutlineGeojson()
      });
    }
    if (!this.map.getLayer("TrainOutlines")) {
      this.map.addLayer({
        'id': 'TrainOutlines',
        'type': 'symbol',
        'source': 'TrainOutlines',
        'layout': {
          'text-field': '-',
          'text-padding': 0,
          'text-line-height': {
            "stops": [[10, 0.1], [12.5, 8]]
          },
          'text-size': 1,
          'symbol-placement': 'line',
          'symbol-spacing': 10,
          'symbol-sort-key': 1,
        },
        'paint': {
          'text-color': '#aaaaaa',
          'text-opacity': 0.01,
        },
      });
      this.map.on('click', "Stops", e => {
        const path = `/stations/${e.features[0].properties.id}`;
        this.debounceLayerNavigate(path);
        e.originalEvent.stopPropagation();
      });
      this.map.on('mouseenter', 'Stops', (() => {
        this.map.getCanvas().style.cursor = 'pointer';
      }).bind(this));
      this.map.on('mouseleave', 'Stops', (() => {
        this.map.getCanvas().style.cursor = '';
      }).bind(this));
    }

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
            "stops": [[10, 8], [13, 12]]
          },
          "text-font": ['case',
            ['any',
              ['get', 'destination'],
              ['get', 'transferStation'],
            ],
            ['literal', ['Lato Bold', "Open Sans Bold","Arial Unicode MS Bold"]],
            ['literal', ['Lato Regular', "Open Sans Regular","Arial Unicode MS Regular"]],
          ],
          "text-optional": true,
          "text-justify": "auto",
          'text-allow-overlap': false,
          "text-padding": 1,
          "text-variable-anchor": ["bottom-right", "top-right", "bottom-left", "top-left", "right", "left", "bottom"],
          "text-radial-offset": {
            "stops":  [[9, 0.25], [12, 0.75], [14, 1]],
          },
          "icon-image": ['get', 'stopType'],
          "icon-size": {
            "stops": [[9, 0.1], [14, 0.75]]
          },
          "icon-rotate": ['get', 'bearing'],
          "icon-rotation-alignment": "map",
          "icon-allow-overlap": true,
          "icon-offset": [
            "interpolate",
            ["linear"],
            ["zoom"],
            8, ["get", "offset"],
            14, ["get", "offset-double"]
          ],
          "symbol-sort-key": ['get', 'priority'],
        },
        "paint": {
          "text-color": ['case',
            ['any',
              ['get', 'destination'],
              ['get', 'transferStation'],
            ],
            '#ffffff',
            '#eeeeee',
          ],
          "icon-opacity": [
            "interpolate",
            ["exponential", 2],
            ["zoom"],
            8, ["get", "opacity"],
            13.9, ["get", "opacity"],
            14, 0
          ],
          "text-opacity": ['get', 'opacity'],
        },
      }, "TrainOutlines");
      this.map.on('click', "Stops", e => {
        const path = `/stations/${e.features[0].properties.id}`;
        this.debounceLayerNavigate(path);
        e.originalEvent.stopPropagation();
      });
      this.map.on('mouseenter', 'Stops', (() => {
        this.map.getCanvas().style.cursor = 'pointer';
      }).bind(this));
      this.map.on('mouseleave', 'Stops', (() => {
        this.map.getCanvas().style.cursor = '';
      }).bind(this));
    }
    this.map.moveLayer('TrainOutlines');
  }

  stopsGeoJson() {
    const { processedRoutings, arrivals, destinations, transferStations, accessibleStations, displayAccessibleOnly, offsets } = this.state;

    if (this.selectedTrip && arrivals) {
      const tripData = arrivals[this.selectedTrip.train].trains[this.selectedTrip.direction].find((t) => t.id === this.selectedTrip.id);

      if (tripData) {
        const routing = Object.keys(tripData.times).map((key) => key.substr(0, 3));
        const northboundRouting = (this.selectedTrip.direction === 'north') ? routing : routing.slice().reverse();
        const northboundCoordinatesArray = this.routingGeoJson(northboundRouting, [], false);
        const coords = (this.selectedTrip.direction === 'north') ? northboundCoordinatesArray : northboundCoordinatesArray.reverse();

        let line;
        let lineLength;

        if (coords.length > 1) {
          line = turf.helpers.lineString(coords);
          lineLength = turf.length(line);
        }

        return {
          "type": "FeatureCollection",
          "features": Object.keys(stations).map((key) => {
            const destination = routing[routing.length - 1] === key;
            const transferStation = transferStations.includes(key);
            let offset = offsets[this.selectedTrip.train];
            let bearing = stations[key].bearing;
            let opacity = 0.1;
            let priority = 10;
            let stopType = this.stopTypeIcon(key);

            if (routing.includes(key)) {
              const stationCoords = [stations[key].longitude, stations[key].latitude];

              opacity = 1;
              priority = (routing[routing.length - 1] === key ? 1 : 5);
              stopType = this.selectedTrip.direction === 'north' ? 'all-uptown-trains' : 'all-downtown-trains';

              if (this.selectedTrip.train === 'M' && M_TRAIN_SHUFFLE.includes(key) || this.shouldReverseDirection(this.selectedTrip.train, null, key)) {
                stopType = this.selectedTrip.direction !== 'north' ? 'all-uptown-trains' : 'all-downtown-trains';
              }

              if (this.shouldReverseDirection(this.selectedTrip.train, null, key)) {
                offset = offset * -1;
              }

              if (bearing === undefined && line) {
                const stationPt = turf.helpers.point(stationCoords);
                if (lineLength > 0) {
                  // Station is at beginning of line
                  if (coords[0][0] === stationCoords[0] && coords[0][1] === stationCoords[1]) {
                    const pointAhead = turf.along(line, 0.01);

                    bearing = turf.bearing(stationPt, pointAhead);
                  } else {
                    const lineSegment = turf.lineSlice(turf.helpers.point(coords[0]), stationPt, line)
                    const segmentLength = turf.length(lineSegment);
                    const pointBehind = turf.along(lineSegment, segmentLength - 0.01);

                    bearing = turf.bearing(pointBehind, stationPt);
                  }

                  stopType = 'all-uptown-trains';
                } else {
                  stopType = this.selectedTrip.direction === 'north' ? 'all-uptown-trains' : 'all-downtown-trains';
                }
              }
            } else {
              bearing = 0;
            }

            return {
              "type": "Feature",
              "properties": {
                "id": stations[key].id,
                "name": stations[key].name.replace(/ - /g, "–"),
                "stopType": stopType,
                "opacity": opacity,
                "priority": priority,
                "bearing": bearing,
                'destination': destination,
                'transferStation': transferStation,
                'offset': [offset * 1.5, 0],
                'offset-double': [offset * 3, 0],
              },
              "geometry": {
                "type": "Point",
                "coordinates": [stations[key].longitude, stations[key].latitude]
              }
            }
          })
        }
      }
    }

    return {
      "type": "FeatureCollection",
      "features": Object.keys(stations).map((key) => {
        const stopTypeIcon = this.stopTypeIcon(key, this.selectedTrains[0]);
        const stationCoords = [stations[key].longitude, stations[key].latitude];
        const stationPt = turf.helpers.point(stationCoords);
        let offset = 0;
        let bearing = stations[key].bearing;
        let opacity = 1;
        let priority = 5;
        let destination = false;
        let transferStation = false;

        if ((displayAccessibleOnly && !accessibleStations.north.includes(key + 'N') && !accessibleStations.south.includes(key + 'S')) ||
          (!this.selectedTrains.some((train) => stations[key].stops.has(train)) &&
          !this.selectedStations.includes(key) && (this.selectedTrains.length === 1 || stations[key].stops.size > 0))) {
          opacity = 0.1;
          priority = 10;
        } else if (this.selectedStations.length > 0 && !this.selectedStations.includes(key)) {
          opacity = 0.5;
          priority = 7;
        } else if (
          (this.selectedTrains.length == 1 && processedRoutings[this.selectedTrains[0]] &&
            (processedRoutings[this.selectedTrains[0]].some((routing) => routing[0] === key || routing[routing.length - 1] === key)))
          || (this.selectedTrains.length > 1 && destinations.includes(key))) {
          destination = true;
          priority = 1;
        } else if (transferStations.includes(key)) {
          transferStation = true;
          priority = 3;
        }

        if (this.selectedTrains.length === 1) {
          offset = offsets[this.selectedTrains[0]];

          if (this.shouldReverseDirection(this.selectedTrains[0], null, key)) {
            offset = offset * -1;
          }
        } else {
          const trainsPassed = Array.from(stations[key]["passed"]);
          const trainOffsets = trainsPassed.map((t) => {
            if (this.shouldReverseDirection(t, null, key)) {
              return offsets[t] * -1;
            }
            return offsets[t];
          });
          if (trainsPassed.length > 0) {
            offset = (Math.max(...trainOffsets) + Math.min(...trainOffsets)) / 2;
          }
        }

        if (bearing === undefined && !["circle-15", "express-stop", "cross-15"].includes(stopTypeIcon)) {
          const matchedRouting = Object.values(processedRoutings).flat().find((r) => r.find((s) => s === key));

          if (matchedRouting.length > 1) {
            const i = matchedRouting.indexOf(key);
            if (i < (matchedRouting.length - 1)) {
              const nextNorthStation = matchedRouting[i + 1];
              const pair = [key, nextNorthStation];
              const coordinatesArray = this.routingGeoJson(pair, [], false);
              const line = turf.helpers.lineString(coordinatesArray);
              const pointAhead = turf.along(line, 0.01);

              bearing = turf.bearing(stationPt, pointAhead);
            } else {
              const nextSouthStation = matchedRouting[i - 1];
              const pair = [nextSouthStation, key];
              const coordinatesArray = this.routingGeoJson(pair, [], false);
              const line = turf.helpers.lineString(coordinatesArray);
              const lineLength = turf.length(line);
              const pointBehind = turf.along(line, lineLength - 0.01);

              bearing = turf.bearing(pointBehind, stationPt);
            }
          }
        }

        if (bearing === undefined && stopTypeIcon === "cross-15") {
          bearing = this.map.getBearing();
        }

        if (bearing === undefined) {
          bearing = 0;
        }

        return {
          "type": "Feature",
          "properties": {
            "id": stations[key].id,
            "name": stations[key].name.replace(/ - /g, "–"),
            "stopType": stopTypeIcon,
            "opacity": opacity,
            "priority": priority,
            "bearing": bearing,
            'destination': destination,
            'transferStation': transferStation,
            'offset': [offset * 1.5, 0],
            'offset-double': [offset * 3, 0],
          },
          "geometry": {
            "type": "Point",
            "coordinates": [stations[key].longitude, stations[key].latitude]
          }
        }
      })
    };
  }

  lineOutlineGeojson() {
    const { routing, processedRoutings } = this.state;
    const coordinates = [];
    let trainsToDisplay = Object.keys(routing);

    if (this.selectedTrip) {
      trainsToDisplay = [this.selectedTrip.train];
    } else if (this.selectedTrains.length > 0) {
      trainsToDisplay = this.selectedTrains;
    }

    trainsToDisplay.forEach((key) => {
      if (!processedRoutings[key]) {
        return;
      }

      const layerId = `${key}-train`;
      const source = this.map.getSource(layerId);

      if (!source) {
        return;
      }
      const data = source._data;
      data.geometry.coordinates.forEach((a) => {
        coordinates.push(a);
      });
    });

    return {
      "type": "Feature",
      "geometry": {
        "type": "MultiLineString",
        "coordinates": coordinates,
      }
    }
  }

  stopTypeIcon(stopId) {
    const { accessibleStations, displayAccessibleOnly, elevatorOutages } = this.state;

    let southStops = new Set(stations[stopId]["southStops"]);
    let northStops = new Set(stations[stopId]["northStops"]);
    const southAccessible = accessibleStations.south.includes(stopId + 'S');
    const northAccessible = accessibleStations.north.includes(stopId + 'N');

    if (M_TRAIN_SHUFFLE.includes(stopId)) {
      let southStopsContainM = false;
      let northStopsContainM = false;

      if (southStops.has('M')) {
        southStopsContainM = true;
      }
      if (northStops.has('M')) {
        northStopsContainM = true;
      }
      southStops.delete('M');
      northStops.delete('M');

      if (southStopsContainM) {
        northStops.add('M');
      }
      if (northStopsContainM) {
        southStops.add('M');
      }
    }

    Object.keys(STATIONS_TO_FLIP_DIRECTIONS).forEach((targetStation) => {
      const triggerStation = STATIONS_TO_FLIP_DIRECTIONS[targetStation];
      if (stopId === targetStation) {
        stations[triggerStation]["stops"].forEach((train) => {
          let southStopsContainTrain = false;
          let northStopsContainTrain = false;

          if (southStops.has(train)) {
            southStopsContainTrain = true;
          }
          if (northStops.has(train)) {
            northStopsContainTrain = true;
          }
          northStops.delete(train);
          southStops.delete(train);

          if (southStopsContainTrain) {
            northStops.add(train);
          }
          if (northStopsContainTrain) {
            southStops.add(train);
          }
        });
      }
    })

    if (this.selectedTrains.length == 1) {
      const selectedTrain = this.selectedTrains[0];

      if (displayAccessibleOnly && elevatorOutages[stopId]) {
        return "stop-with-issues";
      }
      if (southStops.has(selectedTrain) && northStops.has(selectedTrain) && (!displayAccessibleOnly || (southAccessible && northAccessible))) {
        return "express-stop";
      }
      if (southStops.has(selectedTrain) && (!displayAccessibleOnly || southAccessible)) {
        return "all-downtown-trains";
      }
      if (northStops.has(selectedTrain) && (!displayAccessibleOnly || northAccessible)) {
        return "all-uptown-trains";
      }
      if (stations[stopId]["stops"].size == 0) {
        return "cross-15";
      }
      return "circle-15";
    }

    let passed = Array.from(stations[stopId].passed);
    let stationOverlapped = STATIONS_THAT_OVERLAP_EACH_OTHER[stopId];
    if (stationOverlapped) {
      passed = passed.concat(Array.from(stations[stationOverlapped].passed));
      passed = passed.filter((t) => !stations[stationOverlapped].stops.has(t));
    }

    if (stations[stopId]["stops"].size == 0) {
      return "cross-15";
    }
    if (displayAccessibleOnly && elevatorOutages[stopId]) {
      return "stop-with-issues";
    }
    if (passed.every((train) => southStops.has(train)) &&
      (passed.every((train) => northStops.has(train))) &&
      (!displayAccessibleOnly || (southAccessible && northAccessible))) {
      return "express-stop";
    }
    if (northStops.size == 0 || (displayAccessibleOnly && southAccessible && !northAccessible)) {
      if (passed.every((train) => southStops.has(train))) {
        return "all-downtown-trains";
      } else {
        return "downtown-only";
      }
    }
    if (southStops.size == 0 || (displayAccessibleOnly && !southAccessible && northAccessible)) {
      if (passed.every((train) => northStops.has(train))) {
        return "all-uptown-trains";
      } else {
        return "uptown-only";
      }
    }
    if (passed.every((train) => southStops.has(train)) && (!displayAccessibleOnly || (southAccessible && northAccessible))) {
      return "downtown-all-trains";
    }
    if (passed.every((train) => northStops.has(train)) && (!displayAccessibleOnly || (southAccessible && northAccessible))) {
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
            top: (width >= Responsive.onlyTablet.minWidth) ? 200 : 140,
            right: (width >= Responsive.onlyTablet.minWidth) ? 60 : 30,
            left: (width >= Responsive.onlyTablet.minWidth) ? 480 : 30,
            bottom: (width >= Responsive.onlyTablet.minWidth) ? 100 : 0,
          },
          bearing: 29,
          maxZoom: 12.5,
        });
      }
    }
    this.showAll = false;
  }

  goToTrip(trip, direction, train) {
    const { width, arrivals } = this.state;

    this.selectTrip(trip, direction, train, (coords) => {
      if (coords[0]) {
        const bounds = coords.reduce((bounds, coord) => {
          return bounds.extend(coord);
        }, new mapboxgl.LngLatBounds(coords[0], coords[0]));

        this.map.fitBounds(bounds, {
          padding: {
            top: (width >= Responsive.onlyTablet.minWidth) ? 200 : 140,
            right: (width >= Responsive.onlyTablet.minWidth) ? 60 : 30,
            left: (width >= Responsive.onlyTablet.minWidth) ? 480 : 30,
            bottom: (width >= Responsive.onlyTablet.minWidth) ? 100 : 0,
          },
          bearing: 29,
          maxZoom: 12.5,
        });
      }
    });
    this.showAll = false;
  }

  selectTrip(trip, direction, train, callback) {
    this.selectedTrip = {
      id: trip,
      direction: direction,
      train: train
    };
    this.selectedTrains = [];
    this.selectedStations = [];
    this.renderStops();
    this.renderTrainPositions(callback);
    trainIds.forEach((t) => {
      const layerId = `${t}-train`;
      if (this.map.getLayer(layerId)) {
        this.map.setPaintProperty(layerId, 'line-opacity', 0.1);
      }

      Object.keys(statusColors).forEach((status) => {
        const l = `${layerId}-${status}`;
        if (this.map.getLayer(l)) {
          this.map.setPaintProperty(l, 'line-opacity', 0.1);
        }
      });
    });
  }

  selectTrain(train) {
    this.selectedTrains = [train];
    this.selectedStations = [];
    this.selectedTrip = null;
    this.renderStops();
    this.renderTrainPositions();
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
  }

  goToStations(selectedStations, includeTrains) {
    const { width } = this.state;
    const stationsData = selectedStations.map((s) => stations[s]);
    const selectedTrains = includeTrains ? trainIds.filter((t) => stationsData.some((station) => station.stops.has(t))) : [];

    this.selectedTrains = selectedTrains;
    this.selectedStations = selectedStations;
    this.selectedTrip = null;
    this.renderStops();
    this.renderTrainPositions();
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

    this.showAll = false;
  }

  resetView(coords, zoom, bearing) {
    if (this.showAll) {
      return;
    }

    if (coords && zoom) {
      this.map.easeTo({
        center: coords,
        zoom: zoom,
        bearing: (bearing === undefined) ? 29 : bearing,
      });
    } else {
      this.map.fitBounds(defaultBounds, { bearing: 29});
    }

    this.selectedTrains = trainIds;
    this.selectedStations = [];
    this.selectedTrip = null;

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
    this.renderTrainPositions();
    this.showAll = true;
  }

  handleRefresh = () => {
    clearInterval(this.dataTimer);
    this.fetchData();
    this.dataTimer = setInterval(this.fetchData.bind(this), 30000);
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
      displayLongHeadways: checked,
      loadFullInfo: true,
    }, () => {
      this.fetchData();
      if (this.mapLoaded) {
        this.map.moveLayer('Stops');
        this.map.moveLayer('TrainOutlines');
        this.map.moveLayer('TrainPositions');
      }
    });
    gtag('event', 'toggle', {
      'event_category': 'displayProblems',
      'event_label': checked.toString()
    });
  }

  handleDisplayDelaysToggle = (e, {checked}) => {
    this.setState({displayDelays: checked}, () => {
      this.renderOverlays();
      if (this.mapLoaded) {
        this.map.moveLayer('Stops');
        this.map.moveLayer('TrainOutlines');
        this.map.moveLayer('TrainPositions');
      }
    });
    gtag('event', 'toggle', {
      'event_category': 'displayDelays',
      'event_label': checked.toString()
    });
  }

  handleDisplaySlowSpeedsToggle = (e, {checked}) => {
    this.setState({displaySlowSpeeds: checked}, () => {
      this.renderOverlays();
      if (this.mapLoaded) {
        this.map.moveLayer('Stops');
        this.map.moveLayer('TrainOutlines');
        this.map.moveLayer('TrainPositions');
      }
    });
    gtag('event', 'toggle', {
      'event_category': 'displaySlowSpeeds',
      'event_label': checked.toString()
    });
  }

  handleDisplayLongHeadwaysToggle = (e, {checked}) => {
    this.setState({displayLongHeadways: checked}, () => {
      this.renderOverlays();
      if (this.mapLoaded) {
        this.map.moveLayer('Stops');
        this.map.moveLayer('TrainOutlines');
        this.map.moveLayer('TrainPositions');
      }
    });
    gtag('event', 'toggle', {
      'event_category': 'displayLongHeadways',
      'event_label': checked.toString()
    });
  }

  handleDisplayTrainPositionsToggle = (e, {checked}) => {
    this.setState({displayTrainPositions: checked}, () => {
      this.renderTrainPositions();
      if (this.mapLoaded) {
        this.map.moveLayer('Stops');

        this.map.moveLayer('TrainPositions');
      }
    });
    gtag('event', 'toggle', {
      'event_category': 'displayTrainPositions',
      'event_label': checked.toString()
    });
  }

  handleDisplayAccessibleOnlyToggle = (e, {checked}) => {
    this.setState({displayAccessibleOnly: checked}, () => {
      this.renderStops();
    });
    gtag('event', 'toggle', {
      'event_category': 'displayAccessibleOnly',
      'event_label': checked.toString()
    });
  }


  handleMountTrainDetails = (train, coords, zoom) => {
    if (!this.mapLoaded) {
      this.map.on('load', () => {
        this.goToTrain(train, coords, zoom);
      });
      return;
    }
    this.goToTrain(train, coords, zoom);
  }

  handleMountTripDetails = (trip, direction, train) => {
    if (!this.mapLoaded) {
      this.map.on('load', () => {
        this.goToTrip(trip, direction, train);
      });
      return;
    }
    this.goToTrip(trip, direction, train);
  }

  handleMountStationDetails = (station) => {
    if (!this.mapLoaded) {
      this.map.on('load', () => {
        this.goToStations([station], true);
      });
      return;
    }
    this.goToStations([station], true);
  }

  handleTrainList = () => {
    const hash = location.hash.substr(1).split('/');
    let coords = null;
    let zoom = null;
    let bearing = null;

    if (hash.length > 1) {
      const coordsArray = hash[0].split(',');
      if (coordsArray.length > 1) {
        coords = [coordsArray[1], coordsArray[0]];
        zoom = hash[1];
        bearing = hash[2];
      }
    }

    if (!this.mapLoaded) {
      this.map.on('load', () => {
        this.resetView(coords, zoom, bearing);
      });
      return;
    }
    this.resetView(coords, zoom, bearing);
  }

  handleStationList = (stations, includeTrains) => {
    if (!this.mapLoaded) {
      this.map.on('load', () => {
        if (stations && stations.length > 0) {
          this.goToStations(stations, includeTrains);
        } else {
          this.resetView();
        }
      });
      return;
    }
    if (stations && stations.length > 0) {
      this.goToStations(stations, includeTrains);
    } else {
      this.resetView();
    }
  }

  handleResetMap = () => {
    const center = this.map.getCenter();
    const zoom = this.map.getZoom();
    const bearing = this.map.getBearing();
    this.props.history.push(`/trains#${center.lat},${center.lng}/${zoom}/${bearing}`);
  }

  handleNearby = () => {
    this.geoControl.trigger();
  }

  handleRealignMap = () => {
    this.map.fitBounds(defaultBounds, { bearing: 29});
  }

  panes() {
    const { trains, geoLocation, accessibleStations, elevatorOutages, displayAccessibleOnly } = this.state;
    return [
      {
        menuItem: <Menu.Item as={Link} to='/trains' key='train' title='Trains'>Trains</Menu.Item>,
        render: () => <Tab.Pane attached={false} style={{padding: 0}}><TrainList trains={trains} handleOnMount={this.handleTrainList} infoBox={this.infoBox} /></Tab.Pane>,
      },
      {
        menuItem: <Menu.Item as={Link} to='/stations' key='stations' title='Stations'>Stations</Menu.Item>,
        render: () => <Tab.Pane attached={false} style={{padding: 0}}><StationList stations={stations} trains={trains} accessibleStations={accessibleStations} elevatorOutages={elevatorOutages} displayAccessibleOnly={displayAccessibleOnly} handleOnMount={this.handleStationList} infoBox={this.infoBox} /></Tab.Pane>,
      },
      {
        menuItem: <Menu.Item as={Link} to='/starred' key='starred' title='Starred Stations'><Icon name='star' style={{margin: 0}} /></Menu.Item>,
        render: () => <Tab.Pane attached={false} style={{padding: 0}}><StationList stations={stations} trains={trains} accessibleStations={accessibleStations} elevatorOutages={elevatorOutages} displayAccessibleOnly={displayAccessibleOnly} handleOnMount={this.handleStationList} infoBox={this.infoBox} starred={true} /></Tab.Pane>,
      },
      {
        menuItem: <Menu.Item as={Link} to='/nearby' key='nearby' title='Nearby Stations'><Icon name='location arrow' style={{margin: 0}} /></Menu.Item>,
        render: () => <Tab.Pane attached={false} style={{padding: 0}}><StationList stations={stations} geoLocation={geoLocation} trains={trains} accessibleStations={accessibleStations} displayAccessibleOnly={displayAccessibleOnly} elevatorOutages={elevatorOutages}  handleOnMount={this.handleStationList} handleNearby={this.handleNearby} infoBox={this.infoBox} nearby={true} /></Tab.Pane>,
      },
      {
        menuItem: <Menu.Item as={Link} to='/advisories' key='advisories' title='Advisories'><Icon name='warning sign' style={{margin: 0}} /></Menu.Item>,
        render: () => <Tab.Pane attached={false} style={{padding: 0}}><StationList stations={stations} trains={trains} accessibleStations={accessibleStations} elevatorOutages={elevatorOutages} displayAccessibleOnly={displayAccessibleOnly} handleOnMount={this.handleStationList} infoBox={this.infoBox} advisories={true} /></Tab.Pane>,
      },
    ];
  }

  renderListings(index) {
    const { trains, displayProblems, displayDelays, displaySlowSpeeds, displayLongHeadways, displayTrainPositions, displayAccessibleOnly } = this.state;
    return (
      <div>
        <Helmet>
          <title>The Weekendest beta - Real-Time New York City Subway Map</title>
          <meta property="og:url" content="https://www.theweekendest.com" />
          <meta name="twitter:url" content="https://www.theweekendest.com" />
          <link rel="canonical" href="https://www.theweekendest.com" />
          <meta property="og:title" content="The Weekendest beta - Real-Time New York City Subway Map" />
          <meta name="twitter:title" content="The Weekendest beta - Real-Time New York City Subway Map" />
          <meta name="Description" content="Real-time map for the New York City subway. Check for planned service changes, up-to-date train routing, and real-time arrival times." />
          <meta property="og:description" content="Real-time map for the New York City subway. Check for planned service changes, up-to-date train routing, and real-time arrival times." />
          <meta name="twitter:description" content="Real-time map for the New York City subway. Check for planned service changes, up-to-date train routing, and real-time arrival times." />
        </Helmet>
        <Responsive {...Responsive.onlyMobile} as={Segment} className="mobile-top-bar" style={{padding: 0}}>
          <div className='mobile-details-header'>
            <Header as='h4' style={{flexGrow: 1, margin: "14px"}}>
              Information
            </Header>
            <LegendModal trigger={
              <Button icon title="Display legend" style={{float: "right"}}>
                <Icon name='list alternate outline' />
              </Button>
            } />
            <Button icon title="Center map" onClick={this.handleRealignMap} style={{float: "right"}}>
              <Icon name='crosshairs' />
            </Button>
          </div>
          <div style={{margin: "14px"}}>
            <OverlayControls displayProblems={displayProblems} displayDelays={displayDelays} displaySlowSpeeds={displaySlowSpeeds}
                  displayLongHeadways={displayLongHeadways} displayTrainPositions={displayTrainPositions} displayAccessibleOnly={displayAccessibleOnly}
                  handleDisplayProblemsToggle={this.handleDisplayProblemsToggle} handleDisplayAccessibleOnlyToggle={this.handleDisplayAccessibleOnlyToggle}
                  handleDisplayDelaysToggle={this.handleDisplayDelaysToggle} handleDisplaySlowSpeedsToggle={this.handleDisplaySlowSpeedsToggle}
                  handleDisplayLongHeadwaysToggle={this.handleDisplayLongHeadwaysToggle}
                  handleDisplayTrainPositionsToggle={this.handleDisplayTrainPositionsToggle} />
          </div>
        </Responsive>
        <Responsive minWidth={Responsive.onlyTablet.minWidth} as={Segment}>
          <Grid>
            <Grid.Column width={3}>
              <div className='display-legend'>
                <LegendModal trigger={
                  <Button icon title="Display legend">
                    <Icon name='list alternate outline' />
                  </Button>
                } />
              </div>
              <div>
                <Button icon title="Center map" onClick={this.handleRealignMap}>
                  <Icon name='crosshairs' />
                </Button>
              </div>
            </Grid.Column>
            <Grid.Column width={13}>
              <OverlayControls displayProblems={displayProblems} displayDelays={displayDelays} displaySlowSpeeds={displaySlowSpeeds}
                displayLongHeadways={displayLongHeadways} displayTrainPositions={displayTrainPositions} displayAccessibleOnly={displayAccessibleOnly}
                handleDisplayProblemsToggle={this.handleDisplayProblemsToggle} handleDisplayAccessibleOnlyToggle={this.handleDisplayAccessibleOnlyToggle}
                handleDisplayDelaysToggle={this.handleDisplayDelaysToggle} handleDisplaySlowSpeedsToggle={this.handleDisplaySlowSpeedsToggle}
                handleDisplayLongHeadwaysToggle={this.handleDisplayLongHeadwaysToggle}
                handleDisplayTrainPositionsToggle={this.handleDisplayTrainPositionsToggle} />
            </Grid.Column>
          </Grid>
        </Responsive>
        <Segment className="selection-pane">
          { trains && trains.length > 1 &&
            <Tab menu={{secondary: true, pointing: true}} panes={this.panes()} activeIndex={index} />
          }
        </Segment>
      </div>
    )
  }

  render() {
    const { loading, trains, arrivals, routing, stops, timestamp, blogPost, accessibleStations, elevatorOutages,
      displayProblems, displayDelays, displaySlowSpeeds, displayLongHeadways, displayTrainPositions, displayAccessibleOnly } = this.state;
    return (
      <Responsive as='div' fireOnMount onUpdate={this.handleOnUpdate}>
        <div ref={el => this.mapContainer = el} className='mapbox'>
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
            <div className='yellow-bar'></div>
            <Header inverted as='h3' className='site-name' style={{float: "left", marginBottom: '2px'}}>
              <Link to='/'>
                The Weekendest<span id="alpha">beta</span>
              </Link>
              <Header.Subheader>
                Real-Time NYC Subway Map
              </Header.Subheader>
            </Header>
            <Button icon inverted disabled={loading} onClick={this.handleRefresh} title="Refresh" style={{float: 'right', margin: "5px 11px 0 0"}}>
              <Icon loading={loading} name='refresh' />
            </Button>
          </Responsive>
          <Responsive minWidth={Responsive.onlyTablet.minWidth} as='div'>
            <div className='yellow-bar'></div>
            <Header inverted as='h1' className='site-name' style={{float: 'left'}}>
              <Link to='/'>
                The Weekendest<span id="alpha">beta</span>
              </Link>
              <Header.Subheader>
                Real-Time New York City Subway Map
              </Header.Subheader>
            </Header>
            <Button icon inverted disabled={loading} onClick={this.handleRefresh} title="Refresh" style={{float: 'right', margin: "18px 9px 0 0"}}>
              <Icon loading={loading} name='refresh' />
            </Button>
          </Responsive>
          <div ref={el => this.infoBox = el} className="inner-infobox open">
            {
              trains.length > 1 &&
              <Switch>
                <Route path="/trains/:id?/:tripId?" render={(props) => {
                  if (props.match.params.id) {
                    if (arrivals && arrivals[props.match.params.id] && props.match.params.tripId) {
                      const tripId = props.match.params.tripId.replace('-', '..');
                      const trip = _.map(arrivals[props.match.params.id].trains, (d) => d.find((t) => t.id === tripId)).find(x => x);
                      const direction = Object.keys(arrivals[props.match.params.id].trains).find((d) => {
                        return arrivals[props.match.params.id].trains[d].includes(trip);
                      });

                      if (!trip || Object.keys(trip.times).length < 1) {
                        return (
                          <Redirect to={`/trains/${props.match.params.id}`} />
                        );
                      }
                      return (
                        <TripDetails trip={trip} trains={trains} stops={stops} direction={direction} stations={stations}
                          train={trains.find((train) => train.id == props.match.params.id)}
                          accessibleStations={accessibleStations}
                          elevatorOutages={elevatorOutages}
                          handleResetMap={this.handleResetMap}
                          handleOnMount={this.handleMountTripDetails} infoBox={this.infoBox}
                        />
                      );
                    } else {
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

                      return (
                        <TrainDetails routing={routing[props.match.params.id]} stops={stops} stations={stations}
                          accessibleStations={accessibleStations}
                          elevatorOutages={elevatorOutages}
                          train={trains.find((train) => train.id == props.match.params.id)} trains={trains}
                          displayProblems={displayProblems} displayDelays={displayDelays} displaySlowSpeeds={displaySlowSpeeds}
                          displayTrainPositions={displayTrainPositions} displayAccessibleOnly={displayAccessibleOnly}
                          displayLongHeadways={displayLongHeadways} handleDisplayProblemsToggle={this.handleDisplayProblemsToggle}
                          handleDisplayDelaysToggle={this.handleDisplayDelaysToggle} handleDisplaySlowSpeedsToggle={this.handleDisplaySlowSpeedsToggle}
                          handleDisplayLongHeadwaysToggle={this.handleDisplayLongHeadwaysToggle} handleDisplayAccessibleOnlyToggle={this.handleDisplayAccessibleOnlyToggle}
                          handleDisplayTrainPositionsToggle={this.handleDisplayTrainPositionsToggle}
                          handleResetMap={this.handleResetMap}
                          handleOnMount={this.handleMountTrainDetails} coords={coords} zoom={zoom} infoBox={this.infoBox}
                        />
                      );
                    }
                  } else {
                    return this.renderListings(0);
                  }
                }} />
                <Route path="/stations/:id?" render={(props) => {
                  if (props.match.params.id) {
                    return (
                      <StationDetails routings={routing} trains={trains} station={stations[props.match.params.id]} stations={stations}
                        arrivals={arrivals}
                        accessibleStations={accessibleStations}
                        elevatorOutages={elevatorOutages}
                        displayProblems={displayProblems} displayDelays={displayDelays} displaySlowSpeeds={displaySlowSpeeds}
                        displayTrainPositions={displayTrainPositions} displayAccessibleOnly={displayAccessibleOnly}
                        displayLongHeadways={displayLongHeadways} handleDisplayProblemsToggle={this.handleDisplayProblemsToggle}
                        handleDisplayDelaysToggle={this.handleDisplayDelaysToggle} handleDisplaySlowSpeedsToggle={this.handleDisplaySlowSpeedsToggle}
                        handleDisplayLongHeadwaysToggle={this.handleDisplayLongHeadwaysToggle} handleDisplayAccessibleOnlyToggle={this.handleDisplayAccessibleOnlyToggle}
                        handleDisplayTrainPositionsToggle={this.handleDisplayTrainPositionsToggle}
                        handleResetMap={this.handleResetMap}
                        handleOnMount={this.handleMountStationDetails} infoBox={this.infoBox}
                      />
                    )
                  } else {
                    return this.renderListings(1);
                  }
                }} />
                <Route path="/starred" render={() => {
                  return this.renderListings(2);
                }} />
                <Route path="/nearby" render={() => {
                  return this.renderListings(3);
                }} />
                <Route path="/advisories" render={() => {
                  return this.renderListings(4);
                }} />
                <Route render={() => <Redirect to="/trains" /> } />
              </Switch>
            }
            <Loader active={!(trains && trains.length)} />
            <Header inverted as='h5' floated='left' style={{margin: "10px 5px"}}>
              Last updated {timestamp && (new Date(timestamp)).toLocaleTimeString('en-US')}.<br />
              { blogPost &&
                <span>
                  Latest blog post: <a href={blogPost.link} target="_blank">{blogPost.title}</a>.<br />
                </span>
              }
              Powered by <a href='https://www.goodservice.io' target='_blank'>goodservice.io</a>.<br />
              Created by <a href='https://sunny.ng' target='_blank'>Sunny Ng</a>.<br />
              <a href='https://github.com/blahblahblah-/theweekendest' target='_blank'>Source code</a>.
            </Header>
            </div>
        </Segment>
      </Responsive>
    )
  }
}

export default withRouter(Mapbox)