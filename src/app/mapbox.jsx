import React from 'react';
import ReactDOM from 'react-dom';
import mapboxgl from 'mapbox-gl';
import { Responsive, Header, Segment, Statistic, Tab, Button, Loader, Icon, Menu } from "semantic-ui-react";
import { BrowserRouter as Router, Route, Link, Switch, Redirect, withRouter } from "react-router-dom";
import { Helmet } from "react-helmet";
import { debounce, filter } from 'lodash';
import * as Cookies from 'es-cookie';

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

mapboxgl.accessToken = process.env.MAPBOX_TOKEN;

class Mapbox extends React.Component {
  constructor(props) {
    super(props);
    this.state = {trains: [], arrivals: {}};
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
    this.routings = [];
    this.routeStops = {};
    this.checksum = null;
    this.props.history.listen((location) => {
      gtag('config', 'UA-127585516-1', {'page_path': location.pathname});
    });
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
        [-74.8113, 40.3797],
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
          this.setState({routing: data.routes, stops: data.stops});
          this.processRoutings(data.routes);
        }
        this.checksum = data.checksum;
      })
  }

  fetchData() {
    fetch(statusUrl)
      .then(response => response.json())
      .then(data => this.setState({ trains: data.routes, timestamp: data.timestamp }));

    fetch(arrivalsUrl)
      .then(response => response.json())
      .then(data => this.setState({ arrivals: data.routes }));
  }

  processRoutings(routes) {
    Object.keys(stationData).forEach((key) => {
      stations[key] = stationData[key];
      stations[key]["northStops"] = new Set();
      stations[key]["southStops"] = new Set();
      stations[key]["passed"] = new Set();
      stations[key]["stops"] = new Set();
    });

    this.routings = [];
    this.routeStops = {};

    Object.keys(routes).forEach((key) => {
      const northStops = new Set();
      const southStops = new Set();
      const route = routes[key];
      this.routeStops[key] = new Set();
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
            this.routeStops[key].add(stopIdPrefix);
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
            this.routeStops[key].add(stopIdPrefix);
            southStops.add(stopIdPrefix);
          }
          return stopIdPrefix;
        }).filter((stopId) => {
          return stations[stopId];
        }).reverse();
      });
      const allRoutings = northRoutings.concat(southRoutings);
      this.routings[key] = Array.from(new Set(allRoutings.map(JSON.stringify)), JSON.parse);
    });
  }

  renderLines(selectedTrains, selectedStations) {
    const { routing } = this.state;
    const routeLayers = {};

    Object.keys(routing).forEach((key) => {
      const route = routing[key];
      const layerId = `${key}-train`;
      const geojson = {
        "type": "FeatureCollection",
        "features": this.routings[key].map((r) => {
          return this.routingGeoJson(r)
        })
      };

      geojson.features.forEach((r) => {
        r.geometry.coordinates.forEach((coord) => {
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

      if (routeLayer) {
        let offset = 0;
        let conflictingOffsets = new Set();
        const stops = this.routeStops[train];

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
        if (selectedTrains.includes(train)) {
          routeLayer.paint["line-opacity"] = 1;
        } else {
          routeLayer.paint["line-opacity"] = 0.1;
        }

        if (this.map.getLayer(layerId)) {
          this.map.removeLayer(layerId)
        }
        if (this.map.getSource(layerId)) {
          this.map.removeSource(layerId);
        }
        this.map.addLayer(routeLayer);
        this.map.on('click', layerId, (e) => {
          this.debounceNavigate(`/trains/${train}/#${e.lngLat.lat},${e.lngLat.lng}/${e.target.style.z}`);
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

  navigate(path) {
    this.props.history.push(path);
  }

  debounceNavigate = _.debounce(this.navigate, 100, {
    'leading': true,
    'trailing': false
  });

  routingGeoJson(routing) {
    const r = routing.slice(0);
    let path = []
    let prev = r.splice(0, 1);
    r.forEach((stopId) => {
      path.push([stations[prev].longitude, stations[prev].latitude]);
      let potentialPath = this.findPath(prev, stopId, 0, []);
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

  findPath(start, end, stepsTaken, stopsVisited) {
    if (stopsVisited.includes(start)) {
      return;
    }
    stopsVisited.push(start);
    if (!stations[start] || !stations[start]["north"]) {
      console.log(start);
      return;
    }
    if (stations[start]["north"][end] != undefined) {
      if (stations[start]["north"][end].length) {
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
          return results = stations[start]["north"][key].concat([[stations[key].longitude, stations[key].latitude]]).concat(path);
        }
        return results = [[stations[key].longitude, stations[key].latitude]].concat(path);
      }
    });
    return results;
  }

  renderStops(selectedTrains, selectedStations) {
    if (this.map.getLayer("Stops")) {
      this.map.removeLayer("Stops")
    }
    if (this.map.getSource("Stops")) {
      this.map.removeSource("Stops");
    }
    this.map.addSource("Stops", {
      "type": "geojson",
      "data": this.stopsGeoJson(selectedTrains, selectedStations)
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

  stopsGeoJson(selectedTrains, selectedStations) {
    return {
      "type": "FeatureCollection",
      "features": Object.keys(stations).map((key) => {
        let opacity = 1;
        if (!selectedTrains.some((train) => stations[key].stops.has(train)) &&
            !selectedStations.includes(key)) {
          opacity = 0.1;
        } else if (selectedStations.length > 0 && !selectedStations.includes(key)) {
          opacity = 0.5;
        }
        return {
          "type": "Feature",
          "properties": {
            "id": stations[key].id,
            "name": stations[key].name.replace(/ - /g, "–"),
            "stopType": this.stopTypeIcon(key, selectedTrains),
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

  stopTypeIcon(stopId, selectedTrains) {
    if (selectedTrains.length == 1) {
      const selectedTrain = selectedTrains[0];

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
      const data = this.map.getSource(`${train}-train`)._data;
      const coordinatesArray = data.features.map((feature) => feature.geometry.coordinates);
      if (coordinatesArray[0]) {
        const bounds = coordinatesArray.flat().reduce((bounds, coord) => {
          return bounds.extend(coord);
        }, new mapboxgl.LngLatBounds(coordinatesArray[0][0], coordinatesArray[0][0]));

        this.map.fitBounds(bounds, {
          padding: {
            top: (width >= Responsive.onlyTablet.minWidth) ? 20 : 140,
            right: 20,
            left: (width >= Responsive.onlyTablet.minWidth) ? 400 : 20,
            bottom: 20,
          },
        });
      }
    }

    this.closeMobilePane();
    this.infoBox.scrollTop = 0;
    this.showAll = false;
  }

  selectTrain(train) {
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
    this.renderLines([train], []);
    this.renderStops([train], []);
    this.closeMobilePane();
  }

  goToStations(selectedStations, includeTrains) {
    const { width } = this.state;
    const stationsData = selectedStations.map((s) => stations[s]);
    const selectedTrains = includeTrains ? trainIds.filter((t) => stationsData.some((station) => station.stops.has(t))) : [];

    trainIds.forEach((t) => {
      const layerId = `${t}-train`;
      if (this.map.getLayer(layerId)) {
        if (!stationsData.some((station) => station.stops.has(t))) {
          this.map.setPaintProperty(layerId, 'line-opacity', 0.1);
        } else {
          this.map.setPaintProperty(layerId, 'line-opacity', 1);
        }
      }
    });
    this.renderLines(selectedTrains, selectedStations);
    this.renderStops(selectedTrains, selectedStations);

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
          right: 20,
          left: (width >= Responsive.onlyTablet.minWidth) ? 400 : 20,
          bottom: 20,
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
    this.renderLines(trainIds, []);
    this.renderStops(trainIds, []);
    this.showAll = true;
  }

  handleToggleMobilePane = _ => {
    this.infoBox.scrollTop = 0;
    this.infoBox.classList.toggle('open');
  };

  handleOnUpdate = (e, { width }) => this.setState({ width })

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
          { trains && trains.length > 1 &&
            <Tab menu={{secondary: true, pointing: true}} panes={this.panes()} activeIndex={index} />
          }
        </Segment>
      </div>
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
                    this.openMobilePane();
                    return this.renderListings(0);
                  }
                }
              }} />
              <Route path="/stations/:id?" render={(props) => {
                if (trains.length > 1) {
                  this.openMobilePane();
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