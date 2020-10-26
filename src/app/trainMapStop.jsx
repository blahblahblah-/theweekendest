import React from 'react';
import { Header } from 'semantic-ui-react';
import TrainBullet from './trainBullet.jsx';
import { withRouter, Link } from "react-router-dom";

import { accessibilityIcon } from './utils/accessibility.jsx';

class TrainMapStop extends React.Component {

  renderStop() {
    const { southStop, northStop, stop, accessibleStations, displayAccessibleOnly } = this.props;

    const opacity = !displayAccessibleOnly || accessibleStations.north.includes(stop.id + 'N') || accessibleStations.south.includes(stop.id + 'S') ? 1 : 0.2;

    if (southStop && northStop) {
      return (
        <Link to={`/stations/${stop.id}`}>
          <div style={{border: "1px #999 solid", height: "10px", width: "10px", borderRadius: "50%", opacity: opacity,
            position: "relative", backgroundColor: "white", left: "5px", top: "20px", cursor: "pointer"}}>
          </div>
        </Link>
      )
    }

    if (northStop) {
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
    const branchStartHere = branchStart !== null && branchStart == index;
    const branchEndHere = branchEnd !== null && branchEnd == index;
    const marginValue = "20px";
    const branching = branchStartHere || branchEndHere;
    const margin = branching ? ("0 0 0 " + marginValue) : (arrivalTime ? ("0 10px") : ("0 " + marginValue));
    let background;

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
      <div key={index} style={{minWidth: (branching ? "120px" : (arrivalTime ? "45px" : "60px")), display: "flex"}}>
        {
          this.renderMainLine(background, margin, stopExists)
        }
        {
          branching &&
          <div style={{margin: "15px 0", height: "20px", width: marginValue, backgroundColor: color, display: "inline-block", alignSelf: "flex-start"}}>
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
    const { stop, transfers, activeBranches, branchStart, branchEnd, arrivalTime, accessibleStations, elevatorOutages, displayAccessibleOnly } = this.props;
    const eta = arrivalTime && Math.round(arrivalTime / 60);
    const opacity = !stop || !displayAccessibleOnly || accessibleStations.north.includes(stop.id + 'N') || accessibleStations.south.includes(stop.id + 'S') ? 1 : 0.2;
    return (
      <li>
        <div style={{minHeight: "50px", display: "flex"}}>
          {
            arrivalTime &&
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
          { activeBranches.map((obj, index) => {
              return this.renderLine(obj, index, branchStart, branchEnd);
            })
          }
          <Header as='h5'
            style={{display: "inline", margin: "auto 0", cursor: "pointer", opacity: opacity}}>
            {
              stop &&
              <Link to={`/stations/${stop.id}`}>
                { stop.name.replace(/ - /g, "–") }
                { accessibilityIcon(accessibleStations, elevatorOutages, stop.id) }
              </Link>
            }
          </Header>
          <div style={{display: "inline-block", margin: "auto 0", opacity: opacity}}>
            {
              transfers && transfers.map((route) => {
                return (
                  <TrainBullet link={true} id={route.id} key={route.name} name={route.name} color={route.color}
                    textColor={route.text_color} size='small' key={route.id} directions={route.directions} />
                )
              })
            }
          </div>
        </div>
      </li>
    )
  }
}
export default withRouter(TrainMapStop);