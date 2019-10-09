import React from 'react';
import ReactDOM from 'react-dom';
import { Header, Segment, List } from "semantic-ui-react";
import TrainBullet from './trainBullet.jsx';

class TrainList extends React.Component {
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

  handleClick = train => {
    const { onSelect } = this.props;
    onSelect(train.id);
  }

  render() {
    const { trains } = this.props;
    return (
      <Segment>
        <List divided relaxed selection>
          {
            trains.filter((train) => train.visible || train.status !== 'Not Scheduled').map((train) => {
              return (
                <List.Item key={train.id} onClick={this.handleClick.bind(this, train)} data-train={train.id}>
                  <List.Content floated='left'>
                    <TrainBullet name={train.name} color={train.color}
                      textColor={train.text_color} size='small' />
                  </List.Content>
                  {
                    train.alternate_name &&
                      <List.Content floated='left'>
                        { train.alternate_name.replace('Shuttle', '') }
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
      </Segment>
    )
  }
}

export default TrainList