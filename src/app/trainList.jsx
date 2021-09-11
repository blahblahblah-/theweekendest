import React from 'react';
import ReactDOM from 'react-dom';
import { Header, Segment, List, Grid, Icon } from "semantic-ui-react";
import { Link } from "react-router-dom";
import TrainBullet from './trainBullet.jsx';

class TrainList extends React.Component {
  componentDidMount() {
    const { handleOnMount, infoBox } = this.props;
    handleOnMount();
    infoBox.scrollTop = 0;
  }

  statusColor(status) {
    if (status == 'Good Service') {
      return 'green';
    } else if (status == 'Service Change') {
      return 'orange';
    } else if (status == 'Not Good' || status == 'Slow') {
      return 'yellow';
    } else if (status == 'Delay') {
      return 'red';
    }
  }

  sortFunction = (a, b) => {
    const { trains } = this.props;
    const aTrain = trains[a];
    const bTrain = trains[b];
    const aName = `${aTrain.name} - ${aTrain.alternate_name}`;
    const bName = `${bTrain.name} - ${bTrain.alternate_name}`;

    if (aName < bName) {
      return -1;
    }
    if (bName > aName) {
      return 1;
    }
    return 0;
  }

  render() {
    const { trains } = this.props;
    return (
      <React.Fragment>
        <List divided relaxed selection className="train-list">
          {
            Object.keys(trains).sort(this.sortFunction).filter((trainId) => trains[trainId].visible || trains[trainId].status !== 'Not Scheduled').map((trainId) => {
              const train = trains[trainId];
              return (
                <List.Item as={Link} key={train.id} to={`/trains/${train.id}`}>
                  <List.Content floated='left' className="bullet-container">
                    <TrainBullet name={train.name} color={train.color}
                      textColor={train.text_color} size='small' />
                  </List.Content>
                  {
                    train.alternate_name &&
                      <List.Content floated='left' className="alternate-name">
                        { train.alternate_name.replace(' Shuttle', '').replace('Avenue', 'Av') }
                      </List.Content>
                  }
                  <List.Content floated='right'>
                    <Header as='h4' color={this.statusColor(train.status)}>
                      { train.status }
                    </Header>
                  </List.Content>
                </List.Item>
              );
            })
          }
        </List>
        <Grid className='mobile-train-grid'>
          <Grid.Row columns={5} textAlign='center'>
            {
              Object.keys(trains).sort(this.sortFunction).filter((trainId) => trains[trainId].visible || trains[trainId].status !== 'Not Scheduled').map((trainId) => {
                const train = trains[trainId];
                const alternateName = train.alternate_name;
                let displayAlternateName = alternateName && alternateName[0];
                let match;
                if (match = alternateName?.match(/^(?<number>[0-9]+)/)) {
                  displayAlternateName = match.groups.number;
                }
                return (
                  <Grid.Column key={train.name + train.alternate_name}>
                    <Link to={`/trains/${train.id}`}>
                      <TrainBullet name={train.name} alternateName={displayAlternateName} color={train.color} size='small'
                                      textColor={train.text_color} style={{ float: 'left', opacity: ['Not Scheduled', 'No Service'].includes(train.status) ? '30%' : '100%' }} />
                      {
                        (train.status === 'Not Good' || train.status === 'Slow' ) &&
                        <Icon aria-label={train.status} name="warning sign" color="yellow" size="small" />
                      }
                      {
                        train.status === 'Service Change' &&
                        <Icon aria-label={train.status} name="bolt" color="orange" size="small" />
                      }
                      {
                        train.status === 'Delay' &&
                        <Icon aria-label={train.status} name="exclamation" color="red" size="small" />
                      }
                      {
                        train.status === 'No Service' &&
                        <Icon aria-label={train.status} name="times" color="red" size="small" />
                      }
                      {
                        train.status === 'Good Service' &&
                        <Icon aria-label={train.status} name="check" color="green" size="small" />
                      }
                    </Link>
                  </Grid.Column>
                )
              })
            }
          </Grid.Row>
        </Grid>
      </React.Fragment>
    )
  }
}

export default TrainList