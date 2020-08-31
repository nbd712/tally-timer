const net = require('net');
const bsplit = require('buffer-split')
const jspack = require('jspack').jspack
const keypress = require('keypress')
const fs = require('fs');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
//const parser = require('packet').createPacketizer().createParser();

keypress(process.stdin);
var tallies = {};
const file_date = new Date();
const month = file_date.getMonth();
const day = file_date.getDate();
const year = file_date.getFullYear();
const hours = file_date.getHours();
const minutes = file_date.getMinutes();
const path_pfx = `./${month}-${day}-${year}-${hours}-${minutes}`

class Index {
	constructor(tally_obj) {
		this.duration = 0;
		this.timer1 = null;
		this.updateControl(tally_obj);
		this.counter = 0;
	}

	updateControl(obj) {
		this.rh_tally = obj.control.rh_tally;
		this.lh_tally = obj.control.lh_tally;
		this.text_tally = obj.control.text_tally;
		this.brightness = obj.control.brightness;
		this.text = obj.TEXT;
		this.index = obj.INDEX[0];

		if (this.text_tally > 0 || this.rh_tally > 0 || this.lh_tally > 0) {
			//two options, start timer if not running or do nothing
			if (this.timer1 == null) { //timer stopped
				console.log(this.text + ' => PGM')
				this.counter ++;
				this.timer1 = Date.now();
				writeToDisk()
			} else {
				//pass
			}
		} else {
			//two options, either stop timer if running, or do nothing
			if (this.timer1 != null) {
				console.log(this.text + " => Null") //Sorry not sorry.
				this.duration += Date.now() - this.timer1;
				this.timer1 = null;
				writeToDisk()
			} else {
				//pass
			}
			
		}
	}	
}

var client = new net.Socket();
client.connect(6969, "10.8.60.61", () => {
	console.log('Connected');
	console.clear();
})
client.on('data', (data) => {
	delim = new Buffer.from([0xfe, 0x02]);
	var spl_data = bsplit(data, delim);
	spl_data.forEach((data) => {
		if (data.length > 0 ) {
			parse(data);
		}
	})
})

client.on('close', () => {
	console.log("Socket closed.")
})

var parse = function(data) {
	if (data.length > 12) {

		tallyobj = {};

		var cursor = 0;

		//Message Format
		const _PBC = 2 //bytes
		const _VAR = 1
		const _FLAGS = 1
		const _SCREEN = 2
		const _INDEX = 2
		const _CONTROL = 2

		//Display Data
		const _LENGTH = 2

		tallyobj.PBC = jspack.Unpack( "<H", data, cursor);
		cursor += _PBC;

		tallyobj.VAR = jspack.Unpack( "<B", data, cursor);
		cursor += _VAR;

		tallyobj.FLAGS = jspack.Unpack( "<B", data, cursor);
		cursor += _FLAGS;

		tallyobj.SCREEN = jspack.Unpack( "<H", data, cursor);
		cursor += _SCREEN;

		tallyobj.INDEX = jspack.Unpack( "<H", data, cursor);
		cursor += _INDEX;

		tallyobj.CONTROL = jspack.Unpack( "<H", data, cursor);
		cursor += _CONTROL;
		//console.log(CONTROL[0] >> 0&2b1)

		tallyobj.control = {};
		tallyobj.control.rh_tally = (tallyobj.CONTROL >> 0 & 0b11);
		tallyobj.control.text_tally = (tallyobj.CONTROL >> 2 & 0b11);
		tallyobj.control.lh_tally = (tallyobj.CONTROL >> 4 & 0b11);
		tallyobj.control.brightness = (tallyobj.CONTROL >> 6 & 0b11);
		tallyobj.control.reserved = (tallyobj.CONTROL >> 8 & 0b1111111);
		tallyobj.control.control_data = (tallyobj.CONTROL >> 15 & 0b1);

		var LENGTH = jspack.Unpack( "<H", data, cursor)
		cursor += _LENGTH;

		tallyobj.TEXT = jspack.Unpack( "s".repeat(LENGTH), data, cursor)

		if (tallyobj.TEXT != undefined) {
			tallyobj.TEXT = tallyobj.TEXT.join("")
			//console.log(tallyobj.INDEX + " " + tallyobj.TEXT + " " + tallyobj.CONTROL);
			if (tallyobj.INDEX.toString() in tallies) {
				tallies[tallyobj.INDEX.toString()].updateControl(tallyobj);
			} else {
				tallies[tallyobj.INDEX.toString()] = new Index(tallyobj);
			}

		};

		
	}
}

var writeToDisk = function() {
	let path = `${path_pfx}.json`
  	fs.writeFileSync(path, JSON.stringify(tallies, null, 2))
}

var writeCSVToDisk = function(data) {
	let write_data = data.join("\n")
	let path = `${path_pfx}.csv`
	fs.writeFileSync(path, write_data)
}

function msToTime (ms) {
        var seconds = (ms/1000);
        var minutes = parseInt(seconds/60, 10);
        seconds = seconds%60;
        var hours = parseInt(minutes/60, 10);
        minutes = minutes%60;
        
        return hours + ':' + minutes + ':' + seconds;
    }


process.stdin.on('keypress', function (ch, key) {
  //console.log('got "keypress"', key);
  if (key && key.ctrl && key.name == 'c') {
  	var csv_data = ["index, text, duration, counter"];
  	console.clear();
  	console.log()
  	console.log("Printing report:")
  	console.log("Start time: " + file_date)
  	console.log("End time: " + new Date())
  	Object.values(tallies).forEach((item) => {
  		console.log(`${item.text} has been on ${item.counter} times for ${msToTime(item.duration)}`)
  		csv_data.push(`${item.index},${item.text},${item.duration},${item.counter}`);
  	})
  	//console.log('csv_data', csv_data);
  	writeCSVToDisk(csv_data);
    process.stdin.pause();
    process.exit();
  }
  if (key && key.ctrl && key.name == "p") {
  	console.log('Writing to disk...')
  	writeToDisk();
  }
});
 
process.stdin.setRawMode(true);
process.stdin.resume();

