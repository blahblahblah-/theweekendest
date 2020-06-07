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
          <Message.Header>Black Lives Matter</Message.Header>
          <p>
            Be the change against racial injustice: demand police accountability by&nbsp;
            <a href="https://www.brooklynnaacp.org/repeal50a" onClick={() => this.trackOutboundLink('https://www.brooklynnaacp.org/repeal50a')} target="_blank">repealing 50-a</a>,
            and demand to&nbsp;
            <a href="https://docs.google.com/spreadsheets/d/18pWRSu58DpENABkYUJlZw1ltCPZft7KJc6lFaOZK8-s/htmlview?sle=true&pru=AAABcq-h3HA*oh7juZvqh_r6uiGrz12t1A#" onClick={() => this.trackOutboundLink('https://docs.google.com/spreadsheets/d/18pWRSu58DpENABkYUJlZw1ltCPZft7KJc6lFaOZK8-s/htmlview?sle=true&pru=AAABcq-h3HA*oh7juZvqh_r6uiGrz12t1A#')} target="_blank">defund the NYPD</a>.
          </p>
        </Message>
        <Mapbox />
      </Router>
    )
  }
}

export default App