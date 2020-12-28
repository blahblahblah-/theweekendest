import React from 'react';
import { Button, Icon, Segment, Input } from "semantic-ui-react";
import transfers from '../data/transfers.json';

class TripPlanner extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  getDirections(from, to, stationsVisited, tripsChecked, stationsSequence, startTime) {
    if (stationsVisited.length >= 3) {
      return;
    }

    const { stations } = this.props;
    const earliestTime = startTime || (Date.now() / 1000);
    const fromConnectedStations = [from].concat(transfers[from] && Object.keys(transfers[from]));
    const toConnectedStations = [to].concat(transfers[to] && Object.keys(transfers[to]));
    const trips = this.getAllUpcomingTrips(from, earliestTime);
    const routingChecked = new Set();

    const results = trips.filter((trip) => {
      if (tripsChecked.includes(trip.id)) {
        return;
      }
      const routing = JSON.stringify(Object.keys(trip.times));
      if (!routingChecked.has(routing)) {
        const fromStation = fromConnectedStations.find((s) => trip.times[s + 'N'] || trip.times[s + 'S']);
        const toStation = toConnectedStations.find((s) => trip.times[s + 'N'] || trip.times[s + 'S']);
        const fromTime = trip.times[fromStation + 'N'] || trip.times[fromStation + 'S'];
        const toTime = trip.times[toStation + 'N'] || trip.times[toStation + 'S'];

        routingChecked.add(routing);
        return toTime && toTime > fromTime;
      }
    }).map((trip) => {
      const fromStation = fromConnectedStations.find((s) => trip.times[s + 'N'] || trip.times[s + 'S']);
      const toStation = toConnectedStations.find((s) => trip.times[s + 'N'] || trip.times[s + 'S']);

      return [Object.assign({ fromStation: fromStation, toStation: toStation }, trip)];
    });

    if (results.length > 0) {
      return results;
    }

    routingChecked.clear();
    const newStationsVisited = stationsVisited.concat([from]);
    const reversedStationsSequence = stationsSequence && stationsSequence.slice().reverse();
    const newTripsChecked = trips.map((trip) => trip.id);

    const tripResults = [];

    trips.filter((trip) => !tripsChecked.includes(trip.id)).forEach((trip) => {
      const routing = this.normalizeTrip(fromConnectedStations, Object.keys(trip.times));
      if (stationsSequence && this.isSubArray(routing, reversedStationsSequence)) {
        return;
      }
      if (routing.length > 0 && !routingChecked.has(routing)) {
        routingChecked.add(routing);
        const fromStation = fromConnectedStations.find((s) => trip.times[s + 'N'] || trip.times[s + 'S']);
        const r = routing.filter((s) => !newStationsVisited.includes(s)).forEach((s) => {
          const i = routing.indexOf(s);
          const newStationsSequenced = routing.slice(0, i + 1);
          const newEarliestTime = trip.times[s + 'N'] || trip.times[s + 'S'];
          const result = this.getDirections(s, to, newStationsVisited, newTripsChecked, newStationsSequenced, newEarliestTime);
          if (result && result.length > 0) {
            result.map((t) => [Object.assign({ fromStation: fromStation, toStation: s}, trip)].concat(t)).forEach((t) => tripResults.push(t));
          }
        });
      }
    })
    // if (tripResults.length > 0) {
      return tripResults;
    // }
  }

  isSubArray(trip, stationsSequence) {
    return stationsSequence.every((i => v => i = trip.indexOf(v, i) + 1)(0));
  }

  normalizeTrip(connectedStations, routing) {
    const normalizedRouting = routing.map((s) => s.substr(0, 3));
    const matchedStation = connectedStations.find((s) => normalizedRouting.includes(s));
    const index = normalizedRouting.indexOf(matchedStation);
    return normalizedRouting.slice(index + 1);
  }

  getAllUpcomingTrips(stationId, earliestTime) {
    const connectedTransfers = Object.assign({ [stationId]: 0 }, transfers[stationId]);
    const connectedStations = Object.keys(connectedTransfers);
    const trips = connectedStations.flatMap((s) => {
      const transferTime = connectedTransfers[s];
      return this.getUpcomingTrips(s, earliestTime + transferTime);
    });

    return trips.sort((a, b) => {
      const aTime = connectedStations.map((s) => a.times[s + 'N'] || a.times[s + 'S']).find((t) => t);
      const bTime = connectedStations.map((s) => b.times[s + 'N'] || b.times[s + 'S']).find((t) => t);

      return aTime - bTime;
    });
  }

  getUpcomingTrips(stationId, earliestTime) {
    const { arrivals, stations } = this.props;
    const station = stations[stationId];
    const results = [];

    if (!station) {
      return [];
    }

    station.northStops.forEach((trainId) => {
      if (arrivals[trainId] && arrivals[trainId].trains.north) {
        arrivals[trainId].trains.north.forEach((trip) => {
          const time = trip.times[stationId + 'N'] || trip.times[stationId + 'S'];

          if (time > earliestTime) {
            const dupeTrip = Object.assign({ route: trainId, direction: 'north'}, trip);
            results.push(dupeTrip);
          }
        });
      }
    });

    station.southStops.forEach((trainId) => {
      arrivals[trainId].trains.south.forEach((trip) => {
        const time = trip.times[stationId + 'N'] || trip.times[stationId + 'S'];

        if (time > earliestTime) {
          const dupeTrip = Object.assign({ route: trainId, direction: 'south'}, trip);
          results.push(dupeTrip);
        }
      });
    });

    return results.sort((a, b) => {
      const aTime = a.times[stationId + 'N'] || a.times[stationId + 'S'];
      const bTime = b.times[stationId + 'N'] || b.times[stationId + 'S'];

      return aTime - bTime;
    });
  }

  sortDirections(directions) {
    return directions.sort((a, b) => {
      const aLast = a[a.length - 1].toStation;
      const bLast = b[b.length - 1].toStation;
      const aTime = a[a.length - 1].times[aLast + 'N'] || a[a.length - 1].times[aLast + 'S'];
      const bTime = b[b.length - 1].times[bLast + 'N'] || b[b.length - 1].times[bLast + 'S'];

      return aTime - bTime;
    });
  }

  handleInputChange = (e, { name, value }) => {
    this.setState({ [name]: value });
  }

  handleGo = () => {
    const { from, to } = this.state;

    const directions = this.sortDirections(this.getDirections(from, to, [], []));
    this.setState({ directions: directions });
  }

  render() {
    const { directions } = this.state;
    return (
      <Segment>
        <Input placeholder='From' name='from' onChange={this.handleInputChange} />
        <Input placeholder='To' name='to' onChange={this.handleInputChange} />
        <Button onClick={this.handleGo}>Go</Button>
        <Segment>
          directions: <div dangerouslySetInnerHTML={{ __html: "<pre>" + JSON.stringify(directions, null, 2) + "</pre>"}}></div>
        </Segment>
      </Segment>
    );
  }
}

export default TripPlanner;