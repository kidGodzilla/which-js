#!/usr/bin/env nodejs

// Todo: parameters
// Significance Constantant
// Connection string (MongoDB)
var connectionString = '<insert-connection-string-here>'; // Example: '<username>:<password>@server.mlab.com:35592/<dbname>'

var bodyParser = require('body-parser');
var express = require('express');
var app = express();

// Options middleware
app.use(function (req, res, next) {
    if (req.method === 'OPTIONS') {
        var headers = {};
        headers["Access-Control-Allow-Origin"] = "*";
        headers["Access-Control-Allow-Methods"] = "POST, GET, PUT, DELETE, OPTIONS";
        headers["Access-Control-Allow-Credentials"] = true;
        headers["Access-Control-Max-Age"] = '86400'; // 24 hours
        headers["Access-Control-Allow-Headers"] = "Accept,Authorization,Cache-Control,Content-Type,DNT,If-Modified-Since,Keep-Alive,Origin,User-Agent,X-Requested-With,X-HTTP-Method-Override";
        res.writeHead(204, headers);
        res.end();
    } else {
        next();
    }
});

app.use(bodyParser.urlencoded({ extended: false })); // parse application/x-www-form-urlencoded
app.use(bodyParser.json()); // parse application/json
app.use(require('cors')()); // Rest of CORS

// Todo: Parameterize creds, loser
var db = require('monk')(connectionString);


app.get('/winners', function (req, res) {

	var whichJS = db.get('which-js');
	var winners = {};

	whichJS.find({}).then(function (docs) {

		// Check to see if we have any statistically-significant winners
		docs.forEach(function (doc) {
			delete doc['_id'];
			var key = doc['key'];
			delete doc['key'];
			// console.log(doc);

			var max = 0, closest = 0, maxKey = '';

			// Iterate through keys.
			Object.keys(doc).forEach(function (k) {
				var val = doc[k];
				if (val > max) {
					closest = max;
					maxKey = k;
					max = val;
				}
			});

			if (max - closest > 64) winners[key] = maxKey; // Statistically-significant variance constant for sample size of 1,000 votes
			// console.log(max, closest, maxKey);

		});
		
		// Return all the winners
		res.send(winners);
	});
});


app.post('/feedback', function (req, res) {
	var body = req.body;
	var key = body.key;
	var value = body.value;

	if (value == 'key') return; // WTF don't do this..

	var whichJS = db.get('which-js');

	// Create key or increment value
	whichJS.find({ key: key }).then(function (docs) {
		if (docs && docs.length) {
			var doc = docs[0];
			var c = parseInt(doc[value]);

			if (c) {
				doc[value] = ++c;
			} else {
				doc[value] = 1;
			}

			whichJS.findOneAndUpdate({key: key}, doc);
			res.send('ok');
			
		} else {
			var obj = {
				key: key
			};

			obj[value] = 1;

			whichJS.insert(obj);
			res.send('ok');
		}
	});
});


/**
 * Start Server
 */
app.listen(3000, function () {
    console.log('App listening on port 3000!')
});
