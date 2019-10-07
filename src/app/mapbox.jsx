import React from 'react';
import ReactDOM from 'react-dom';
import mapboxgl from 'mapbox-gl';
import { Header, Segment, Grid, Button, Icon } from "semantic-ui-react";
import stationData from '../data/station_details.json';

const bounds = [[-74.3586, 41.2176], [-73.5183, 40.215]]
const apiUrl = 'https://www.goodservice.io/api/routes';
const stations = {};
const center = [-74.003683, 40.7079445]

mapboxgl.accessToken = process.env.MAPBOX_TOKEN;

class Mapbox extends React.Component {
  constructor(props) {
    super(props);
    this.state = {routes: {}};
    Object.keys(stationData).forEach((key) => {
      stations[key] = stationData[key];
      stations[key]["northStops"] = [];
      stations[key]["southStops"] = [];
    });
  }
  
  componentDidMount() {
    this.map = new mapboxgl.Map({
      container: this.mapContainer,
      style: 'mapbox://styles/theweekendest/ck1fhati848311cp6ezdzj5cm',
      center: center,
      // maxBounds: bounds,
      bearing: 29,
      minZoom: 9,
      zoom: 12,
      hash: true
    });

    this.map.addControl(new mapboxgl.NavigationControl());
    this.map.addControl(new mapboxgl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true
      },
      trackUserLocation: true
    }));

    this.map.on('load', () => {
      this.fetchData();
      this.timer = setInterval(() => this.fetchData(), 360000);
      this.map.addLayer({
        "id": "Stops",
        "type": "symbol",
        "source": {
          "type": "geojson",
          "data": this.stopsGeoJson()
        },
        "layout": {
          "text-field": ['get', 'name'],
          "text-size": {
            "stops": [[8, 12], [15, 14]]
          },
          "text-anchor": "right",
          "text-optional": true,
          "text-justify": "left",
          "text-padding": 10,
          // "text-variable-anchor": ['bottom-right', 'right', 'top-right', 'bottom', 'bottom-left', 'left', 'top-left']
        },
        "paint": {
          "text-translate": {
            "stops": [[8, [-5, 0]], [14, [-12, -15]]]
          },
          "text-color": "#aaaaaa"
        }
      })
    });
  }

  stopsGeoJson() {
    return {
      "type": "FeatureCollection",
      "features": Object.keys(stations).map((key) => {
        return {
          "type": "Feature",
          "properties": {
            "name": stations[key].name.replace(/ - /g, "–")
          },
          "geometry": {
            "type": "Point",
            "coordinates": [stations[key].longitude, stations[key].latitude]
          }
        }
      })
    };
  }

  fetchData() {
    fetch(apiUrl)
      .then(response => response.json())
      .then(data => this.renderLines(data.routes))
  }

  renderLines(routes) {
    Object.keys(stationData).forEach((key) => {
      stations[key] = stationData[key];
      stations[key]["northStops"] = new Set();
      stations[key]["southStops"] = new Set();
      stations[key]["stops"] = new Set();
    });

    const routeLayers = {};
    const routeStops = {}

    Object.keys(routes).forEach((key) => {
      const route = routes[key];
      const layerId = `${key}-train`;
      routeStops[key] = new Set();
      const northRoutings = route.routings.north.filter((routing) => {
        return routing.every((stopId) => {
          return stopId.substr(3, 1) == 'N';
        })
      }).map((routing) => {
        return routing.map((stopId) => {
          const stopIdPrefix = stopId.substr(0, 3);
          stations[stopIdPrefix].northStops.add(key);
          stations[stopIdPrefix].stops.add(key);
          routeStops[key].add(stopIdPrefix);
          return stopIdPrefix;
        });
      });
      const southRoutings = route.routings.south.filter((routing) => {
        return routing.every((stopId) => {
          return stopId.substr(3, 1) == 'S';
        })
      }).map((routing) => {
        return routing.map((stopId) => {
          const stopIdPrefix = stopId.substr(0, 3);
          stations[stopIdPrefix].southStops.add(key);
          stations[stopIdPrefix].stops.add(key);
          routeStops[key].add(stopIdPrefix);
          return stopIdPrefix;
        }).reverse();
      });
      const allRoutings = northRoutings.concat(southRoutings);
      const routings = Array.from(new Set(allRoutings.map(JSON.stringify)), JSON.parse);

      const geojson = {
        "type": "FeatureCollection",
        "features": routings.map((routing) => {
          return this.routingGeoJson(routing)
        })
      };
      routeLayers[layerId] = {
        "id": layerId,
        "type": "line",
        "source": {
          "type": "geojson",
          "data": geojson
        },
        "layout": {
          "line-join": "round",
          "line-cap": "round"
        },
        "paint": {
          'line-width': {
            'stops': [[8, 1], [14, 3], [16, 5]]
          },
          'line-color': route.color,
        }
      };
    });

    const offsets = {};
    const offsetMap = [[[8, 0], [14, 0], [16, 0]], [[8, -3], [14, -5], [16, -7]], [[8, 3], [14, 5], [16, 7]], [[8, -6], [14, -10], [16, -14]], [[8, 6], [14, 10], [16, 14]], [[8, -9], [14, -15], [16, -21]], [[8, 9], [14, 15], [16, 21]]];
    const textOffsetMap = [[0, 0], [-1, 0], [1, 0], [-2, 0], [2, 0], [-3, 0], [3, 0]];

    ['2', '3', '1', '4', '5', '6', '7', '7X', 'A', 'C', 'E', 'F', 'FX', 'D', 'B', 'M', 'J', 'Z', 'N', 'Q', 'R', 'W', 'G', 'H', 'FS', 'GS'].forEach((train) => {
      const layerId = `${train}-train`;
      const routeLayer = routeLayers[layerId];

      if (routeLayer) {
        let offset = 0;
        let conflictingOffsets = new Set();
        const stops = routeStops[train];

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
        routeLayer.paint["line-offset"] = {
          "stops": offsetMap[offset]
        };
        if (this.map.getLayer(layerId)) {
          this.map.removeLayer(layerId)
        }
        this.map.addLayer(routeLayer);
        // this.map.addLayer({
        //   "id": `${layerId}-symbol`,
        //   "type": "symbol",
        //   "source": {
        //     "type": "geojson",
        //     "data": routeLayer.source.data,
        //   },
        //   "layout": {
        //     "symbol-placement": "line",
        //     "text-font": ["Open Sans Regular"],
        //     "text-field": train,
        //     "text-size": 14,
        //     "text-rotation-alignment": "viewport",
        //     "text-offset": textOffsetMap[offset]
        //   },
        // });
      }
    });
  }

  routingGeoJson(routing) {
    let path = []
    let prev = routing.splice(0, 1);
    routing.forEach((stopId) => {
      path.push([stations[prev].longitude, stations[prev].latitude]);
      let potentialPath = this.findPath(prev, stopId, 0);
      if (potentialPath) {
        potentialPath.forEach((coord) => {
          path.push(coord);
        });
      }
      path.push([stations[stopId].longitude, stations[stopId].latitude]);
      prev = stopId;
    });
    return {
      "type": "Feature",
      "properties": {
        "active": true,
        "offset": 0,
      },
      "geometry": {
        "type": "LineString",
        "coordinates": path
      }
    }
  }

  findPath(start, end, stepsTaken) {
    if (stations[start]["north"][end] != undefined) {
      if (stations[start]["north"][end].length) {
        return stations[start]["north"][end];
      }
      return [[stations[end].longitude, stations[end].latitude]];
    } else if (stepsTaken > 8) {
      return;
    }
    let results = [];
    Object.keys(stations[start]["north"]).forEach((key) => {
      const path = this.findPath(key, end, stepsTaken + 1);
      if (path && path.length) {
        if (stations[start]["north"][key].length) {
          return results = stations[start]["north"][key].concat(path);
        }
        return results = [[stations[key].longitude, stations[key].latitude]].concat(path);
      }
    });
    return results;
  }

  render() {
    return (
      <div>
        <div ref={el => this.mapContainer = el} style={{top: 0, bottom: 0, left: 0, right: 0, position: "absolute"}}></div>
      </div>
    )
  }
}

export default Mapbox