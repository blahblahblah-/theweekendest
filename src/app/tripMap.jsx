import React from 'react';
import TrainMapStop from './trainMapStop.jsx';
import { cloneDeep } from "lodash";

class TripMap extends React.Component {  
  normalizeTrip(trip, currentTime) {
    const arrivalTimes = trip.stops;
    const sortedStops = Object.keys(arrivalTimes).sort((a, b) => arrivalTimes[a] - arrivalTimes[b]);
    let filteredStops;

    if (trip.is_delayed) {
      const lastStopIndex = trip.last_stop_made && sortedStops.indexOf(trip.last_stop_made);
      filteredStops = lastStopIndex > -1 ? sortedStops.slice(lastStopIndex + 1) : sortedStops;
    } else {
      filteredStops = sortedStops.filter((key) => {
        const estimatedTime = arrivalTimes[key];
        return estimatedTime >= (currentTime - 59);
      })

      const firstStopInFuture = sortedStops.find((a) => a.estimated_time >= currentTime + 30);
      if (firstStopInFuture) {
        const pos = sortedStops.indexOf(firstStopInFuture);
        filteredStops = sortedStops.slice(Math.max(0, pos - 1), sortedStops.length);
      }
    }

    return filteredStops.map((key) => {
      const estimatedTime = arrivalTimes[key];
      return {
        stop_id: key,
        estimated_time: estimatedTime,
      };
    });
  }

  render() {
    const { trip, train, trains, stops, accessibleStations, elevatorOutages } = this.props;
    const currentTime = Date.now() / 1000;
    const tripRoute = this.normalizeTrip(trip, currentTime);
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
                  arrivalTime={Math.max(tripStop.estimated_time - currentTime, 1)} isDelayed={trip.is_delayed}
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