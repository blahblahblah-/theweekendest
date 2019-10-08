import React from 'react';
import { Segment, Header } from "semantic-ui-react";

class TrainBullet extends React.Component {
  name() {
    return this.props.name.endsWith("X") ? this.props.name[0] : this.props.name
  }

  classNames() {
    if (this.props.size === 'small') {
      return this.props.name.endsWith("X") ? 'small route diamond' : 'small route bullet'
    } else if (this.props.size === 'medium') {
      return this.props.name.endsWith("X") ? 'medium route diamond' : 'medium route bullet'
    }
    return this.props.name.endsWith("X") ? 'route diamond' : 'route bullet'
  }

  innerClassNames() {
    return this.props.name.endsWith("X") ? 'diamond-inner' : ''
  }

  style() {
    if (this.props.textColor) {
      return {
        ...this.props.style,
        backgroundColor: `${this.props.color}`,
        color: `${this.props.textColor}`
      }
    } else {
      return {
        ...this.props.style,
        backgroundColor: `${this.props.color}`
      };
    }
  }

  render() {
    const { id, alternateName } = this.props;
    return(
      <div className={this.classNames()} style={this.style()}>
        <div className={this.innerClassNames()}>{this.name()}<sup>{alternateName}</sup></div>
      </div>
    )
  }
}
export default TrainBullet