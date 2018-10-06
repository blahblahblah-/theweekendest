import React from 'react';
import L from 'leaflet';
import stationData from '../data/stations.json';

const bounds = [[40.512764,-74.251961], [40.903125,-73.755405]]
const apiUrl = 'https://www.goodservice.io/api/routes';
const stations = {};
const center = [40.7079445, -74.003683]

class MapContainer extends React.Component {
  constructor(props) {
    super(props);
    this.state = {routes: {}};
    stationData.forEach((station) => {
      stations[station.stopId] = station;
    });
  }

  componentDidMount() {
    this.fetchData();
    this.timer = setInterval(() => this.fetchData(), 60000);
    // create map
    this.map = L.map('map', {
      center: center,
      maxBounds: bounds,
      zoom: 11,
      layers: [
        L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/toner/{z}/{x}/{y}.png', {
          attribution: 'Map tiles by <a href=&quot;http://stamen.com&quot;>Stamen Design</a>,\
            under <a href=&quot;http://creativecommons.org/licenses/by/3.0&quot;>CC BY 3.0</a>.\
            Data by <a href=&quot;http://openstreetmap.org&quot;>OpenStreetMap</a>,\
            under <a href=&quot;http://www.openstreetmap.org/copyright&quot;>ODbL</a>.'
        }),
      ]
    });
    this.linesLayer = L.layerGroup().addTo(this.map);
    this.stationsLayer = L.layerGroup().addTo(this.map);
    this.renderStations();
  }

  componentWillUnmount() {
    clearInterval(this.timer);
  }

  fetchData() {
    fetch(apiUrl)
      .then(response => response.json())
      .then(data => this.renderLines(data.routes))
  }

  renderStations() {
    this.stationsLayer.clearLayers();
    Object.values(stations).forEach((station) =>
      L.circleMarker([station.latitude, station.longitude], { title: station.name, radius: 2, color: "#000000" }).addTo(this.stationsLayer)
    )
  }

  renderLines(routes) {
    this.linesLayer.clearLayers();
    return Object.keys(routes).forEach(
      (key, index) => {
        const route = routes[key]
        const north = route.routings.north.map(
          (routing) => {
            const positions = routing.map(
              (stopId) => {
                const station = stations[stopId.substr(0, 3)];
                return [station.latitude, station.longitude];
              }
            );
            const line = L.polyline(positions, {color: route.color, opacity: 0.3}).addTo(this.map);

            // const odd = (index % 2) ? -1 : 1;
            // const offset = (index / 2) * odd;
            // console.log(offset);
            // line.setOffset(offset);
          }
        )
        const south = route.routings.south.forEach(
          (routing) => {
            const positions = routing.map(
              (stopId) => {
                const station = stations[stopId.substr(0, 3)];
                return [station.latitude, station.longitude];
              }
            );
            const line = L.polyline(positions, {color: route.color, opacity: 0.3}).addTo(this.map);

            // const odd = (index % 2) ? -1 : 1;
            // const offset = (index / 2) * odd;
            // console.log(offset);
            // line.setOffset(offset);
          }
        )
      }
    )
  }

  render() {
    return (
      <div id="map" style={{height: "700px"}}></div>
    )
  }
}

export default MapContainer