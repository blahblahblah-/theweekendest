import React from 'react';
import { Header, Segment, Grid, Button, Icon } from "semantic-ui-react";
import Mapbox from './mapbox.jsx';
// import MapContainer from './map_container';

class App extends React.Component {
  render() {
    return(
      <Mapbox />
    )
  }
}

export default App