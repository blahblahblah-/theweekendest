import React from 'react';
import { Icon } from "semantic-ui-react";

export const accessibilityIcon = (accessibleStations, elevatorOutages, stationId) => {
  const accessibleNorth = accessibleStations.north.includes(stationId);
  const accessibleSouth = accessibleStations.south.includes(stationId);
  const outages = elevatorOutages[stationId];

  if (outages) {
    return (
      <span className='accessible-icon'>
        <Icon.Group>
          <Icon name='accessible' color='blue' title='This station is accessible' />
          <Icon corner name='warning' color='red' title='Elevator outage at this station' />
        </Icon.Group>
      </span>
    );
  }

  if (accessibleNorth && accessibleSouth) {
    return (
      <span className='accessible-icon'>
        <Icon name='accessible' color='blue' title='This station is accessible' />
      </span>
    );
  }
    
  if (accessibleNorth && !accessibleSouth) {
    return (
      <span className='accessible-icon'>
        <Icon.Group>
          <Icon name='accessible' color='blue' title='This station is partially accessible' />
          <Icon corner name='caret up' title='' />
        </Icon.Group>
      </span>
    );
  }

  if (!accessibleNorth && accessibleSouth) {
    return (
      <span className='accessible-icon'>
        <Icon.Group>
          <Icon name='accessible' color='blue' title='This station is partially accessible' />
          <Icon corner name='caret down' title='' />
        </Icon.Group>
      </span>
    );
  }
}