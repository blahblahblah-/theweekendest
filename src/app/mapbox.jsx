import React from 'react';
import ReactDOM from 'react-dom';
import mapboxgl from 'mapbox-gl';
import { Header, Segment, Grid, Button, Icon } from "semantic-ui-react";
import stationData from '../data/station_details.json';

const bounds = [[-74.251961, 40.512764], [-73.755405, 40.903125]]
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
      maxBounds: bounds,
      zoom: 1.5,
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
      this.map.addLayer({
        "id": "Stops",
        "type": "symbol",
        "source": {
          "type": "geojson",
          "data": this.stopsGeoJson()
        },
        "layout": {
          'text-field': ['get', 'name'],
          'text-size': 12,
          'text-anchor': 'right',
          'text-optional': true,
        },
        "paint": {
          'text-color': "#aaaaaa"
        }
      })
      this.fetchData();
      this.timer = setInterval(() => this.fetchData(), 360000);
    });
  }

  stopsGeoJson() {
    return {
      "type": "FeatureCollection",
      "features": Object.keys(stations).map((key) => {
        return {
          "type": "Feature",
          "properties": {
            "name": stations[key].name
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
      stations[key]["northStops"] = [];
      stations[key]["southStops"] = [];
    });

    Object.keys(routes).forEach((key) => {
      const route = routes[key];
      const layerId = `${key}-train`;
      if (this.map.getLayer(layerId)) {
        this.map.removeLayer(layerId)
      }
      const northRoutings = route.routings.north.filter((routing) => {
        return routing.every((stopId) => {
          return stopId.substr(3, 1) == 'N';
        })
      }).map((routing) => {
        return routing.map((stopId) => {
          const stopIdPrefix = stopId.substr(0, 3);
          stations[stopIdPrefix].northStops.push(key);
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
          stations[stopIdPrefix].southStops.push(key);
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
      this.map.addLayer({
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
          'line-width': 3,
          'line-color': route.color
        }
      });
    });
  }

  routingGeoJson(routing) {
    let path = []
    let prev = routing.splice(0, 1);
    routing.forEach((stopId) => {
      path.push([stations[prev].longitude, stations[prev].latitude]);
      let potentialPath = this.findPath(prev, stopId);
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
      "geometry": {
        "type": "LineString",
        "coordinates": path
      }
    }
  }

  findPath(start, end) {
    if (stations[start]["north"][end] != undefined) {
      if (stations[start]["north"][end].length) {
        return stations[start]["north"][end];
      }
      return [[stations[end].longitude, stations[end].latitude]];
    }
    let results = [];
    Object.keys(stations[start]["north"]).forEach((key) => {
      const path = this.findPath(key, end);
      if (path && path.length) {
        if (stations[start]["north"][key].length) {
          results = stations[start]["north"][key].concat(path);
        }
        results = [[stations[key].longitude, stations[key].latitude]].concat(path);
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