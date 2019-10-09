import React from 'react';
import ReactDOM from 'react-dom';
import { Button, Icon, Header, Segment, List } from "semantic-ui-react";
import TrainMap from './trainMap.jsx';
import TrainBullet from './trainBullet.jsx';

class TrainDetails extends React.Component {
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

  renderSummary() {
    const { train } = this.props;
    let out = [];
    if (train.service_summaries.south) {
      out.push(<Header as='h5' key="south">{train.service_summaries.south.replace(/ - /g, "–")}</Header>)
    }
    if (train.service_summaries.north) {
      out.push(<Header as='h5' key="north">{train.service_summaries.north.replace(/ - /g, "–")}</Header>)
    }
    return out;
  }

  handleBack = _ => {
    const { onReset } = this.props;
    onReset();
  }

  render() {
    const { routing, stops, train } = this.props;
    return (
      <Segment>
        <Button icon basic onClick={this.handleBack}>
          <Icon name='arrow left' />
        </Button>
        <div className="train-details-header">
          <div className="train-info">
            <TrainBullet name={train.name} color={train.color} textColor={train.text_color} style={{display: "inline-block"}} />
            { train.alternate_name && 
              <Header as='h5' style={{display: "inline-block"}}>{train.alternate_name.replace(" Shuttle", "")}</Header>
            }
          </div>
          <div className="status">
            <Header as='h4' color={this.statusColor(train.status)}>
              { train.status }
            </Header>
            <Header as='h6'>
              Powered by <a href={`https://www.goodservice.io/trains/${train.id}`} target="_blank">goodservice.io</a>
            </Header>
          </div>
        </div>
        {
          this.renderSummary()
        }
        <TrainMap routing={routing} stops={stops} train={train} />
      </Segment>
    );
  }
}

export default TrainDetails