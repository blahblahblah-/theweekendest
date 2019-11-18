import React from 'react';
import ReactDOM from 'react-dom';
import { Header, List } from "semantic-ui-react";

import Circle from "./icons/circle-15.svg";
import ExpressStop from "./icons/express-stop.svg";
import UptownAllTrains from "./icons/uptown-all-trains.svg";
import DowntownOnly from "./icons/downtown-only.svg";
import Cross from "./icons/cross-15.svg";

class Legend extends React.Component {

  render() {
    return (
      <List divided relaxed style={{marginTop: 0}}>
        <List.Item>
          <List.Content floated='left' style={{marginRight: "0.5em"}}>
            <ExpressStop style={{height: "15px", width: "15px"}} />
          </List.Content>
          <List.Content floated='left'>
            <Header as='h5'>
              all trains stop
            </Header>
          </List.Content>
       </List.Item>
        <List.Item>
          <List.Content floated='left' style={{marginRight: "0.5em"}}>
            <Circle style={{height: "15px", width: "15px"}} />
          </List.Content>
          <List.Content floated='left'>
            <Header as='h5'>
              some trains stop
            </Header>
          </List.Content>
       </List.Item>
        <List.Item>
          <List.Content floated='left' style={{marginRight: "0.5em"}}>
            <UptownAllTrains style={{height: "15px", width: "15px"}} />
          </List.Content>
          <List.Content floated='left'>
            <Header as='h5'>
              all uptown, some downtown
            </Header>
          </List.Content>
       </List.Item>
        <List.Item>
          <List.Content floated='left' style={{marginRight: "0.5em"}}>
            <DowntownOnly style={{height: "15px", width: "15px"}} />
          </List.Content>
          <List.Content floated='left'>
            <Header as='h5'>
              no uptown, some downtown
            </Header>
          </List.Content>
       </List.Item>
        <List.Item>
          <List.Content floated='left' style={{marginRight: "0.5em"}}>
            <Cross style={{height: "15px", width: "15px"}} />
          </List.Content>
          <List.Content floated='left'>
            <Header as='h5'>
              no trains stop
            </Header>
          </List.Content>
       </List.Item>
      </List>
    );
  }
}

export default Legend