import React from "react";
import ReactDOM from "react-dom";
import * as smartbanner from './vendor/smartbanner.min.js';
import './vendor/smartbanner.min.css';
import '../style/app.scss';
import App from './app.jsx';

document.addEventListener('DOMContentLoaded', () => {
  ReactDOM.render(
    <App />, document.getElementById('index'),
  )
});