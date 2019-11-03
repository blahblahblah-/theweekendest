import React from 'react';
import { BrowserRouter as Router, Route } from 'react-router-dom'
import Mapbox from './mapbox.jsx';
// import MapContainer from './map_container';

class App extends React.Component {
  render() {
    return(
      <Router>
        <Mapbox />
      </Router>
    )
  }
}

export default App