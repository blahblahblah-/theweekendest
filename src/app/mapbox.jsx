import React from 'react';
import ReactDOM from 'react-dom';
import mapboxgl from 'mapbox-gl';
import { Responsive, Header, Segment, Statistic, Tab, Button, Loader, Icon } from "semantic-ui-react";
import TrainList from './trainList.jsx';
import TrainDetails from './trainDetails.jsx';
import StationList from './stationList.jsx';
import StationDetails from './stationDetails.jsx';

import stationData from '../data/station_details.json';
import transfers from '../data/transfers.json';

import Circle from "./icons/circle-15.svg";
import ExpressStop from "./icons/express-stop.svg";
import UptownAllTrains from "./icons/uptown-all-trains.svg";
import DowntownOnly from "./icons/downtown-only.svg";

const apiUrl = 'https://www.goodservice.io/api/routes';
const statusUrl = 'https://www.goodservice.io/api/info'
const stations = {};
const stationLocations = {}
const center = [-74.003683, 40.7079445]
const trainIds = [
  '2', '3', '1', '4', '5', '6', '6X', '7', '7X', 'A', 'C', 'E', 'F', 'FX',
  'D', 'B', 'M', 'J', 'Z', 'R', 'N', 'Q', 'W', 'G', 'H', 'FS', 'GS', "L", "SI"
];

mapboxgl.accessToken = process.env.MAPBOX_TOKEN;

class Mapbox extends React.Component {
  constructor(props) {
    super(props);
    this.state = {trains: {}, activeIndex: 0, openMobilePane: true};
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
  }
  
