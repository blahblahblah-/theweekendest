import React from 'react';
import { Header } from 'semantic-ui-react';
import TrainBullet from './trainBullet.jsx';

class TrainMapStop extends React.Component {

  renderStop() {
    const { southStop, northStop, stop } = this.props;

    if (southStop && northStop) {
      return (
        <div style={{border: "1px #999 solid", height: "10px", width: "10px", borderRadius: "50%",
          position: "relative", backgroundColor: "white", left: "5px", top: "20px", cursor: "pointer"}}
          onClick={this.handleClick.bind(this, stop)}>
        </div>
      )
    }

    if (northStop) {
      return (
        <div style={{border: "1px #999 solid", height: "5px", width: "10px", borderTopLeftRadius: "10px", 
          orderTopRightRadius: "10px", position: "relative", backgroundColor: "white", left: "5px",
          top: "20px", cursor: "pointer"}}
          onClick={this.handleClick.bind(this, stop)}>
        </div>
      )
    }

    return (
      <div style={{border: "1px #999 solid", height: "5px", width: "10px", borderBottomLeftRadius: "10px",
        borderBottomRightRadius: "10px", position: "relative", backgroundColor: "white", left: "5px",
        top: "25px", cursor: "pointer"}} onClick={this.handleClick.bind(this, stop)}>
      </div>
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
    const { color, branchStops} = this.props;
    const stopExists = branchStops[index];
    const branchStartHere = (branchStart && (branchStart == index + 1));
    const branchEndHere = (branchEnd && (branchEnd == index + 1));
    const marginValue = "20px";
    const branching = (branchStartHere !== null || branchEndHere !== null);
    const margin = branching ? ("0 0 0 " + marginValue) : ("0 " + marginValue);
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
      <div key={index} style={{minWidth: (branching ? "120px" : "60px"), display: "flex"}}>
        {
          this.renderMainLine(background, margin, stopExists)
        }
        {
          branching &&
          <div style={{margin: "15px 0", height: "20px", width: marginValue, backgroundColor: color, display: "inline-block", alignSelf: "flex-start"}}>
          </div>
        }
        {
          branchStartHere !== null &&
          <div style={{height: "100%"}} className="branch-corner">
            <div style={{boxShadow: "0 0 0 20px " + color, transform: "translate(-10px, 35px)"}} className="branch-start">
            </div>
          </div>
        }
        {
          branchEndHere !== null &&
          <div style={{height: "50px"}} className="branch-corner">
            <div style={{boxShadow: "0 0 0 20px " + color, transform: "translate(-9px, -35px)"}} className="branch-end">
            </div>
          </div>
        }
      </div>
    )
  }

  handleClick = stop => {
    const { onStationSelect } = this.props;
    onStationSelect(stop.id);
  }

  render() {
    const { stop, transfers, activeBranches, branchStart, branchEnd, onTrainSelect } = this.props;
    return (
      <li>
        <div style={{minHeight: "50px", display: "flex"}}>
          { activeBranches.map((obj, index) => {
              return this.renderLine(obj, index, branchStart, branchEnd);
            })
          }
          <Header as='h5'
            style={{display: "inline", margin: "auto 0", cursor: "pointer"}} onClick={this.handleClick.bind(this, stop)}>
              {stop && stop.name.replace(/ - /g, "–")}
          </Header>
          <div style={{display: "inline-block", margin: "auto 0"}}>
            {
              transfers && transfers.map((route) => {
                return (
                  <TrainBullet link={true} id={route.id} key={route.name} name={route.name} color={route.color}
                    textColor={route.text_color} size='small' key={route.id} onSelect={onTrainSelect} />
                )
              })
            }
          </div>
        </div>
      </li>
    )
  }
}
export default TrainMapStop;