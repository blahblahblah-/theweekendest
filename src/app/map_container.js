import React from 'react';
import { Map, Marker, Popup, TileLayer, CircleMarker, Polyline } from 'react-leaflet';
import stationData from '../data/stations.json';

const bounds = [[40.512764,-74.251961], [40.903125,-73.755405]]
const apiUrl = 'http://localhost:3000/api/routes';
const stations = {};

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
  }

  componentWillUnmount() {
    clearInterval(this.timer);
  }

  fetchData() {
    fetch(apiUrl)
      .then(response => response.json())
      .then(data => this.setState({routes: data.routes}))
  }

  renderStations() {
    return Object.values(stations).map(
      (station) => {
        return (
          <CircleMarker center={[station.latitude, station.longitude]} radius={2} color='#000000' key={station.stopId} />
        )
      }
    )
  }

  renderLines() {
    const {routes} = this.state;
    return Object.keys(routes).map(
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
            return (
              <Polyline positions={positions} color={route.color} opacity={0.5} offset={index * 10} key={route.name + "-" + routing[0] && routing[0].stopId}>
                <Popup>
                  <h3>{route.name} - Uptown</h3>
                  <ul>
                    {
                      routing.map(
                        (stopId) => {
                          const station = stations[stopId.substr(0, 3)];
                          return (
                            <li key={stopId}>station.name</li>
                          )
                        }
                      )
                    }
                  </ul>
                </Popup>
              </Polyline>
            )
          }
        )
        const south = route.routings.south.map(
          (routing) => {
            const positions = routing.map(
              (stopId) => {
                const station = stations[stopId.substr(0, 3)];
                return [station.latitude, station.longitude];
              }
            );
            return (
              <Polyline positions={positions} color={route.color} opacity={0.5} offset={index * 10} key={route.name + "-" + routing[0] && routing[0].stopId}>
                <Popup>
                  <h3>{route.name} - Downtown</h3>
                  <ul>
                    {
                      routing.map(
                        (stopId) => {
                          const station = stations[stopId.substr(0, 3)];
                          return (
                            <li key={stopId}>{station.name}</li>
                          )
                        }
                      )
                    }
                  </ul>
                </Popup>
              </Polyline>
            )
          }
        )
        return north.concat(south);
      }
    )
  }

  render() {
    return (
      <Map bounds={bounds} maxBounds={bounds} minZoom={11} style={{height: 700}}>
        {
          this.renderStations()
        }
        {
          this.renderLines()
        }
        <TileLayer
          attribution="Map tiles by <a href=&quot;http://stamen.com&quot;>Stamen Design</a>,
            under <a href=&quot;http://creativecommons.org/licenses/by/3.0&quot;>CC BY 3.0</a>.
            Data by <a href=&quot;http://openstreetmap.org&quot;>OpenStreetMap</a>,
            under <a href=&quot;http://www.openstreetmap.org/copyright&quot;>ODbL</a>."
          url="https://stamen-tiles-{s}.a.ssl.fastly.net/toner-lite/{z}/{x}/{y}.png"
        />
      </Map>
    )
  }
}

export default MapContainer