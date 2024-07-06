import React from 'react';
import { BrowserRouter as Router, Route } from 'react-router-dom'
import Mapbox from './mapbox.jsx';

class App extends React.Component {
  trackOutboundLink(url) {
    gtag('event', 'click', {
      'event_category': 'outbound',
      'event_label': url,
      'transport_type': 'beacon',
      'event_callback': () => {window.open(url, '_blank')}
    });
    return false;
  }

  render() {
    return(
      <Router>
        <Mapbox />
      </Router>
    )
  }
}

export default App