import React from 'react';
import TrainMapStop from './trainMapStop.jsx';
import { cloneDeep } from "lodash";

class TripMap extends React.Component {  
  normalizeTrip(arrivalTimes, currentTime) {
    return arrivalTimes.filter((a) => a.estimated_time >= currentTime).map((a) => {
      a.stop_id = a.stop_id.substr(0, 3);
      return a;
    });
  }

  render() {
    const { trip, train, stops } = this.props;
    const currentTime = Date.now() / 1000;
    const tripRoute = this.normalizeTrip(trip.arrival_times, currentTime);
    return(
      <div>
        <ul style={{listStyleType: "none", textAlign: "left", margin: "auto", padding: 0}}>
          {
            tripRoute.map((tripStop) => {
              const stopId = tripStop.stop_id
              const stop = stops[stopId];
              let transfers = stop && cloneDeep(stop.trains.filter(route => route.id != train.id));
              return (
                <TrainMapStop key={stopId} stop={stop} color={train.color} southStop={true}
                  northStop={false} transfers={transfers} branchStops={[true]} activeBranches={[true]}
                  arrivalTime={tripStop.estimated_time - currentTime}
                  />
              )
            })
          }
        </ul>
      </div>
    )
  }
}
export default TripMap