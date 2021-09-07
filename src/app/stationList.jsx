import React from 'react';
import ReactDOM from 'react-dom';
import _ from 'lodash';
import { Header, Segment, List, Input, Icon } from "semantic-ui-react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import * as Cookies from 'es-cookie';
import * as turf from './vendor/turf.js';

import TrainBullet from './trainBullet.jsx';

import { accessibilityIcon } from './utils/accessibility.jsx';

import Cross from "./icons/cross-15.svg";

const resultRenderer = ({ title }) => <Label content={title} />

class StationList extends React.Component {
  constructor(props) {
    super(props);
    this.stations = [];

    this.state = { stationsDisplayed: [], query: '' };
  }

  componentDidMount() {
    this.updateMap();
    this.filterAndSortStations();
    this.queryInput?.focus();
  }

  componentDidUpdate(prevProps) {
    const { advisories, starred, nearby, displayAccessibleOnly } = this.props;
    if (starred !== prevProps.starred || advisories !== prevProps.advisories || nearby !== prevProps.nearby) {
      this.updateMap();
      this.setState({ query: '' });
      this.queryInput?.focus();
    }
    if (displayAccessibleOnly !== prevProps.displayAccessibleOnly) {
      this.filterAndSortStations();
    }
  }

  filterAndSortStations() {
    const { stations, displayAccessibleOnly, accessibleStations } = this.props;
    // Sort by numbers first before alpha
    this.stations = Object.values(stations).filter((station) => {
      return !displayAccessibleOnly || accessibleStations.north.includes(station.id) || accessibleStations.south.includes(station.id);
    }).sort((a, b) => {
      const matchA = a.name.match(/^(\d+)/g);
      const matchB = b.name.match(/^(\d+)/g);

      if (matchA && matchB) {
        const numA = Number(matchA[0]);
        const numB = Number(matchB[0]);

        if (numA < numB) {
          return -1;
        }
        if (numA > numB) {
          return 1;
        }
      }

      let nameA = a.name.toUpperCase();
      let nameB = b.name.toUpperCase();
      if (nameA < nameB) {
        return -1;
      }
      if (nameA > nameB) {
        return 1;
      }

      if (a.secondary_name && b.secondary_name) {
        const matchA = a.secondary_name.match(/^(\d+)/g);
        const matchB = b.secondary_name.match(/^(\d+)/g);

        if (matchA && matchB) {
          const numA = Number(matchA[0]);
          const numB = Number(matchB[0]);

          if (numA < numB) {
            return -1;
          }
          if (numA > numB) {
            return 1;
          }
        }

        let secondaryNameA = a.secondary_name.toUpperCase();
        let secondaryNameB = b.secondary_name.toUpperCase();
        if (secondaryNameA < secondaryNameB) {
          return -1;
        }
        if (secondaryNameA > secondaryNameB) {
          return 1;
        }
      }

      return 0;
    });
    this.setState({stationsDisplayed: this.stations}, this.updateMap);
  }

  updateMap() {
    const { handleOnMount, advisories, starred, nearby, infoBox, handleNearby } = this.props;
    if (advisories) {
      handleOnMount(this.stationsWithElevatorOutages().concat(this.stationsWithoutService().concat(this.stationsWithOneWayService())).map((s) => s.id), false);
    } else if (nearby) {
      handleNearby();
      handleOnMount([], true);
    } else {
      const starredStations = this.filterByStars();
      handleOnMount(starredStations.map((s) => s.id), true);
    }
    infoBox.classList.add('open');
    infoBox.scrollTop = 0;
  }

  stationsWithElevatorOutages() {
    const { elevatorOutages } = this.props;
    return _.filter(this.stations, (result) => elevatorOutages[result.id]);
  }

  stationsWithoutService() {
    return _.filter(this.stations, (result) => result.stops.size === 0);
  }

  stationsWithOneWayService() {
    return _.filter(this.stations, (result) => {
      return result.stops.size > 0 &&
        (result.northStops.size === 0 || result.southStops.size === 0 && result.id !== 'H01');
    });
  }

  stationsNearby() {
    const { geoLocation } = this.props;

    if (geoLocation) {
      const currentLocation = turf.helpers.point([geoLocation.longitude, geoLocation.latitude])
      const options = {units: 'miles'};
      const stations = this.stations.map((s) => {
        const stationLocation = turf.helpers.point([s.longitude, s.latitude]);
        s.distance = turf.distance(currentLocation, stationLocation, options);
        return s;
      });
      return _.filter(stations, (result) => result.distance <= 1.0).sort((a, b) => a.distance - b.distance).slice(0, 5);
    }
    return [];
  }

