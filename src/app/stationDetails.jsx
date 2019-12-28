import React from 'react';
import ReactDOM from 'react-dom';
import { Responsive, Button, Icon, Header, Segment, List, Popup } from "semantic-ui-react";
import { Link, withRouter } from "react-router-dom";
import Clipboard from 'react-clipboard.js';
import { Helmet } from "react-helmet";
import * as Cookies from 'es-cookie';

import OverlayControls from './overlayControls.jsx';
import TrainBullet from './trainBullet.jsx';

import Cross from "./icons/cross-15.svg";

// M train directions are reversed between Essex St and Myrtle Av to match with J/Z trains
const mTrainShuffle = ["M18", "M16", "M14", "M13", "M12", "M11"];

class StationDetails extends React.Component {
  constructor(props) {
    super(props);
    this.state = { fav: false };
  }

  componentDidMount() {
    const { station, handleOnMount, infoBox } = this.props;
    const favs = Cookies.get('favs') && Cookies.get('favs').split(",");

    if (!favs || !favs.includes(station.id)) {
      this.setState({ fav: false });
    } else {
      this.setState({ fav: true });
    }

    handleOnMount(station.id);
    infoBox.classList.add('open');
    infoBox.scrollTop = 0;
  }

  componentDidUpdate(prevProps) {
    const { handleOnMount, station, infoBox } = this.props;
    if (prevProps.station.id !== station.id) {
      handleOnMount(station.id);
      infoBox.classList.add('open');
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
    this.props.history.push("/");
  }

  handleShare = _ => {
    navigator.share({
      title: `the weekendest - ${this.props.station.name.replace(/ - /g, "–")}`,
      text: `Real-time arrival times and routing information at ${this.props.station.name.replace(/ - /g, "–")} station on the Weekendest`,
      url: `https://www.theweekendest.com/stations/${this.props.station.id}`
    })
  }

  handleStar = _ => {
    const { station } = this.props;
    const { fav } = this.state;
    const newState = !fav;
    const currentFavs = new Set(Cookies.get('favs') && Cookies.get('favs').split(","));

    if (newState) {
      currentFavs.add(station.id);
    } else {
      currentFavs.delete(station.id);
    }

    this.setState({ fav: newState });
    Cookies.set('favs', [...currentFavs].join(","), {expires: 365});

    gtag('event', 'stars', {
      'event_category': newState ? 'add' : 'remove',
      'event_label': station.id
    });
  }

  renderArrivalTimes(trainId, direction) {
    const { station, arrivals, routings, stations } = this.props;
    const currentTime = Date.now() / 1000;
    let actualDirection = direction;

    if (trainId === 'M' && mTrainShuffle.includes(station.id)) {
      actualDirection = direction === "north" ? "south" : "north";
    }

    if (!arrivals[trainId] || !arrivals[trainId].arrival_times[actualDirection]) {
      return;
    }

    let destinations = [];
    const trainRoutingInfo = routings[trainId];

    trainRoutingInfo.routings[direction].forEach((routing) => {
      if (routing.includes(station.id + actualDirection[0].toUpperCase())) {
        destinations.push(routing[routing.length - 1]);
      }
    })

    destinations = Array.from(new Set(destinations));

    const times = arrivals[trainId].arrival_times[actualDirection].filter((estimates) => {
      return estimates.some((estimate) => estimate.stop_id.substr(0, 3) === station.id && estimate.estimated_time >= currentTime)
    }).map((estimates) => {
      return {
        time: Math.round((estimates.find((estimate) => estimate.stop_id.substr(0, 3) === station.id).estimated_time  - currentTime) / 60),
        destination: estimates[estimates.length - 1].stop_id.substr(0, 3)
      }
    }).sort((a, b) => a.time - b.time).slice(0, 2);

    return times.map((estimate) => {
      if (destinations.length > 1 || estimate.destination !== destinations[0].substr(0, 3)) {
        const runDestination = stations[estimate.destination.substr(0, 3)].name.replace(/ - /g, "–").split('–')[0];
        return `${estimate.time} min (${runDestination})`;
      }
      return `${estimate.time} min`;
    }).join(',\n')
  }

  southDestinations() {
    const { routings, stations, station } = this.props;
    let destinations = [];
    Object.keys(routings).forEach((key) => {
      const route = routings[key];
      if (key !== 'M' || !mTrainShuffle.includes(station.id)) {
        route.routings.south.forEach((routing) => {
          if (routing.includes(station.id + "S")) {
            destinations.push(routing[routing.length - 1]);
          }
        })
      }
    })

    if (mTrainShuffle.includes(station.id)) {
      const route = routings["M"];
      route.routings.north.forEach((routing) => {
        if (routing.includes(station.id + "N")) {
          destinations.push(routing[routing.length - 1]);
        }
      })
    }

    return Array.from(new Set(destinations.map((s) => {
      const st = stations[s.substring(0, 3)];
      if (st) {
        return st.name;
      }
    }))).sort().join(', ').replace(/ - /g, "–");
  }

  northDestinations() {
    const { routings, stations, station } = this.props;
    let destinations = [];
    Object.keys(routings).forEach((key) => {
      const route = routings[key];
      if (key !== 'M' || !mTrainShuffle.includes(station.id)) {
        route.routings.north.forEach((routing) => {
          if (routing.includes(station.id + "N")) {
            destinations.push(routing[routing.length - 1]);
          }
        })
      }
    })

    if (mTrainShuffle.includes(station.id)) {
      const route = routings["M"];
      route.routings.south.forEach((routing) => {
        if (routing.includes(station.id + "S")) {
          destinations.push(routing[routing.length - 1]);
        }
      })
    }

    return Array.from(new Set(destinations.map((s) => {
      const st = stations[s.substring(0, 3)];
      if (st) {
        return st.name;
      }
    }))).sort().join(', ').replace(/ - /g, "–");
  }

  renderOverlayControls() {
    const { displayProblems, displayDelays, displaySlowSpeeds, displayLongHeadways,
      handleDisplayProblemsToggle, handleDisplayDelaysToggle, handleDisplaySlowSpeedsToggle, handleDisplayLongHeadwaysToggle } = this.props;
    return (
      <Popup trigger={<Button icon='sliders horizontal' title="Configure issues overlay (experimental)" />}
            on='click' hideOnScroll position='bottom center' style={{maxWidth: "195px"}}>
        <OverlayControls displayProblems={displayProblems} displayDelays={displayDelays} displaySlowSpeeds={displaySlowSpeeds}
            displayLongHeadways={displayLongHeadways} handleDisplayProblemsToggle={handleDisplayProblemsToggle}
            handleDisplayDelaysToggle={handleDisplayDelaysToggle} handleDisplaySlowSpeedsToggle={handleDisplaySlowSpeedsToggle}
            handleDisplayLongHeadwaysToggle={handleDisplayLongHeadwaysToggle} alwaysExpand={true} />
      </Popup>
    )
  }

  render() {
    const { stations, station, trains } = this.props;
    const { fav } = this.state;
    const title = `the weekendest beta - ${ station.name.replace(/ - /g, "–") }${ station.secondary_name ? ` (${station.secondary_name})` : ""} Station`;
    return (
      <Segment className='details-pane'>
        <Helmet>
          <title>{title}</title>
          <meta property="og:title" content={title} />
          <meta name="twitter:title" content={title} />
          <meta property="og:url" content={`https://www.theweekendest.com/stations/${station.id}`} />
          <meta name="twitter:url" content={`https://www.theweekendest.com/stations/${station.id}`} />
          <link rel="canonical" href={`https://www.theweekendest.com/stations/${station.id}`} />
        </Helmet>
        <Responsive minWidth={Responsive.onlyTablet.minWidth} as='div' style={{padding: "14px"}}>
          <Button icon onClick={this.handleBack} title="Back">
            <Icon name='arrow left' />
          </Button>
          <Button icon onClick={this.handleHome} title="Home">
            <Icon name='map outline' />
          </Button>
          {
            this.renderOverlayControls()
          }
          <Button icon onClick={this.handleStar} title={ fav ? 'Remove station from favorites' : 'Add station to favorites'}>
            <Icon name={ fav ? 'star' : 'star outline'} />
          </Button>
          { navigator.share &&
            <Button icon onClick={this.handleShare} style={{float: "right"}} title="Share">
              <Icon name='external share' />
            </Button>
          }
          <Clipboard component={Button} style={{float: "right"}} className="icon" title="Copy Link" data-clipboard-text={`https://www.theweekendest.com/stations/${this.props.station.id}`}>
            <Icon name='linkify' />
          </Clipboard>
          <Header as="h3" className='header-station-name'>
            { station.name.replace(/ - /g, "–") }
          </Header>
          { station.secondary_name &&
            <span className='header-secondary-name'>
              {
                station.secondary_name
              }
            </span>
          }
        </Responsive>
        <Responsive {...Responsive.onlyMobile} as='div' className="mobile-details-header">
          <Popup trigger={<Button icon='ellipsis horizontal' title="More Options..." />} inverted flowing
            on='click' hideOnScroll position='bottom left'>
            <Button icon onClick={this.handleBack} title="Back">
              <Icon name='arrow left' />
            </Button>
            <Button icon onClick={this.handleHome} title="Home">
              <Icon name='map outline' />
            </Button>
            {
              this.renderOverlayControls()
            }
            <Button icon onClick={this.handleStar} title={ fav ? 'Remove station from favorites' : 'Add station to favorites'}>
              <Icon name={ fav ? 'star' : 'star outline'} />
            </Button>
            <Clipboard component={Button} className="icon" title="Copy Link" data-clipboard-text={`https://www.theweekendest.com/stations/${this.props.station.id}`}>
              <Icon name='linkify' />
            </Clipboard>
            { navigator.share &&
              <Button icon onClick={this.handleShare} title="Share">
                <Icon name='external share' />
              </Button>
            }
          </Popup>
          <Header as="h5" style={{margin: 0}}>
            { station.name.replace(/ - /g, "–") }
            <span className='header-secondary-name'>
              { station.secondary_name }
            </span>
          </Header>
        </Responsive>
        <div className="details-body">
          <Segment>
            <Header as="h5">
              To { this.southDestinations() }
            </Header>
            <div>
              <List divided relaxed>
                {
                  Array.from(station.southStops).sort().map((trainId) => {
                    const train = trains.find((t) => {
                      return t.id === trainId;
                    });
                    return (
                      <List.Item key={trainId}>
                        <List.Content floated='left' style={{marginRight: "0.5em"}}>
                          <TrainBullet name={train.name} id={trainId} color={train.color}
                            textColor={train.text_color} size='small' link />
                        </List.Content>
                        <List.Content floated='right' className="station-details-route-status">
                          <div>{ this.renderArrivalTimes(trainId, "south") }</div>
                          <Header as='h4' color={this.statusColor(train.direction_statuses.south)}>
                            { train.direction_statuses.south }
                          </Header>
                        </List.Content>
                      </List.Item>
                    );
                  })
                }
              </List>
            </div>
          </Segment>
          <Segment>
            <Header as="h5">
              To { this.northDestinations() }
            </Header>
            <div>
              <List divided relaxed>
                {
                  Array.from(station.northStops).sort().map((trainId) => {
                    const train = trains.find((t) => {
                      return t.id === trainId;
                    });
                    return (
                      <List.Item key={trainId}>
                        <List.Content floated='left'>
                          <TrainBullet name={train.name} id={trainId} color={train.color}
                            textColor={train.text_color} size='small' link />
                        </List.Content>
                        <List.Content floated='right' className="station-details-route-status">
                          <div>{ this.renderArrivalTimes(trainId, "north") }</div>
                          <Header as='h4' color={this.statusColor(train.direction_statuses.north)}>
                            { train.direction_statuses.north }
                          </Header>
                        </List.Content>
                      </List.Item>
                    );
                  })
                }
              </List>
            </div>
          </Segment>
          {
            station.transfers.size > 0 &&
            <Segment>
              <Header as="h4">
                Transfers
              </Header>
              <List divided relaxed selection>
              {
                Array.from(station.transfers).map((stopId) => {
                  const stop = stations[stopId];
                  if (!stop) {
                    return;
                  }
                  return(
                    <List.Item as={Link} key={stop.id} className='station-list-item' to={`/stations/${stop.id}`}>
                      <List.Content floated='left'>
                        <Header as='h5'>
                          { stop.name.replace(/ - /g, "–") }
                        </Header>
                      </List.Content>
                      { stop.secondary_name &&
                        <List.Content floated='left' className="secondary-name">
                          { stop.secondary_name }
                        </List.Content>
                      }
                      <List.Content floated='right'>
                        {
                          Array.from(stop.stops).sort().map((trainId) => {
                            const train = trains.find((t) => {
                              return t.id == trainId;
                            });
                            return (
                              <TrainBullet id={trainId} key={train.name} name={train.name} color={train.color}
                                textColor={train.text_color} size='small' key={train.id} />
                            )
                          })
                        }
                        {
                          stop.stops.size === 0 &&
                          <Cross style={{height: "21px", width: "21px", margin: "3.5px 1px 3.5px 3.5px"}} />
                        }
                      </List.Content>
                    </List.Item>
                  )
                })
              }
            </List>
            </Segment>
          }
        </div>
      </Segment>
    );
  }
}

export default withRouter(StationDetails)