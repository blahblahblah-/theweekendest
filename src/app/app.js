import React from 'react';
import { Header, Segment, Grid, Button, Icon } from "semantic-ui-react";
import MapContainer from './map_container';

class App extends React.Component {
  render() {
    return(
      <div>
        <Segment inverted vertical style={{padding: '2em 2em 1em 2em'}}>
          <Header inverted as='h1' color='yellow'>
            the weekendest<span id="alpha">alpha</span>
            <Header.Subheader>
              real-time new york city subway map
            </Header.Subheader>
          </Header>
        </Segment>

        <Segment>
          <MapContainer />
        </Segment>

        <Segment inverted vertical style={{padding: '1em 2em'}}>
          <Grid>
            <Grid.Column width={6}>
              <Button circular color='facebook' icon='facebook' onClick={() => window.open("https://www.facebook.com/sharer/sharer.php?u=https%3A//www.weekendest.com")} />
              <Button circular color='twitter' icon='twitter' onClick={() => window.open("https://www.twitter.com/share?text&url=https%3A//www.weekendest.com")} />
            </Grid.Column>
            <Grid.Column width={10} textAlign='right'>
              <Header inverted as='h5'>
                Created by <a href='https://twitter.com/_blahblahblah'>Sunny Ng</a>.<br />
              </Header>
            </Grid.Column>
          </Grid>
        </Segment>
      </div>
    )
  }
}

export default App