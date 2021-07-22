import React from 'react';
import TrainMapStop from './trainMapStop.jsx';
import { cloneDeep } from "lodash";

class TripMap extends React.Component {  
  normalizeTrip(arrivalTimes, currentTime) {
    const times = Object.keys(arrivalTimes).sort((a, b) => arrivalTimes[a] - arrivalTimes[b]).filter((key) => {
      const estimatedTime = arrivalTimes[key];
      return estimatedTime >= (currentTime - 59);
    }).map((key) => {
      const estimatedTime = arrivalTimes[key];
      return {
        stop_id: key,
        estimated_time: estimatedTime,
      };
    });

    const firstStopInFuture = times.find((a) => a.estimated_time >= currentTime + 30);
    if (!firstStopInFuture) {
      return times;
    }

   const pos = times.indexOf(firstStopInFuture);
   return times.slice(Math.max(0, pos - 1), times.length);
  }

  render() {
    const { trip, train, trains, stops, accessibleStations, elevatorOutages } = this.props;
    const currentTime = Date.now() / 1000;
    const tripRoute = this.normalizeTrip(trip.stops, currentTime);
    return(
      <div>
        <ul className='trip-map'>
          {
            tripRoute.map((tripStop) => {
              const stopId = tripStop.stop_id
              const stop = stops[stopId];
              let transfersObj = Object.assign({}, stops[stopId]?.routes);
              if (stop?.transfers) {
                stop?.transfers.forEach((s) => {
                  transfersObj = Object.assign(transfersObj, stops[s]?.routes);
                });
              }
              delete transfersObj[train.id];
              const transfers = Object.keys(transfersObj).map((routeId) => {
                return {
                  id: routeId,
                  directions: transfersObj[routeId],
                };
              });
              return (
                <TrainMapStop key={stopId} trains={trains} stop={stop} color={train.color} southStop={true}
                  northStop={false} transfers={transfers} branchStops={[true]} activeBranches={[true]}
                  accessibleStations={accessibleStations} elevatorOutages={elevatorOutages}
                  arrivalTime={Math.max(tripStop.estimated_time - currentTime, 1)}
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