import React from 'react';
import ReactDOM from 'react-dom';
import { List, Checkbox, Header } from "semantic-ui-react";

class OverlayControls extends React.Component {

  render() {
    const { alwaysExpand, displayProblems, displayDelays, displaySlowSpeeds, displayLongHeadways, displayTrainPositions,
      handleDisplayProblemsToggle, handleDisplayDelaysToggle, handleDisplaySlowSpeedsToggle, handleDisplayLongHeadwaysToggle,
      handleDisplayTrainPositionsToggle} = this.props;

    return (
      <List>
        <List.Item>
          <Checkbox toggle onChange={handleDisplayTrainPositionsToggle} checked={displayTrainPositions} label={<label>train positions</label>} />
        </List.Item>
        <List.Item>
          <Checkbox toggle onChange={handleDisplayProblemsToggle} checked={displayProblems} label={<label title="May cause performance issues">overlay issues (experimental)</label>} />
          <List.List style={{"display": ((displayProblems || alwaysExpand) ? "block" : "none")}}>
            <List.Item>
              <Checkbox className="delay" toggle onChange={handleDisplayDelaysToggle} checked={displayDelays} disabled={!displayProblems} label={<label>delays</label>} />
            </List.Item>
            <List.Item>
              <Checkbox className="slow" toggle onChange={handleDisplaySlowSpeedsToggle} checked={displaySlowSpeeds} disabled={!displayProblems} label={<label>slow speeds</label>} />
            </List.Item>
            <List.Item>
              <Checkbox className="long-headway" toggle onChange={handleDisplayLongHeadwaysToggle} checked={displayLongHeadways} disabled={!displayProblems} label={<label>long headways</label>} />
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