#!/usr/bin/env node
var express = require('express');
var app = express();

app.set('port', (process.env.PORT || 3000));

app.get('/', function (req, res) {
	  res.redirect("http://twitter.com/nrdwnd");
});

app.listen(app.get("port"), function () {
	  console.log('Example app listening on port '+app.get("port"));
});

var Twitter = require('twitter');
var MY_USERNAME = "nrdwnd";

var client = new Twitter({
	consumer_key: process.env.CONSUMER_KEY,
	consumer_secret: process.env.CONSUMER_SECRET,
	access_token_key: process.env.ACCESS_TOKEN_KEY,
	access_token_secret: process.env.ACCESS_TOKEN_SECRET
});

var stream = client.stream('user');

stream.on('follow', function(event) {
	var username = event.source.screen_name;
	if (username == MY_USERNAME) return;
	client.post('direct_messages/new', 
			{
				screen_name: username, 
				text: "Thanks for following me on twitter :3 Let's connect here also instagram.com/nrdwnd! Have a great day :-)"
			}, function(err, data, response) {
				if (err != null) throw err;
			});
});

stream.on('error', function(error) {
	  throw error;
});
