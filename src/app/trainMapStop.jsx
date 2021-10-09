import React from 'react';
import { Header, Label, Icon } from 'semantic-ui-react';
import TrainBullet from './trainBullet.jsx';
import { withRouter, Link } from "react-router-dom";

import { accessibilityIcon } from './utils/accessibility.jsx';

class TrainMapStop extends React.Component {

  renderStop() {
    const { southStop, northStop, stop, accessibleStations, displayAccessibleOnly } = this.props;
    const accessibleNorth = accessibleStations.north.includes(stop.id);
    const accessibleSouth = accessibleStations.south.includes(stop.id);
    const accessible = accessibleNorth || accessibleSouth;

    const opacity = !displayAccessibleOnly || accessible ? 1 : 0.2;

    if (southStop && northStop && (!displayAccessibleOnly || !accessible || (accessibleNorth && accessibleSouth))) {
      return (
        <Link to={`/stations/${stop.id}`}>
          <div style={{border: "1px #999 solid", height: "10px", width: "10px", borderRadius: "50%", opacity: opacity,
            position: "relative", backgroundColor: "white", left: "5px", top: "20px", cursor: "pointer"}}>
          </div>
        </Link>
      )
    }

    if (northStop && (!displayAccessibleOnly || accessibleNorth)) {
      return (
        <Link to={`/stations/${stop.id}`}>
          <div style={{border: "1px #999 solid", height: "5px", width: "10px", borderTopLeftRadius: "10px", opacity: opacity,
            borderTopRightRadius: "10px", position: "relative", backgroundColor: "white", left: "5px",
            top: "20px", cursor: "pointer"}}>
          </div>
        </Link>
      )
    }

    return (
      <Link to={`/stations/${stop.id}`}>
        <div style={{border: "1px #999 solid", height: "5px", width: "10px", borderBottomLeftRadius: "10px", opacity: opacity,
          borderBottomRightRadius: "10px", position: "relative", backgroundColor: "white", left: "5px",
          top: "25px", cursor: "pointer"}}>
        </div>
      </Link>
    )
  }

  renderMainLine(background, margin, stopExists) {
    const { match } = this.props;
    return (
      <div style={{margin: margin, height: "100%", minHeight: "50px", minWidth: "20px", background: background, display: "inline-block"}}>
        {
          stopExists && this.renderStop()
        }
      </div>
    )
  }

  renderLine(isActiveBranch, index, branchStart, branchEnd) {
    const { color, branchStops, arrivalTime } = this.props;
    const stopExists = branchStops[index];
    const branchStartHere = branchStart !== null && branchStart === index;
    const branchEndHere = branchEnd !== null && branchEnd === index;
    let marginValue = "20px";
    const branching = branchStartHere || branchEndHere;
    // Skipped branching is where branching occurs from second-to-last branch instead of the last
    const skippedBranching = branchStart !== null && (index === branchStart - 1 && !branchStops[index + 1]);
    const lineSkippedBranching = branchStart !== null && !branchStops[index];
    const branchingConnectedToPrevLine = branchStartHere && !branchStops[index];

    if (index === 0) {
      marginValue = "20px";
    }

    let margin = arrivalTime ? ("0 10px") : '0';
    let minWidthValue = (arrivalTime ? 45 : 40);
    let background;

    if (branching) {
      minWidthValue = 120;
    }

    if (skippedBranching) {
      minWidthValue = 80;
    }

    if (lineSkippedBranching && index > 0) {
      minWidthValue = 100;
      margin = "0";
    }

    let minWidth;

    if (index === 0) {
      minWidth = '40px';
    } else {
      minWidth = minWidthValue + 'px';
    }


    if (stopExists) {
      let topStripeColor;
      let bottomStripeColor;
      let middleStripeColor;

      middleStripeColor = bottomStripeColor || topStripeColor || color;
      topStripeColor = topStripeColor || color;
      bottomStripeColor = bottomStripeColor || color;

      background = `repeating-linear-gradient(0deg, ${color}, ${color} 1px, ${middleStripeColor} 1px, ${middleStripeColor} 2px)`;
    } else {
      background = color;
    }

    if (!isActiveBranch) {
      return (
        <div key={index} style={{margin: margin, height: "100%", minHeight: "50px", minWidth: "20px", display: "inline-block"}}>
        </div>
      )
    }

    return (
      <div key={index} style={{minWidth: minWidth, display: "flex"}}>
        {
          this.renderMainLine(background, margin, stopExists)
        }
        {
          skippedBranching &&
          <div style={{margin: "15px 0", height: "20px", width: "40px", backgroundColor: color, display: "inline-block", alignSelf: "flex-start", borderRight: "1px solid white"}}>
          </div>
        }
        {
          branchStartHere &&
          <div style={{height: "100%"}} className="branch-corner">
            <div style={{boxShadow: "0 0 0 20px " + color, transform: "translate(-10px, 35px)"}} className="branch-start">
            </div>
          </div>
        }
        {
          branchEndHere &&
          <div style={{height: "50px"}} className="branch-corner">
            <div style={{boxShadow: "0 0 0 20px " + color, transform: "translate(-9px, -35px)"}} className="branch-end">
            </div>
          </div>
        }
      </div>
    )
  }

