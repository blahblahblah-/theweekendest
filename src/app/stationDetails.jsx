import React from 'react';
import ReactDOM from 'react-dom';
import { Responsive, Button, Icon, Header, Segment, List } from "semantic-ui-react";
import TrainBullet from './trainBullet.jsx';

import Cross from "./icons/cross-15.svg";

// M train directions are reversed between Essex St and Myrtle Av to match with J/Z trains
const mTrainShuffle = ["M18", "M16", "M14", "M13", "M12", "M11"];

class StationDetails extends React.Component {
  statusColor(status) {
    if (status == 'Good Service') {
      return 'green';
    } else if (status == 'Service Change') {
      return 'orange';
    } else if (status == 'Not Good') {
      return 'yellow';
    } else if (status == 'Delay') {
      return 'red';
    }
  }

  handleBack = _ => {
    const { onReset } = this.props;
    onReset();
  }

  handleClick = stop => {
    const { onStationSelect } = this.props;
    onStationSelect(stop.id);
  }

  render() {
    const { stations, station, trains, onTrainSelect } = this.props;
    return (
      <Segment className='details-pane'>
        <Responsive minWidth={Responsive.onlyTablet.minWidth} as='div' style={{padding: "14px"}}>
          <Button icon basic onClick={this.handleBack}>
            <Icon name='arrow left' />
          </Button>
          <Header as="h3">
            { station.name.replace(/ - /g, "–") }
          </Header>
        </Responsive>
        <Responsive {...Responsive.onlyMobile} as='div' className="mobile-details-header">
          <Button icon onClick={this.handleBack}>
            <Icon name='arrow left' />
          </Button>
          <Header as="h5" style={{margin: 0}}>
            { station.name.replace(/ - /g, "–") }
          </Header>
        </Responsive>
        <div className="details-body">
          <Segment>
            <Header as="h4">
              To {
                Array.from(new Set(Array.from(station.southStops).sort().map((trainId) => {
                  const train = trains.find((t) => {
                    return t.id === trainId;
                  });
                  if (trainId === 'M' & mTrainShuffle.includes(station.id)) {
                    return train.destinations.north;
                  }
                  return train.destinations.south;
                }).flat())).sort().join(', ').replace(/ - /g, "–")
              }
            </Header>
            <div>
              <List divided relaxed>
                {
                  Array.from(station.southStops).sort().map((trainId) => {
                    const train = trains.find((t) => {
                      return t.id === trainId;
                    });
                    return (
                      <List.Item key={trainId}>
                        <List.Content floated='left'>
                          <TrainBullet name={train.name} id={trainId} color={train.color}
                            textColor={train.text_color} size='small' onSelect={onTrainSelect} />
                        </List.Content>
                        <List.Content floated='right'>
                          <Header as='h4' color={this.statusColor(train.direction_statuses.south)}>
                            { train.direction_statuses.south }
                          </Header>
                        </List.Content>
                      </List.Item>
                    );
                  })
                }
              </List>
            </div>
          </Segment>
          <Segment>
            <Header as="h4">
              To {
                Array.from(new Set(Array.from(station.northStops).sort().map((trainId) => {
                  const train = trains.find((t) => {
                    return t.id == trainId;
                  });
                  if (trainId === 'M' & mTrainShuffle.includes(station.id)) {
                    return train.destinations.south;
                  }
                  return train.destinations.north;
                }).flat())).sort().join(', ').replace(/ - /g, "–")
              }
            </Header>
            <div>
              <List divided relaxed>
                {
                  Array.from(station.northStops).sort().map((trainId) => {
                    const train = trains.find((t) => {
                      return t.id === trainId;
                    });
                    return (
                      <List.Item key={trainId}>
                        <List.Content floated='left'>
                          <TrainBullet name={train.name} id={trainId} color={train.color}
                            textColor={train.text_color} size='small' onSelect={onTrainSelect} />
                        </List.Content>
                        <List.Content floated='right'>
                          <Header as='h4' color={this.statusColor(train.direction_statuses.north)}>
                            { train.direction_statuses.north }
                          </Header>
                        </List.Content>
                      </List.Item>
                    );
                  })
                }
              </List>
            </div>
          </Segment>
          {
            station.transfers.size > 0 &&
            <Segment>
              <Header as="h4">
                Transfers
              </Header>
              <List divided relaxed selection>
              {
                Array.from(station.transfers).map((stopId) => {
                  const stop = stations[stopId];
                  if (!stop) {
                    return;
                  }
                  return(
                    <List.Item key={stop.id} className='station-list-item' onClick={this.handleClick.bind(this, stop)}>
                      <List.Content floated='left'>
                        <Header as='h5'>
                          { stop.name.replace(/ - /g, "–") }
                        </Header>
                      </List.Content>
                      <List.Content floated='right'>
                        {
                          Array.from(stop.stops).sort().map((trainId) => {
                            const train = trains.find((t) => {
                              return t.id == trainId;
                            });
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
            </Segment>
          }
        </div>
      </Segment>
    );
  }
}

export default StationDetails