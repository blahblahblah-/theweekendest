import React from 'react';
import ReactDOM from 'react-dom';
import { Responsive, Button, Icon, Header, Segment, List, Popup } from "semantic-ui-react";
import { withRouter } from "react-router-dom";
import { Helmet } from "react-helmet";
import Clipboard from 'react-clipboard.js';

import OverlayControls from './overlayControls.jsx';
import TrainMap from './trainMap.jsx';
import TrainBullet from './trainBullet.jsx';

class TrainDetails extends React.Component {
  componentDidMount() {
    const { handleOnMount, train, coords, zoom, infoBox, handleDisplayTrainPositionsToggle } = this.props;
    handleOnMount(train.id, coords, zoom);
    infoBox.classList.remove('open');
    infoBox.scrollTop = 0;
  }

  componentDidUpdate(prevProps) {
    const { handleOnMount, train, coords, zoom, infoBox, handleDisplayTrainPositionsToggle } = this.props;
    if (prevProps.train.id !== train.id) {
      handleOnMount(train.id, coords, zoom);
      infoBox.classList.remove('open');
      infoBox.scrollTop = 0;

    }
  }

  statusColor(status) {
    if (status == 'Good Service') {
      return 'green';
    } else if (status == 'Service Change') {
      return 'orange';
    } else if (status == 'Not Good' || status == 'Slow') {
      return 'yellow';
    } else if (status == 'Delay') {
      return 'red';
    }
  }

  renderServiceChanges() {
    const { train, trains } = this.props;

    return ['both', 'north', 'south'].flatMap((direction) => train.service_change_summaries[direction]?.map((change, i) => {
      let tmp = [change.replace(/ - /g, "–")];
      let matched;
      while (matched = tmp.find((c) => typeof c === 'string' && c.match(/\<[A-Z0-9]*\>/))) {
        const regexResult = matched.match(/\<([A-Z0-9]*)\>/);
        let j = tmp.indexOf(matched);
        const selectedTrain = trains[regexResult[1]];
        const selectedTrainBullet = (<TrainBullet name={selectedTrain.name} color={selectedTrain.color}
              textColor={selectedTrain.text_color} style={{display: "inline-block"}} key={selectedTrain.id} size='small' />);
        const parts = matched.split(regexResult[0]);
        let newMatched = parts.flatMap((x) => [x, selectedTrainBullet]);
        newMatched.pop();
        tmp[j] = newMatched;
        tmp = tmp.flat();
      }

      return (<Header as='h5' key={`${direction}-${i}`}>{tmp}</Header>);
    }));
  }

  renderSummary() {
    const { train } = this.props;
    let out = [];
    if (train.service_summaries.south) {
      out.push(<Header as='h5' key="south">{train.service_summaries.south.replace(/ - /g, "–")}</Header>)
    }
    if (train.service_summaries.north) {
      out.push(<Header as='h5' key="north">{train.service_summaries.north.replace(/ - /g, "–")}</Header>)
    }
    const serviceChanges = this.renderServiceChanges();
    if ((out.length < 1) && (serviceChanges.length < 1)) {
      return;
    }
    return (
      <div className="details-body">
        { serviceChanges }
        { out }
      </div>
    );
  }

  handleBack = _ => {
    this.props.history.goBack();
  }

  handleHome = _ => {
    this.props.handleResetMap();
  }

  handleShare = _ => {
    const { train } = this.props;
    const name = (train.alternate_name) ? `${train.name} - ${train.alternate_name}` : train.name;

    navigator.share({
      title: `The Weekendest beta - ${name} Train`,
      url: `https://www.theweekendest.com/trains/${train.id}`
    });
  }

  handleRealignMap = _ => {
    const { train, handleOnMount } = this.props;
    handleOnMount(train.id);
  }

  renderOverlayControls() {
    const { displayProblems, displayDelays, displaySlowSpeeds, displayLongHeadways, displayTrainPositions, displayAccessibleOnly,
      handleDisplayProblemsToggle, handleDisplayDelaysToggle, handleDisplaySlowSpeedsToggle, handleDisplayLongHeadwaysToggle, handleDisplayAccessibleOnlyToggle,
      handleDisplayTrainPositionsToggle} = this.props;
    return (
      <Popup trigger={<Button icon='sliders horizontal' title="Configure overlays" />}
            on='click' hideOnScroll position='bottom center' style={{maxWidth: "195px"}}>
        <OverlayControls displayProblems={displayProblems} displayDelays={displayDelays} displaySlowSpeeds={displaySlowSpeeds}
            displayLongHeadways={displayLongHeadways} displayTrainPositions={displayTrainPositions} displayAccessibleOnly={displayAccessibleOnly}
            handleDisplayProblemsToggle={handleDisplayProblemsToggle} handleDisplayAccessibleOnlyToggle={handleDisplayAccessibleOnlyToggle}
            handleDisplayDelaysToggle={handleDisplayDelaysToggle} handleDisplaySlowSpeedsToggle={handleDisplaySlowSpeedsToggle}
            handleDisplayLongHeadwaysToggle={handleDisplayLongHeadwaysToggle}
            handleDisplayTrainPositionsToggle={handleDisplayTrainPositionsToggle}
            alwaysExpand={true} />
      </Popup>
    )
  }

