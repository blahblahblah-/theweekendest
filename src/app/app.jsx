import React from 'react';
import { BrowserRouter as Router, Route } from 'react-router-dom'
import Mapbox from './mapbox.jsx';
import { Message } from "semantic-ui-react";
// import MapContainer from './map_container';

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
        <Message color='black' className='toast'>
          <Message.Header>Black Trans Lives Matter</Message.Header>
          <p>
            Support&nbsp;
            <a href="https://www.theokraproject.com/" onClick={() => this.trackOutboundLink('https://www.theokraproject.com/')} target="_blank">the Okra Project</a>.
          </p>
        </Message>
        <Mapbox />
      </Router>
    )
  }
}

export default App