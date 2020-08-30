# Tally Timer

Tally timer is a scripty thing that I shittily threw together. It will take in tally data from a control system (in theory connected to a switcher) and record the amount of time in milliseconds that the tally lamp is on. 

##Starting it up
- Clone the repo
- `npm install`
- Change addresses in `index.js`
- `npm start`
- Ask your director why we have 100 cameras when they only use 12

## Controls:
Every time a tally object is updated, the tallies object will be written to disk. However, if you would like to do it manually for fun you can use `ctl+p`.

Additionally, to break and print a report to the console, press `ctl+c` like normal.
