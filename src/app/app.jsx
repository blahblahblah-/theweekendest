import React from 'react';
import { BrowserRouter as Router, Route } from 'react-router-dom'
import Mapbox from './mapbox.jsx';
import { Message } from "semantic-ui-react";

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
          <Message.Header>Save Congestion Pricing!</Message.Header>
          <p>
            Contact your local electeds, and let them know Gov. Kathy Hochul should not derail MTA's $15 billion capital plan.&nbsp;
            Click <a href="https://savecongestionpricing.org" onClick={() => this.trackOutboundLink('https://savecongestionpricing.org')} target="_blank">here</a> to find out how.
          </p>
        </Message>
        <Mapbox />
      </Router>
    )
  }
}

export default App