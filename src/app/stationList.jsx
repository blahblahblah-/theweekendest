import React from 'react';
import ReactDOM from 'react-dom';
import _ from 'lodash';
import { Search, Header, Segment, List } from "semantic-ui-react";
import TrainBullet from './trainBullet.jsx';

import Cross from "./icons/cross-15.svg";

const resultRenderer = ({ title }) => <Label content={title} />

class StationList extends React.Component {
  constructor(props) {
    super(props);
    const { stations } = this.props;
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
      return 0;
    });
    this.stationSearch = this.stations.map((station) => {
      station.title = station.name;
      station.description = station.description;
      return station;
    });
    this.state = { results: [], value: ''}
  }

  handleResultSelect = (e, { result }) => this.setState({ value: result.title })

  handleSearchChange = (e, { value }) => {
    this.setState({value});

    if (this.state.value.length < 1) return this.setState({results: []})

    const re = new RegExp(_.escapeRegExp(this.state.value), 'i')
    const isMatch = (result) => re.test(result.title)

    this.setState({
      results: _.filter(this.stationSearch, isMatch),
    })
  }

  render() {
    const { stations, trains } = this.props;
    const { value, results } = this.state;
    const trainMap = {};
    trains.forEach((train) => {
      trainMap[train.id] = train;
    });
    return (
      <div>
{/*        <Search
            onResultSelect={this.handleResultSelect}
            onSearchChange={this.handleSearchChange}
            results={results}
            value={value}
            resultRenderer={resultRenderer}
        />*/}
        <List divided relaxed selection>
          {
            this.stations.map((stop) => {
              return(
                <List.Item key={stop.id} className='station-list-item'>
                  <List.Content floated='left'>
                    <Header as='h5'>
                      { stop.name.replace(/ - /g, "–") }
                    </Header>
                  </List.Content>
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