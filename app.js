var express = require('express');
var app = express();

app.get('/', function (req, res) {
	  res.send('Hello World!');
});

app.listen(3000, function () {
	  console.log('Example app listening on port 3000!');
});

var Twitter = require('twitter');
var MY_USERNAME = "nrdwnd";

var client = new Twitter({
	consumer_key: process.env.CONSUMER_KEY,
	consumer_secret: process.env.CONSUMER_SECRET,
	access_token_key: process.env.ACCESS_TOKEN_KEY,
	access_token_secret: process.env.ACCESS_TOKEN_SECRET
});
console.log(process.env.ACCESS_TOKEN_SECRET);
var stream = client.stream('user');

stream.on('follow', function(event) {
	var username = event.source.screen_name;
	if (username == MY_USERNAME) return;
	client.post('direct_messages/new', 
			{
				screen_name: username, 
				text: "Thanks  for following me on twitter! Let's connect here also instagram.com/nrdwnd ! Have a great day :-)"
			}, function(err, data, response) {
				if (err != null) throw err;
			});
});

stream.on('error', function(error) {
	  throw error;
});