  render() {
    const { stop, transfers, trains, activeBranches, branchStart, branchEnd, arrivalTime, accessibleStations, elevatorOutages, displayAccessibleOnly, showSecondaryName, isDelayed } = this.props;
    const eta = arrivalTime && Math.round(arrivalTime / 60);
    const opacity = !stop || !displayAccessibleOnly || accessibleStations.north.includes(stop.id) || accessibleStations.south.includes(stop.id) ? 1 : 0.2;
    return (
      <li className="train-map-stop">
        <div style={{minHeight: "50px", display: "flex"}}>
          {
            arrivalTime && !isDelayed &&
            <Header as='h6'
            style={{minWidth: "20px", maxWidth: "20px", margin: "auto 0 auto 10px", display: "inline", textAlign: "center"}}>
              { eta > 0 &&
                <span title={new Date(Date.now() + arrivalTime * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit'})}>{ eta } min</span>
              }
              { eta <= 0 &&
                <span>Due</span>
              }
            </Header>
          }
          {
            arrivalTime && isDelayed &&
            <Header as='h6'
            style={{minWidth: "20px", maxWidth: "20px", margin: "auto 0 auto 10px", display: "inline", textAlign: "center"}}>
              <span>? ? ?</span>
            </Header>
          }
          {
            !arrivalTime &&
            <div style={{minWidth: '14px'}}></div>
          }
          { activeBranches.map((obj, index) => {
              return this.renderLine(obj, index, branchStart, branchEnd);
            })
          }
          <Header as='h5' className='station-name' style={{opacity: opacity}}>
            {
              stop &&
              <Link to={`/stations/${stop.id}`}>
                { stop.name.replace(/ - /g, "–") }
                {
                  showSecondaryName &&
                  <span className='secondary-name'>
                    {stop.secondary_name}
                  </span>
                }
                { accessibilityIcon(accessibleStations, elevatorOutages, stop.id) }
              </Link>
            }
          </Header>
          <div style={{display: "inline-block", margin: "auto 0", opacity: opacity}} className='transfers'>
            {
              transfers?.map((route) => {
                const train = trains[route.id];
                return (
                  <TrainBullet link={true} id={route.id} key={train.name} name={train.name} color={train.color}
                    textColor={train.text_color} size='small' directions={route.directions} />
                )
              })
            }
            {
              stop?.bus_transfers?.map((b) => {
                return (
                  <Label key={b.route} color={b.sbs ? 'blue' : 'grey'} size='small'>
                    <Icon name={b.airport_connection ? 'plane' : 'bus'} />
                    {b.route}
                  </Label>
                );
              })
            }
            {
              stop?.connections?.map((c) => {
                return (
                  <Label key={c.name} basic size='small'>
                    <Icon name={c.mode} />
                    {c.name}
                  </Label>
                );
              })
            }
          </div>
        </div>
      </li>
    )
  }
}
export default withRouter(TrainMapStop);