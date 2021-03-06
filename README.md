# Smart Flight Search
The aim of this app is to find the cheapest prices for all possible combinations of flights between given sources, destinations, journey start and end dates.

All the data is pulled from Student Universe website.

This app can be accessed on a command line or on a browser.

## Installation
* Install NodeJS
* Download the zip file or clone the repository
* run `npm install` in the home directory of the app
* install bower package manager globally `npm install -g bower`
* run `bower install` in the home directory of the app

## Usage
`index.js` is the main file and can run both as a command line utility or as web server.
### On Command line / Terminal / Command Prompt
The syntax of the command is `node index.js <source_airports> <destination_airports> <journey_start_dates> [<journey_end_dates>]`

For example, 

`node index.js   PHX   HYD,BLR,BOM  2015-12-24T00:00:00.000,2015-12-25T00:00:00.000   2016-01-16T00:00:00.000,2016-01-17T00:00:00.000` or 

`node index.js   PHX   HYD,BLR,BOM  2015-12-24T00:00:00.000,2015-12-25T00:00:00.000` for one way trips.
Each argument is comma separated if there are multiple values. The program makes asynchronous HTTP calls to StudentUniverse website and displays the results one per line.

### As a web server
`node index.js` without any arguments starts a web server and by default listens on port 3000.
To access the site, open a browser and visit http://localhost:3000.

The prefilled form shows the format of the input expected. 
To get the airport codes, i.e. PHX for Phoenix, visit student universe and perform a search.

The progress of the entire operation is shown in the alert section.

## Contribution
I created this as a fun project for saving time for myself trying to find the best deals in situations where we are open for mulitple dates and locations.
Feel free to clone the repository and submit a pull request if you would like to contribute as developer. Thanks to Student Universe website for providing such a simple API.
