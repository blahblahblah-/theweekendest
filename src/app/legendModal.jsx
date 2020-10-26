import React from 'react';
import ReactDOM from 'react-dom';
import { Header, List, Modal } from "semantic-ui-react";

import Circle from "./icons/circle-15.svg";
import ExpressStop from "./icons/express-stop.svg";
import UptownAllTrains from "./icons/uptown-all-trains.svg";
import AllDowntownTrains from "./icons/all-downtown-trains.svg";
import DowntownOnly from "./icons/downtown-only.svg";
import Cross from "./icons/cross-15.svg";

class LegendModal extends React.Component {

  render() {
    return (
      <Modal
        trigger={this.props.trigger}
        closeIcon dimmer="blurring" closeOnDocumentClick closeOnDimmerClick>
        <Modal.Header>
          Legend
        </Modal.Header>
        <Modal.Content>
          <Modal.Description>
            <List divided relaxed style={{marginTop: 0}}>
              <List.Item>
                <List.Content floated='left' style={{marginRight: "0.5em"}}>
                  <ExpressStop style={{height: "15px", width: "15px"}} />
                </List.Content>
                <List.Content floated='left'>
                  <Header as='h5'>
                    All trains stop
                  </Header>
                </List.Content>
             </List.Item>
              <List.Item>
                <List.Content floated='left' style={{marginRight: "0.5em"}}>
                  <Circle style={{height: "15px", width: "15px"}} />
                </List.Content>
                <List.Content floated='left'>
                  <Header as='h5'>
                    Some trains stop
                  </Header>
                </List.Content>
             </List.Item>
              <List.Item>
                <List.Content floated='left' style={{marginRight: "0.5em"}}>
                  <UptownAllTrains style={{height: "15px", width: "15px"}} />
                </List.Content>
                <List.Content floated='left'>
                  <Header as='h5'>
                    All uptown, some downtown trains stop
                  </Header>
                </List.Content>
             </List.Item>
              <List.Item>
                <List.Content floated='left' style={{marginRight: "0.5em"}}>
                  <AllDowntownTrains style={{height: "15px", width: "15px"}} />
                </List.Content>
                <List.Content floated='left'>
                  <Header as='h5'>
                    No uptown, all downtown trains stop
                  </Header>
                </List.Content>
             </List.Item>
              <List.Item>
                <List.Content floated='left' style={{marginRight: "0.5em"}}>
                  <DowntownOnly style={{height: "15px", width: "15px"}} />
                </List.Content>
                <List.Content floated='left'>
                  <Header as='h5'>
                    No uptown, some downtown trains stop
                  </Header>
                </List.Content>
             </List.Item>
              <List.Item>
                <List.Content floated='left' style={{marginRight: "0.5em"}}>
                  <Cross style={{height: "15px", width: "15px"}} />
                </List.Content>
                <List.Content floated='left'>
                  <Header as='h5'>
                    No trains stop
                  </Header>
                </List.Content>
             </List.Item>
            </List>
          </Modal.Description>
        </Modal.Content>
      </Modal>
    );
  }
}

export default LegendModal