import React from 'react';
import ReactDOM from 'react-dom';
import _ from 'lodash';
import { Header, Segment, List, Input } from "semantic-ui-react";
import { Link } from "react-router-dom";
import * as Cookies from 'es-cookie';

import TrainBullet from './trainBullet.jsx';

import Cross from "./icons/cross-15.svg";

const resultRenderer = ({ title }) => <Label content={title} />

class StationList extends React.Component {
  constructor(props) {
    super(props);
    const { stations } = this.props;
    // Sort by numbers first before alpha
    this.stations = Object.values(stations).sort((a, b) => {
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
    this.state = {stationsDisplayed: this.stations};
  }

  componentDidMount() {
    this.filterByStars();
  }

  componentDidUpdate(prevProps) {
    if (this.props.starred !== prevProps.starred) {
      this.filterByStars();
    }
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

  filterByStars() {
    const { starred } = this.props;

    if (!starred) {
      this.setState({ stationsDisplayed: this.stations });
      return;
    }

    const favs = Cookies.get('favs') && Cookies.get('favs').split(",") || [];
    const func = (result) => favs.includes(result.id)
    this.setState({
      stationsDisplayed: _.filter(this.stations, func),
    })
  }

  handleChange = (e, data) => {
    if (data.value.length < 1) {
      return this.setState({stationsDisplayed: this.stations});
    }

    setTimeout(() => {
      const re = new RegExp(_.escapeRegExp(data.value), 'i')
      const isMatch = (result) => re.test(result.name)

      this.setState({
        stationsDisplayed: _.filter(this.stations, isMatch),
      })
    }, 300);
  }

  renderListItem(station, trainMap) {
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
          </Header>
        </List.Content>
        <List.Content floated='right'>
          {
            Array.from(station.stops).sort().map((trainId) => {
              const train = trainMap[trainId];
              return (
                <TrainBullet id={trainId} key={train.name} name={train.name} color={train.color}
                  textColor={train.text_color} size='small' key={train.id} />
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
    const { stations, trains, starred, advisories } = this.props;
    const { stationsDisplayed } = this.state;
    const trainMap = {};
    const stationsWithoutService = advisories && this.stationsWithoutService();
    const stationsWithOneWayService = advisories && this.stationsWithOneWayService();

    trains.forEach((train) => {
      trainMap[train.id] = train;
    });
    return (
      <div>
        { !starred && !advisories &&
          <Input icon='search' placeholder='Search...' onChange={this.handleChange} className="station-search" />
        }
        {
          !advisories &&
          <List divided relaxed selection style={{marginTop: 0}}>
            {
              stationsDisplayed && stationsDisplayed.map((station) => {
                return this.renderListItem(station, trainMap);
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
        }
        { advisories &&
          <div>
            {
              stationsWithoutService &&
              <div>
                <Header as='h4' attached='top' inverted className='advisories-header'>
                  Stations with no service
                </Header>
                <List divided relaxed selection attached="true" style={{marginTop: 0}}>
                  {
                    stationsWithoutService.map((station) => {
                      return this.renderListItem(station, trainMap);
                    })
                  }
                </List>
              </div>
            }
            {
              stationsWithOneWayService &&
              <div>
                <Header as='h4' attached='top' inverted className='advisories-header'>
                  Stations with one-way service only
                </Header>
                <List divided relaxed selection attached="true" style={{marginTop: 0}}>
                  {
                    stationsWithOneWayService.map((station) => {
                      return this.renderListItem(station, trainMap);
                    })
                  }
                </List>
              </div>
            }
            {
              !stationsWithoutService && !stationsWithOneWayService &&
              <Header as='h4' style={{margin: "0.5em" }}>
                No advisories at this time, yay!
              </Header>
            }
          </div>
        }
      </div>
    );
  }
}

export default StationList