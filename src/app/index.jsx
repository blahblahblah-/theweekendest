import React from "react";
import ReactDOM from "react-dom";
import '../style/app.scss';
import '../vendors/leaflet.polylineoffset.js'
import App from './app.jsx';

document.addEventListener('DOMContentLoaded', () => {
  ReactDOM.render(
    <App />, document.getElementById('index'),
  )
});