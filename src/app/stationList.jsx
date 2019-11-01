import React from 'react';
import ReactDOM from 'react-dom';
import _ from 'lodash';
import { Header, Segment, List, Input } from "semantic-ui-react";
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

  handleClick = stop => {
    const { onStationSelect } = this.props;
    onStationSelect(stop.id);
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

  render() {
    const { stations, trains } = this.props;
    const { stationsDisplayed } = this.state;
    const trainMap = {};
    trains.forEach((train) => {
      trainMap[train.id] = train;
    });
    return (
      <div>
        <Input icon='search' placeholder='Search...' onChange={this.handleChange} className="station-search" />
        <List divided relaxed selection style={{marginTop: 0}}>
          {
            stationsDisplayed && stationsDisplayed.map((stop) => {
              return(
                <List.Item key={stop.id} className='station-list-item' onClick={this.handleClick.bind(this, stop)}>
                  <List.Content floated='left' style={{marginRight: "0.5em"}}>
                    <Header as='h5'>
                      { stop.name.replace(/ - /g, "–") }
                    </Header>
                  </List.Content>
                  { stop.secondary_name &&
                    <List.Content floated='left' className="secondary-name">
                      { stop.secondary_name }
                    </List.Content>
                  }
                  <List.Content floated='right'>
                    {
                      Array.from(stop.stops).sort().map((trainId) => {
                        const train = trainMap[trainId];
                        return (
                          <TrainBullet link={true} id={trainId} key={train.name} name={train.name} color={train.color}
                            textColor={train.text_color} size='small' key={train.id} />
                        )
                      })
                    }
                    {
                      stop.stops.size === 0 &&
                      <Cross style={{height: "21px", width: "21px", margin: "3.5px 1px 3.5px 3.5px"}} />
                    }
                  </List.Content>
                </List.Item>
              )
            })
          }
        </List>
      </div>
    );
  }
}

export default StationList