  filterByStars() {
    const { starred } = this.props;

    if (!starred) {
      this.setState({ stationsDisplayed: this.stations });
      return [];
    }

    const favs = Cookies.get('favs') && Cookies.get('favs').split(",") || [];
    const func = (result) => favs.includes(result.id)
    const filteredStations = _.filter(this.stations, func)
    this.setState({
      stationsDisplayed: filteredStations,
    })
    return filteredStations;
  }

  handleChange = (e, data) => {
    if (data.value.length < 1) {
      return this.setState({stationsDisplayed: this.stations, query: ''});
    }

    const query = data.value.replace(/[^0-9a-z]/gi, '').toUpperCase();

    this.setState({
      stationsDisplayed: this.stations.filter((station) =>
        station.name.replace(/[^0-9a-z]/gi, '').toUpperCase().indexOf(query) > -1 || station.secondary_name?.replace(/[^0-9a-z]/gi, '').toUpperCase().indexOf(query) > -1
      ),
      query: data.value,
    });
  }

  handleClear = (e) => {
    e.target.parentElement.children[0].value = '';
    this.setState({stationsDisplayed: this.stations, query: ''});
  };

  handleKeyUp = (e) => {
    if (e.key === "Escape") {
      e.target.value = '';
      this.setState({stationsDisplayed: this.stations, query: ''});
    }
  };

  renderListItem(station, trains) {
    const { accessibleStations, elevatorOutages } = this.props;
    return(
      <List.Item as={Link} key={station.id} className='station-list-item' to={`/stations/${station.id}`}>
        <List.Content floated='left' style={{marginRight: "0.5em"}}>
          <Header as='h5'>
            { station.name.replace(/ - /g, "–") }
            { station.secondary_name &&
              <span className='station-list-secondary-name'>
                {
                  station.secondary_name
                }
              </span>
            }
            { accessibilityIcon(accessibleStations, elevatorOutages, station.id) }
          </Header>
        </List.Content>
        <List.Content floated='right'>
          {
            Array.from(station.stops).sort().map((trainId) => {
              const train = trains[trainId];
              const directions = [];
              if (station.northStops.has(trainId)) {
                directions.push("north")
              }
              if (station.southStops.has(trainId)) {
                directions.push("south")
              }
              return (
                <TrainBullet id={trainId} key={train.name} name={train.name} color={train.color}
                  textColor={train.text_color} size='small' key={train.id} directions={directions} />
              )
            })
          }
          {
            station.stops.size === 0 &&
            <Cross style={{height: "21px", width: "21px", margin: "3.5px 1px 3.5px 3.5px"}} />
          }
        </List.Content>
      </List.Item>
    )
  }

