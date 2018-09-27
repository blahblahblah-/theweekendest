import React from 'react';
import { Map, Marker, Popup, TileLayer } from 'react-leaflet'

class MapContainer extends React.Component {
  state = {
    lat: 40.732338,
    lng: -74.000495,
    zoom: 13,
  }

  render() {
    const position = [this.state.lat, this.state.lng]
    return (
      <Map center={position} zoom={this.state.zoom} style={{height: 700}}>
        <TileLayer
          attribution="&amp;copy <a href=&quot;http://osm.org/copyright&quot;>OpenStreetMap</a> contributors"
          url="https://stamen-tiles-{s}.a.ssl.fastly.net/toner/{z}/{x}/{y}.png"
        />
        <Marker position={position}>
          <Popup>
            A pretty CSS3 popup. <br /> Easily customizable.
          </Popup>
        </Marker>
      </Map>
    )
  }
}

export default MapContainer