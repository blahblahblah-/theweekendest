import React from 'react';
import ReactDOM from 'react-dom';
import { Header, Segment, List } from "semantic-ui-react";
import { Link } from "react-router-dom";
import TrainBullet from './trainBullet.jsx';

class TrainList extends React.Component {
  componentDidMount() {
    const { handleOnMount, infoBox } = this.props;
    handleOnMount();
    infoBox.classList.add('open');
    infoBox.scrollTop = 0;
  }

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

  render() {
    const { trains } = this.props;
    return (
      <List divided relaxed selection>
        {
          trains.filter((train) => train.visible || train.status !== 'Not Scheduled').map((train) => {
            return (
              <List.Item as={Link} key={train.id} to={`/trains/${train.id}`}>
                <List.Content floated='left'>
                  <TrainBullet name={train.name} color={train.color}
                    textColor={train.text_color} size='small' />
                </List.Content>
                {
                  train.alternate_name &&
                    <List.Content floated='left'>
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