  componentDidMount() {
    this.map = new mapboxgl.Map({
      container: this.mapContainer,
      style: 'mapbox://styles/theweekendest/ck1fhati848311cp6ezdzj5cm',
      center: center,
      bearing: 29,
      minZoom: 9,
      zoom: 12,
      hash: true
    });

    this.map.addControl(new mapboxgl.NavigationControl(), "bottom-right");
    this.map.addControl(new mapboxgl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true
      },
      trackUserLocation: true
    }), 'bottom-right');

    this.map.on('load', () => {
      this.fetchData();
      this.timer = setInterval(() => this.fetchData(), 360000);
    });
  }

  fetchData() {
    fetch(apiUrl)
      .then(response => response.json())
      .then(data => {
        this.renderLines(data.routes);
        this.setState({routing: data.routes, stops: data.stops});
      })
      .then(() => {
        const { selectedTrain } = this.state;
        this.renderStops(selectedTrain);
      })

    fetch(statusUrl)
      .then(response => response.json())
      .then(data => this.setState({ trains: data.routes, timestamp: data.timestamp }))
  }

  renderLines(routes) {
    const { selectedTrain, selectedStation } = this.state;
    Object.keys(stationData).forEach((key) => {
      stations[key] = stationData[key];
      stations[key]["northStops"] = new Set();
      stations[key]["southStops"] = new Set();
      stations[key]["passed"] = new Set();
      stations[key]["stops"] = new Set();
    });

    const routeLayers = {};
    const routeStops = {}

    Object.keys(routes).forEach((key) => {
      const northStops = new Set();
      const southStops = new Set();
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
      const southRoutings = route.routings.south.filter((routing) => {
        return routing.every((stopId) => {
          return stopId.substr(3, 1) == 'S';
        })
      }).map((routing) => {
        return routing.map((stopId) => {
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
      const routings = Array.from(new Set(allRoutings.map(JSON.stringify)), JSON.parse);

      const geojson = {
        "type": "FeatureCollection",
        "features": routings.map((routing) => {
          return this.routingGeoJson(routing)
        })
      };

      geojson.features.forEach((routing) => {
        routing.geometry.coordinates.forEach((coord) => {
          if (stationLocations[`${coord[0]}-${coord[1]}`]) {
            const stationId = stationLocations[`${coord[0]}-${coord[1]}`];
            stations[stationId]["passed"].add(key);
          }
        })
      });
      
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
    const offsetMap = [[[8, 0], [14, 0], [16, 0]], [[8, -2], [14, -4], [16, -6]], [[8, 2], [14, 4], [16, 6]], [[8, -4], [14, -8], [16, -12]], [[8, 4], [14, 8], [16, 12]], [[8, -6], [14, -12], [16, -18]], [[8, 6], [14, 12], [16, 18]]];
    const textOffsetMap = [[0, 0], [-1, 0], [1, 0], [-2, 0], [2, 0], [-3, 0], [3, 0]];

    trainIds.forEach((train) => {
      const layerId = `${train}-train`;
      const routeLayer = routeLayers[layerId];

      if (this.map.getLayer(layerId)) {
        this.map.removeLayer(layerId);
      }
      if (this.map.getSource(layerId)) {
        this.map.removeSource(layerId);
      }

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
        if (selectedTrain) {
          if (selectedTrain === train) {
            routeLayer.paint["line-opacity"] = 1;
          } else {
            routeLayer.paint["line-opacity"] = 0.1;
          }
        } else if (selectedStation) {
          const stationData = stations[selectedStation];

          if (!stationData.stops.has(train)) {
            this.map.setPaintProperty(layerId, 'line-opacity', 0.1);
          } else {
            this.map.setPaintProperty(layerId, 'line-opacity', 1);
          }
        } else {
          routeLayer.paint["line-opacity"] = 1;
        }

        if (this.map.getLayer(layerId)) {
          this.map.removeLayer(layerId)
        }
        if (this.map.getSource(layerId)) {
          this.map.removeSource(layerId);
        }
        this.map.addLayer(routeLayer);
        this.map.on('click', layerId, () => {
          this.selectTrain(train);
        });
        this.map.on('mouseenter', layerId, (() => {
          this.map.getCanvas().style.cursor = 'pointer';
        }).bind(this));
        this.map.on('mouseleave', layerId, (() => {
          this.map.getCanvas().style.cursor = '';
        }).bind(this));
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
          return results = stations[start]["north"][key].concat([[stations[key].longitude, stations[key].latitude]]).concat(path);
        }
        return results = [[stations[key].longitude, stations[key].latitude]].concat(path);
      }
    });
    return results;
  }

  renderStops(selectedTrain) {
    if (this.map.getLayer("Stops")) {
      this.map.removeLayer("Stops")
    }
    if (this.map.getSource("Stops")) {
      this.map.removeSource("Stops");
    }
    this.map.addSource("Stops", {
      "type": "geojson",
      "data": this.stopsGeoJson(selectedTrain)
    });
    this.map.addLayer({
      "id": "Stops",
      "type": "symbol",
      "source": "Stops",
      "layout": {
        "text-field": ['get', 'name'],
        "text-size": {
          "stops": [[8, 10], [13, 14]]
        },
        "text-font": ['Lato Regular', "Open Sans Regular","Arial Unicode MS Regular"],
        "text-anchor": "right",
        "text-optional": true,
        "text-justify": "left",
        "text-padding": 10,
        "icon-image": ['get', 'stopType'],
        "icon-size": {
          "stops": [[8, 0.25], [12, 0.75], [14, 1]]
        },
        "icon-allow-overlap": true,
      },
      "paint": {
        "text-translate": {
          "stops": [[8, [-5, 0]], [14, [-12, -15]]]
        },
        "text-color": "#aaaaaa",
        "icon-opacity": ['get', 'opacity']
      }
    });
    this.map.on('click', "Stops", (e) => {
      this.handleStationSelect(e.features[0].properties.id);
    });
    this.map.on('mouseenter', 'Stops', (() => {
      this.map.getCanvas().style.cursor = 'pointer';
    }).bind(this));
    this.map.on('mouseleave', 'Stops', (() => {
      this.map.getCanvas().style.cursor = '';
    }).bind(this));
  }

  stopsGeoJson(selectedTrain) {
    return {
      "type": "FeatureCollection",
      "features": Object.keys(stations).map((key) => {
        let opacity = 1;
        if (selectedTrain && !stations[key].stops.has(selectedTrain)) {
          opacity = 0.3;
        }
        return {
          "type": "Feature",
          "properties": {
            "id": stations[key].id,
            "name": stations[key].name.replace(/ - /g, "–"),
            "stopType": this.stopTypeIcon(key, selectedTrain),
            "opacity": opacity
          },
          "geometry": {
            "type": "Point",
            "coordinates": [stations[key].longitude, stations[key].latitude]
          }
        }
      })
    };
  }

  stopTypeIcon(stopId, selectedTrain) {
    if (selectedTrain) {
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

  handleTrainSelect = (train) => {
    const { width } = this.state;
    this.selectTrain(train);

    const data = this.map.getSource(`${train}-train`)._data;
    const coordinatesArray = data.features.map((feature) => feature.geometry.coordinates);
    const bounds = coordinatesArray.flat().reduce((bounds, coord) => {
      return bounds.extend(coord);
    }, new mapboxgl.LngLatBounds(coordinatesArray[0][0], coordinatesArray[0][0]));
 
    this.map.fitBounds(bounds, {
      padding: {
        top: (width > Responsive.onlyTablet.minWidth) ? 20 : 140,
        right: 20,
        left: (width > Responsive.onlyTablet.minWidth) ? 400 : 20,
        bottom: 20,
      },
    });

    this.closeMobilePane();
    this.infoBox.scrollTop = 0;
  }

  selectTrain(train) {
    const { selectedTrain, selectedStation } = this.state;
    if (selectedTrain || selectedStation) {
      this.setState({selectedTrain: train, selectedStation: null});
    } else {
      this.setState({selectedTrain: train, selectedStation: null, lastView: window.location.hash});
    }
    trainIds.forEach((t) => {
      const layerId = `${t}-train`;
      if (this.map.getLayer(layerId)) {
        if (t !== train) {
          this.map.setPaintProperty(layerId, 'line-opacity', 0.1);
        } else {
          this.map.setPaintProperty(layerId, 'line-opacity', 1);
        }
      }
    });
    this.renderStops(train);
    this.closeMobilePane();
  }

  handleStationSelect = (station) => {
    const { selectedStation, selectedTrain } = this.state;
    const stationData = stations[station];
    if (selectedTrain || selectedStation) {
      this.setState({selectedStation: station, selectedTrain: null});
    } else {
      this.setState({selectedStation: station, selectedTrain: null, lastView: window.location.hash});
    }
    trainIds.forEach((t) => {
      const layerId = `${t}-train`;
      if (this.map.getLayer(layerId)) {
        if (!stationData.stops.has(t)) {
          this.map.setPaintProperty(layerId, 'line-opacity', 0.1);
        } else {
          this.map.setPaintProperty(layerId, 'line-opacity', 1);
        }
      }
    });
    this.renderStops(null);
    this.map.easeTo({
      center: [stationData.longitude, stationData.latitude],
      zoom: 14,
      bearing: 29,
    });
    this.openMobilePane();
    this.infoBox.scrollTop = 0;
  }

  handleResetView = _ => {
    const { lastView } = this.state;
    this.setState({selectedTrain: null, selectedStation: null, lastView: null});
    trainIds.forEach((t) => {
      const layerId = `${t}-train`;
      if (this.map.getLayer(layerId)) {
        this.map.setPaintProperty(layerId, 'line-opacity', 1);
      }
    });
    this.infoBox.scrollTop = 0;
    this.openMobilePane();
    this.renderStops(null);
    window.location.hash = lastView;
  }

  handleTabChange = (e, { activeIndex }) => this.setState({ activeIndex })

  handleToggleMobilePane = _ => {
    const { openMobilePane } = this.state;
    this.infoBox.scrollTop = 0;
    if (openMobilePane) {
      this.infoBox.classList.remove('open');
    } else {
      this.infoBox.classList.add('open');
    }
    this.setState({openMobilePane: !openMobilePane});
  };

  handleOnUpdate = (e, { width }) => this.setState({ width })

  closeMobilePane() {
    this.infoBox.classList.remove('open');
    this.setState({openMobilePane: false});
  }

  openMobilePane() {
    this.infoBox.classList.add('open');
    this.setState({openMobilePane: true});
  }

  panes() {
    const { trains } = this.state;
    return [
      {
        menuItem: 'Trains',
        render: () => <Tab.Pane attached={false} style={{padding: 0}}><TrainList trains={trains} onTrainSelect={this.handleTrainSelect.bind(this)} /></Tab.Pane>,
      },
      {
        menuItem: 'Stations',
        render: () => <Tab.Pane attached={false} style={{padding: 0}}><StationList onStationSelect={this.handleStationSelect.bind(this)} stations={stations} trains={trains} /></Tab.Pane>,
      },
    ];
  }

  render() {
    const { trains, selectedTrain, selectedStation, routing, stops, activeIndex, timestamp, openMobilePane } = this.state;
    return (
      <Responsive as='div' onUpdate={this.handleOnUpdate}>
        <div ref={el => this.mapContainer = el}
          style={{top: 0, bottom: 0, left: 0, right: 0, position: "absolute"}}>
        </div>
        <Segment inverted vertical className="infobox">
          <Responsive as={Button} maxWidth={Responsive.onlyTablet.minWidth} icon className="mobile-pane-control" onClick={this.handleToggleMobilePane}>
            <Icon name={`angle ${openMobilePane ? 'up' : 'down'}`} />
          </Responsive>
          <Responsive {...Responsive.onlyMobile} as='div'>
            <Header inverted as='h3' color='yellow' style={{padding: "5px", float: "left"}}>
            the weekendest<span id="alpha">beta</span>
              <Header.Subheader>
                real-time new york city subway map
              </Header.Subheader>
            </Header>
          </Responsive>
          <Responsive minWidth={Responsive.onlyTablet.minWidth} as='div'>
            <Header inverted as='h1' color='yellow' style={{padding: "5px"}}>
            the weekendest<span id="alpha">beta</span>
              <Header.Subheader>
                real-time new york city subway map
              </Header.Subheader>
            </Header>
          </Responsive>
          <div ref={el => this.infoBox = el} className="inner-infobox open">
            { !selectedTrain && !selectedStation &&
              <div>
                <Responsive {...Responsive.onlyMobile} as={Segment} className="mobile-top-bar">
                  <Header as='h4'>
                    information
                  </Header>
                  <Statistic.Group size='mini' style={{flexWrap: "nowrap", justifyContent: "space-around"}}>
                    <Statistic style={{flex: "1 1 0px", margin: "0 1em 1em"}}>
                      <Statistic.Value><ExpressStop style={{height: "15px", width: "15px"}} /></Statistic.Value>
                      <Statistic.Label style={{fontSize: "0.75em"}}>All trains</Statistic.Label>
                    </Statistic>
                    <Statistic style={{flex: "1 1 0px", margin: "0 1em 1em"}}>
                      <Statistic.Value><Circle style={{height: "15px", width: "15px"}} /></Statistic.Value>
                      <Statistic.Label style={{fontSize: "0.75em"}}>Some trains</Statistic.Label>
                    </Statistic>
                    <Statistic style={{flex: "1 1 0px", margin: "0 1em 1em"}}>
                      <Statistic.Value><UptownAllTrains style={{height: "15px", width: "15px"}} /></Statistic.Value>
                      <Statistic.Label style={{fontSize: "0.75em"}}>All uptown, some dntwn</Statistic.Label>
                    </Statistic>
                    <Statistic style={{flex: "1 1 0px", margin: "0 1em 1em"}}>
                      <Statistic.Value><DowntownOnly style={{height: "15px", width: "15px"}} /></Statistic.Value>
                      <Statistic.Label style={{fontSize: "0.75em"}}>Some dntwn, no uptown</Statistic.Label>
                    </Statistic>
                  </Statistic.Group>
                </Responsive>
                <Responsive minWidth={Responsive.onlyTablet.minWidth} as={Segment}>
                  <Header as='h4'>
                    stops
                  </Header>
                  <Statistic.Group size='mini' style={{flexWrap: "nowrap", justifyContent: "space-around"}}>
                    <Statistic style={{flex: "1 1 0px", margin: "0 1em 1em"}}>
                      <Statistic.Value><ExpressStop style={{height: "15px", width: "15px"}} /></Statistic.Value>
                      <Statistic.Label style={{fontSize: "0.75em"}}>All trains</Statistic.Label>
                    </Statistic>
                    <Statistic style={{flex: "1 1 0px", margin: "0 1em 1em"}}>
                      <Statistic.Value><Circle style={{height: "15px", width: "15px"}} /></Statistic.Value>
                      <Statistic.Label style={{fontSize: "0.75em"}}>Some trains</Statistic.Label>
                    </Statistic>
                    <Statistic style={{flex: "1 1 0px", margin: "0 1em 1em"}}>
                      <Statistic.Value><UptownAllTrains style={{height: "15px", width: "15px"}} /></Statistic.Value>
                      <Statistic.Label style={{fontSize: "0.75em"}}>All uptown, some downtown</Statistic.Label>
                    </Statistic>
                    <Statistic style={{flex: "1 1 0px", margin: "0 1em 1em"}}>
                      <Statistic.Value><DowntownOnly style={{height: "15px", width: "15px"}} /></Statistic.Value>
                      <Statistic.Label style={{fontSize: "0.75em"}}>Some downtown, no uptown</Statistic.Label>
                    </Statistic>
                  </Statistic.Group>
                </Responsive>
                <Segment className="selection-pane">
                  <Loader active={!(trains && trains.length)} />
                  { trains && trains.length &&
                    <Tab menu={{secondary: true, pointing: true}} panes={this.panes()} activeIndex={activeIndex} onTabChange={this.handleTabChange} />
                  }
                </Segment>
              </div>
            }
            { selectedTrain && !selectedStation &&
              <TrainDetails routing={routing[selectedTrain]} stops={stops}
                train={trains.find((train) => train.id == selectedTrain)}
                onReset={this.handleResetView.bind(this)} onTrainSelect={this.handleTrainSelect.bind(this)}
                onStationSelect={this.handleStationSelect.bind(this)}
              />
            }
            { selectedStation && !selectedTrain &&
              <StationDetails trains={trains} station={stations[selectedStation]} stations={stations}
                onReset={this.handleResetView.bind(this)} onStationSelect={this.handleStationSelect.bind(this)}
                onTrainSelect={this.handleTrainSelect.bind(this)}
              />
            }
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

export default Mapbox