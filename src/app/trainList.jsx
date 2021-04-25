import React from 'react';
import ReactDOM from 'react-dom';
import { Header, Segment, List } from "semantic-ui-react";
import { Link } from "react-router-dom";
import TrainBullet from './trainBullet.jsx';

class TrainList extends React.Component {
  componentDidMount() {
    const { handleOnMount, infoBox } = this.props;
    handleOnMount();
    infoBox.classList.remove('open');
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
    )
  }
}

export default TrainList