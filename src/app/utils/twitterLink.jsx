import React from 'react';
import { Icon } from "semantic-ui-react";

const TWITTER_FEEDS_EXCLUDED_TRAINS = ['FS', 'GS', 'SI'];
const TWITTER_FEEDS_MAPPED_TRAINS = {
  '6X': '6',
  '7X': '7',
  'FX': 'F',
  'H': 'A,'
}

export const twitterLink = (trainId) => {
  if (TWITTER_FEEDS_EXCLUDED_TRAINS.includes(trainId)) {
    return;
  }
  const twitterTrainId = TWITTER_FEEDS_MAPPED_TRAINS[trainId] || trainId;
  return (
    <div className="twitter-link">
      <a href={`https://twitter.com/goodservice_${twitterTrainId}`} target="_blank">
        Follow @goodservice_{twitterTrainId}
        <Icon name='twitter' color='blue' />
      </a>
    </div>
  );
};