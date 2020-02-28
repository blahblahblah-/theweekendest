import React from 'react';
import ReactDOM from 'react-dom';
import { Responsive, Button, Icon, Header, Segment, Popup } from "semantic-ui-react";
import { withRouter, Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import Clipboard from 'react-clipboard.js';

import OverlayControls from './overlayControls.jsx';
import TripMap from './tripMap.jsx';
import TrainBullet from './trainBullet.jsx';

class TripDetails extends React.Component {
  componentDidMount() {
    const { handleOnMount, trip, direction, train, infoBox } = this.props;
    handleOnMount(trip.id, direction, train.id);
    infoBox.classList.remove('open');
    infoBox.scrollTop = 0;
  }

  componentDidUpdate(prevProps) {
    const { handleOnMount, trip, direction, train, infoBox } = this.props;
    if (prevProps.trip.id !== trip.id) {
      handleOnMount(trip.id, direction, train.id);
      infoBox.classList.remove('open');
      infoBox.scrollTop = 0;
    }
  }

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

  handleBack = _ => {
    this.props.history.goBack();
  }

  handleHome = _ => {
    this.props.handleResetMap();
  }

  handleGoToTrain = _ => {
    const { train } = this.props;
    this.props.history.push(`/trains/${train.id}`);
  }

  handleShare = _ => {
    const { trip, train } = this.props;
    const name = (train.alternate_name) ? ("S - " + train.alternate_name) : train.name;
    navigator.share({
      title: `the weekendest beta - ${name} Train - Trip ${trip.id}`,
      url: `https://www.theweekendest.com/trains/${train.id}/${trip.id}`
    });
  }

  handleRealignMap = _ => {
    const { handleOnMount, trip, direction, train } = this.props;
    handleOnMount(trip.id, direction, train.id);
  }

  render() {
    const { trip, stops, train, stations, direction } = this.props;
    const name = (train.alternate_name) ? ("S - " + train.alternate_name) : train.name;
    const title = `the weekendest beta - ${name} Train - Trip ${trip.id}`;
    const destination = trip.arrival_times[trip.arrival_times.length - 1].stop_id.substr(0, 3);
    return (
      <Segment className="details-pane">
        <Helmet>
          <title>{title}</title>
          <meta property="og:title" content={`${name} Train - Trip ${trip.id}`} />
          <meta name="twitter:title" content={title} />
          <meta property="og:url" content={`https://www.theweekendest.com/trains/${train.id}/${trip.id}`} />
          <meta name="twitter:url" content={`https://www.theweekendest.com/trains/${train.id}/${trip.id}`} />
          <meta property="og:description" content={`Track trip ${trip.id} on the ${name} Train on the New York City subway.`} />
          <meta name="twitter:description" content={`Track trip ${trip.id} on the ${name} Train on the New York City subway.`} />
          <link rel="canonical" href={`https://www.theweekendest.com/trains/${train.id}/${trip.id}`} />
          <meta name="Description" content={`Track trip ${trip.id} on the ${name} Train on the New York City subway.`} />
        </Helmet>
        <Responsive minWidth={Responsive.onlyTablet.minWidth} as='div' style={{padding: "14px 14px 0 14px"}}>
          <Button icon onClick={this.handleBack} title="Back">
            <Icon name='arrow left' />
          </Button>
          <Button icon onClick={this.handleHome} title="Home">
            <Icon name='map outline' />
          </Button>
          <Button icon onClick={this.handleGoToTrain} title={`${name} Train Info`}>
            <Icon name='subway' />
          </Button>
          <Button icon title="Center map" onClick={this.handleRealignMap}>
            <Icon name='crosshairs' />
          </Button>
          { navigator.share &&
            <Button icon onClick={this.handleShare} style={{float: "right"}} title="Share">
              <Icon name='external share' />
            </Button>
          }
          <Clipboard component={Button} style={{float: "right"}} className="icon" title="Copy Link" data-clipboard-text={`https://www.theweekendest.com/trains/${train.id}/${trip.id.replace('..', '-')}`}>
            <Icon name='linkify' />
          </Clipboard>
          <div className="train-details-header">
            <div className="train-info trip-bullet">
              <TrainBullet name={train.name} id={train.id} color={train.color} textColor={train.text_color} link />
              <div className='chevrons'>
                <div className='chevron' style={{color: train.color}}>
                </div>
                <div className='chevron' style={{color: train.color}}>
                </div>
                <div className='chevron' style={{color: train.color}}>
                </div>
              </div>
            </div>
            <div className="status">
              <Header as='h4' style={{textAlign: 'right'}}>
                { train.alternate_name }
                { train.alternate_name && <br /> }
                Train ID: { trip.id }<br />
                To: {
                  <Link to={`/stations/${stations[destination].id}`}>
                    { stations[destination].name.replace(/ - /g, "–") }
                  </Link>
                }
              </Header>
              <a href={`https://www.goodservice.io/trains/${train.id}/status`} target="_blank">
                <Header as='h4' color={this.statusColor(train.direction_statuses[direction])} style={{marginTop: 0}}>
                  { train.direction_secondary_statuses[direction] }
                </Header>
                <div></div>
              </a>
              <Header as='h6'>
                Powered by <a href={`https://www.goodservice.io/trains/${train.id}/status`} target="_blank">goodservice.io</a>
              </Header>
            </div>
          </div>
        </Responsive>
        <Responsive {...Responsive.onlyMobile} as='div' className="mobile-details-header mobile-train-details-header">
          <Popup trigger={<Button icon='ellipsis horizontal' title="More Options" />} inverted flowing
            on='click' hideOnScroll position='bottom left'>
            <Button icon onClick={this.handleBack} title="Back">
              <Icon name='arrow left' />
            </Button>
            <Button icon onClick={this.handleHome} title="Home">
              <Icon name='map outline' />
            </Button>
            <Button icon onClick={this.handleGoToTrain} title="${name} Train Info">
              <Icon name='subway' />
            </Button>
            <Clipboard component={Button} className="icon" title="Copy Link" data-clipboard-text={`https://www.theweekendest.com/trains/${train.id}/${trip.id.replace('..', '-')}`}>
              <Icon name='linkify' />
            </Clipboard>
            { navigator.share &&
              <Button icon onClick={this.handleShare} title="Share">
                <Icon name='external share' />
              </Button>
            }
          </Popup>
          <TrainBullet name={train.name} id={train.id} color={train.color} textColor={train.text_color} size='small' style={{display: "inline-block", flexGrow: 0, margin: 0}} link />
          <Header as='h4' style={{margin: "0 2px 0 0", flexGrow: 1, textAlign: "right"}}>
            ID: {trip.id}
          </Header>
          <Button icon title="Center map" onClick={this.handleRealignMap}>
            <Icon name='crosshairs' />
          </Button>
        </Responsive>
        <Responsive maxWidth={Responsive.onlyMobile.maxWidth} as='div' className="mobile-goodservice train-details-header">
          <div className='chevrons' style={{marginLeft: "42px"}}>
            <div className='chevron' style={{color: train.color}}>
            </div>
            <div className='chevron' style={{color: train.color}}>
            </div>
            <div className='chevron' style={{color: train.color}}>
            </div>
          </div>
          <div>
            { train.alternate_name && 
              <Header as='h5' style={{margin: 0, flexGrow: 0}}>
                {train.alternate_name}
              </Header>
            }
            <Header as='h5' style={{textAlign: 'right', margin: 0, maxWidth: "160px"}}>
              To: {
                <Link to={`/stations/${stations[destination].id}`}>
                  { stations[destination].name.replace(/ - /g, "–") }
                </Link>
              }
            </Header>
            <a href={`https://www.goodservice.io/trains/${train.id}/status`} target="_blank">
              <Header as='h5' color={this.statusColor(train.status)} style={{margin: 0}}>
                { train.secondary_status }
              </Header>
            </a>
            <Header as='h6' style={{margin: 0}}>
              Powered by <a href={`https://www.goodservice.io/trains/${train.id}/status`} target="_blank">goodservice.io</a>
            </Header>
          </div>
        </Responsive>
        <TripMap trip={trip} train={train} stops={stops} />
      </Segment>
    );
  }
}

export default withRouter(TripDetails)