  render() {
    const { stations, trains, starred, advisories, nearby } = this.props;
    const { stationsDisplayed, query } = this.state;
    const stationsWithoutService = advisories && this.stationsWithoutService();
    const stationsWithOneWayService = advisories && this.stationsWithOneWayService();
    const stationsWithElevatorOutages = advisories && this.stationsWithElevatorOutages();
    const stationsNearby = nearby && this.stationsNearby();
    const icon = query.length > 0 ? { name: 'close', link: true, onClick: this.handleClear} : 'search';
    return (
      <div>
        {
          !starred && !advisories && !nearby &&
          <div>
            <Input icon={icon} placeholder='Search...' onChange={this.handleChange} onKeyUp={this.handleKeyUp} ref={(input) => { this.queryInput = input; }} className="station-search" />
            <Helmet>
              <title>The Weekendest beta - Stations</title>
              <meta property="og:url" content="https://www.theweekendest.com/stations" />
              <meta name="twitter:url" content="https://www.theweekendest.com/stations" />
              <link rel="canonical" href="https://www.theweekendest.com/stations" />
              <meta property="og:title" content="The Weekendest beta - Stations" />
              <meta name="twitter:title" content="The Weekendest beta - Stations" />
              <meta name="Description" content="View New York City subway status, live arrival times and real-time routing by station." />
              <meta property="og:description" content="View New York City subway status, live arrival times and real-time routing by station." />
              <meta name="twitter:description" content="View New York City subway status, live arrival times and real-time routing by station." />
            </Helmet>
          </div>
        }
        {
          !advisories && !nearby &&
          <div>
            <List divided relaxed selection style={{marginTop: 0}}>
              {
                stationsDisplayed && stationsDisplayed.map((station) => {
                  return this.renderListItem(station, trains);
                })
              }
              {
                starred && stationsDisplayed.length == 0 &&
                <List.Item>
                  <List.Content>
                    Stations that are starred are displayed here.
                  </List.Content>
                </List.Item>
              }
            </List>
            <Helmet>
              <title>The Weekendest beta - Starred Stations</title>
              <meta property="og:url" content="https://www.theweekendest.com/starred" />
              <meta name="twitter:url" content="https://www.theweekendest.com/starred" />
              <link rel="canonical" href="https://www.theweekendest.com/starred" />
              <meta property="og:title" content="The Weekendest beta - Starred Stations" />
              <meta name="twitter:title" content="The Weekendest beta - Starred Stations" />
              <meta name="Description" content="Star your favorite New York City subway stations and view their trains' status, live arrival times and real-time routing." />
              <meta property="og:description" content="Star your favorite New York City subway stations and view their trains' status, live arrival times and real-time routing." />
              <meta name="twitter:description" content="Star your favorite New York City subway stations and view their trains' status, live arrival times and real-time routing." />
            </Helmet>
          </div>
        }
        {
          nearby &&
          <div>
            <List divided relaxed selection style={{marginTop: 0}}>
              {
                stationsNearby && stationsNearby.map((station) => {
                  return this.renderListItem(station, trains);
                })
              }
              {
                (!stationsNearby || stationsNearby.length === 0) &&
                <List.Item>
                  <List.Content>
                    No stations nearby. <Icon name='lemon outline' />
                  </List.Content>
                </List.Item>
              }
            </List>
            <Helmet>
              <title>The Weekendest beta - Nearby Stations</title>
              <meta property="og:url" content="https://www.theweekendest.com/nearby" />
              <meta name="twitter:url" content="https://www.theweekendest.com/nearby" />
              <link rel="canonical" href="https://www.theweekendest.com/nearby" />
              <meta property="og:title" content="The Weekendest beta - Nearby Stations" />
              <meta name="twitter:title" content="The Weekendest beta - Nearby Stations" />
              <meta name="Description" content="Find the New York City subway stations nearest you, and view their trains' status, live arrival times and real-time routing." />
              <meta property="og:description" content="Find the New York City subway stations nearest you, and view their trains' status, live arrival times and real-time routing." />
              <meta name="twitter:description" content="Find the New York City subway stations nearest you, and view their trains' status, live arrival times and real-time routing." />
            </Helmet>
          </div>
        }
        {
          advisories &&
          <div>
            {
              stationsWithoutService && stationsWithoutService.length > 0 &&
              <div>
                <Header as='h4' attached='top' inverted className='advisories-header'>
                  Stations with no service
                </Header>
                <List divided relaxed selection attached="true" style={{marginTop: 0}}>
                  {
                    stationsWithoutService.map((station) => {
                      return this.renderListItem(station, trains);
                    })
                  }
                </List>
              </div>
            }
            {
              stationsWithOneWayService && stationsWithOneWayService.length > 0 &&
              <div>
                <Header as='h4' attached='top' inverted className='advisories-header'>
                  Stations with one-way service only
                </Header>
                <List divided relaxed selection attached="true" style={{marginTop: 0}}>
                  {
                    stationsWithOneWayService.map((station) => {
                      return this.renderListItem(station, trains);
                    })
                  }
                </List>
              </div>
            }
            {
              stationsWithElevatorOutages && stationsWithElevatorOutages.length > 0 &&
              <div>
                <Header as='h4' attached='top' inverted className='advisories-header'>
                  Stations with elevator outages
                </Header>
                <List divided relaxed selection attached="true" style={{marginTop: 0}}>
                  {
                    stationsWithElevatorOutages.map((station) => {
                      return this.renderListItem(station, trains);
                    })
                  }
                </List>
              </div>
            }
            {
              (!stationsWithoutService || stationsWithoutService.length === 0) &&
              (!stationsWithOneWayService || stationsWithOneWayService.length === 0) &&
              (!stationsWithElevatorOutages || stationsWithElevatorOutages.length === 0) &&
              <Header as='h4' style={{margin: "0.5em" }}>
                No advisories at this time, yay!
              </Header>
            }
            <Helmet>
              <title>The Weekendest beta - Advisories</title>
              <meta property="og:url" content="https://www.theweekendest.com/advisories" />
              <meta name="twitter:url" content="https://www.theweekendest.com/advisories" />
              <link rel="canonical" href="https://www.theweekendest.com/advisories" />
              <meta property="og:title" content="The Weekendest beta - Advisories" />
              <meta name="twitter:title" content="The Weekendest beta - Advisories" />
              <meta name="Description" content="View in real-time which New York City subway stations are currently closed or have only one-way train service." />
              <meta property="og:description" content="View in real-time which New York City subway stations are currently closed or have only one-way train service." />
              <meta name="twitter:description" content="View in real-time which New York City subway stations are currently closed or have only one-way train service." />
            </Helmet>
          </div>
        }
      </div>
    );
  }
}

export default StationList