  render() {
    const { routing, stops, train, trains, stations, accessibleStations, elevatorOutages, displayAccessibleOnly } = this.props;
    const name = (train.alternate_name) ? `${train.name} - ${train.alternate_name}` : train.name;
    const title = `The Weekendest beta - ${name} Train`;
    return (
      <Segment className="details-pane">
        <Helmet>
          <title>{title}</title>
          <meta property="og:title" content={`${name} Train`} />
          <meta name="twitter:title" content={title} />
          <meta property="og:url" content={`https://www.theweekendest.com/trains/${train.id}`} />
          <meta name="twitter:url" content={`https://www.theweekendest.com/trains/${train.id}`} />
          <meta property="og:description" content={`Check status, route map, service changes, and real-time train arrival times for ${name} Train on the New York City subway.`} />
          <meta name="twitter:description" content={`Check status, route map, service changes, and real-time train arrival times for ${name} Train on the New York City subway.`} />
          <link rel="canonical" href={`https://www.theweekendest.com/trains/${train.id}`} />
          <meta name="Description" content={`Check status, route map, service changes, and real-time train arrival times for ${name} Train on the New York City subway.`} />
        </Helmet>
        <Responsive minWidth={Responsive.onlyTablet.minWidth} as='div' style={{padding: "14px"}}>
          <Button icon onClick={this.handleBack} title="Back">
            <Icon name='arrow left' />
          </Button>
          <Button icon onClick={this.handleHome} title="Home">
            <Icon name='map outline' />
          </Button>
          <Button icon title="Center map" onClick={this.handleRealignMap}>
            <Icon name='crosshairs' />
          </Button>
          { this.renderOverlayControls() }
          { navigator.share &&
            <Button icon onClick={this.handleShare} style={{float: "right"}} title="Share">
              <Icon name='external share' />
            </Button>
          }
          <Clipboard component={Button} style={{float: "right"}} className="icon" title="Copy Link" data-clipboard-text={`https://www.theweekendest.com/trains/${this.props.train.id}`}>
            <Icon name='linkify' />
          </Clipboard>
          <div className="train-details-header">
            <div className="train-info">
              <TrainBullet name={train.name} color={train.color} textColor={train.text_color} />
              { train.alternate_name && 
                <Header as='h5' style={{display: "inline-block"}}>{train.alternate_name.replace(" Shuttle", "")}</Header>
              }
            </div>
            <div className="status">
              <Header as='h4' color={this.statusColor(train.status)}>
                { train.status }
              </Header>
              <div></div>
              <Header as='h6'>
                Powered by <a href={`https://www.goodservice.io/trains/${train.id}`} target="_blank">goodservice.io</a>
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
            { this.renderOverlayControls() }
            <Clipboard component={Button} className="icon" title="Copy Link" data-clipboard-text={`https://www.theweekendest.com/trains/${this.props.train.id}`}>
              <Icon name='linkify' />
            </Clipboard>
            { navigator.share &&
              <Button icon onClick={this.handleShare} title="Share">
                <Icon name='external share' />
              </Button>
            }
          </Popup>
          <TrainBullet name={train.name} color={train.color} textColor={train.text_color} size='small' style={{display: "inline-block", flexGrow: 0}} />
          { train.alternate_name && 
            <Header as='h5' style={{margin: 0, flexGrow: 0}}>
              {train.alternate_name.replace(" Shuttle", "")}
            </Header>
          }
          <Header as='h4' color={this.statusColor(train.status)} style={{margin: "0 2px 0 0", flexGrow: 1, textAlign: "right"}}>
            { train.status }
          </Header>
          <div></div>
          <Button icon title="Center map" onClick={this.handleRealignMap}>
            <Icon name='crosshairs' />
          </Button>
        </Responsive>
        <Responsive maxWidth={Responsive.onlyMobile.maxWidth} as='h6' className="mobile-goodservice">
          Powered by <a href={`https://www.goodservice.io/trains/${train.id}`} target="_blank">goodservice.io</a>
        </Responsive>
        {
          this.renderSummary()
        }
        <TrainMap routing={train.actual_routings} stops={stops} train={train} trains={trains} stations={stations} accessibleStations={accessibleStations} elevatorOutages={elevatorOutages} displayAccessibleOnly={displayAccessibleOnly} />
      </Segment>
    );
  }
}

export default withRouter(TrainDetails)