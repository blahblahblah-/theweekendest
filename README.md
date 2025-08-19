# subwaynow-web (formerly The Weekendest)

This is a React app that relies heavily on [subwaynow-server](https://github.com/blahblahblah-/subwaynow-server)'s APIs to dynamically generate real-time route maps for the New York City subway with the help of Mapbox, particularly useful when service changes regularly occur on weekends and overnights.

A Mapbox theme was created for this project and has been made public.

See it live at [https://www.subwaynow.app](https://www.subwaynow.app/).

## Running locally

* Sign up for an account with [Mapbox](https://www.mapbox.com), get a token and add it to an `.env` file as `MAPBOX_TOKEN`.

* Download [Stations.csv](http://web.mta.info/developers/data/nyct/subway/Stations.csv) from the MTA's website and drop it in `/src/data/files`

* To have nice looking paths, download the GTFS schedule files from MTA at [http://web.mta.info/developers/developer-data-terms.html](http://web.mta.info/developers/developer-data-terms.html) (agree to the terms, look for "GTFS" then download the data for New York City Transit). You'd need to parse out the `shapes.txt` file from the GTFS package. I wrote a script that takes .csv files to generate these paths. Each .csv file is expected to be a contiguous path for a train route. I took the first shape path (with some exceptions) for each route in `shapes.txt` and dumped each into its own .csv file before running it.

`````
ruby src/data/generate_json.rb
ruby src/data/generate_transfers_json.rb
yarn install
yarn start
`````

Inspirations:
* [http://web.mta.info/weekender/servicestatus.html](http://web.mta.info/weekender/servicestatus.html)
* [https://subwayweekender.wordpress.com](https://subwayweekender.wordpress.com)
* [https://www.i-want-to-ride-an-electric-citi.bike](https://www.i-want-to-ride-an-electric-citi.bike)
* [https://saadiqm.com/2018/03/28/react-mapbox-gl-js-updating-data-source.html](https://saadiqm.com/2018/03/28/react-mapbox-gl-js-updating-data-source.html)
* [https://blog.mapbox.com/mapping-the-dc-metro-d4da611555e8](https://blog.mapbox.com/mapping-the-dc-metro-d4da611555e8)

Subway Route Symbols ®: Metropolitan Transportation Authority. Used with permission.