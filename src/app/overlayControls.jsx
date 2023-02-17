import React from 'react';
import ReactDOM from 'react-dom';
import { List, Checkbox, Header, Icon } from "semantic-ui-react";

class OverlayControls extends React.Component {

  render() {
    const { alwaysExpand, displayProblems, displayDelays, displaySlowSpeeds, displayLongHeadways, displayTrainPositions, displayAccessibleOnly, displayAdditionalTrips,
      handleDisplayProblemsToggle, handleDisplayDelaysToggle, handleDisplaySlowSpeedsToggle, handleDisplayLongHeadwaysToggle, handleDisplayAccessibleOnlyToggle,
      handleDisplayAdditionalTripsToggle, handleDisplayTrainPositionsToggle} = this.props;

    return (
      <List className='overlay-controls'>
        <List.Item>
          <Checkbox toggle onChange={handleDisplayAccessibleOnlyToggle} checked={displayAccessibleOnly} label={
            <label>
              <Icon name='accessible' color='blue' title='This station is accessible' />
              Accessible Stations Only
            </label>
          } />
        </List.Item>
        { handleDisplayAdditionalTripsToggle &&
          <List.Item>
            <Checkbox toggle onChange={handleDisplayAdditionalTripsToggle} checked={displayAdditionalTrips} label={<label title="Display other trains that share tracks.">Other Trains</label>} />
          </List.Item>
        }
        <List.Item>
          <Checkbox toggle onChange={handleDisplayTrainPositionsToggle} checked={displayTrainPositions} label={<label title="Train location estimations are calculated from estimated arrival times and may not be accurate.">Train Locations</label>} />
        </List.Item>
        <List.Item>
          <Checkbox toggle onChange={handleDisplayProblemsToggle} checked={displayProblems} label={<label title="May cause performance issues">Overlay Issues (experimental)</label>} />
          <List.List style={{"display": ((displayProblems || alwaysExpand) ? "block" : "none")}}>
            <List.Item>
              <Checkbox className="delay" toggle onChange={handleDisplayDelaysToggle} checked={displayDelays} disabled={!displayProblems} label={<label>Delays</label>} />
            </List.Item>
            <List.Item>
              <Checkbox className="slow" toggle onChange={handleDisplaySlowSpeedsToggle} checked={displaySlowSpeeds} disabled={!displayProblems} label={<label>Slow Speeds</label>} />
            </List.Item>
            <List.Item>
              <Checkbox className="long-headway" toggle onChange={handleDisplayLongHeadwaysToggle} checked={displayLongHeadways} disabled={!displayProblems} label={<label>Long Headways</label>} />
            </List.Item>
            <List.Item>
              <Header as='h6'>
                Powered by <a href="https://www.goodservice.io/" target="_blank">goodservice.io</a>
              </Header>
            </List.Item>
          </List.List>
        </List.Item>
      </List>
    );
  }
}

export default OverlayControls