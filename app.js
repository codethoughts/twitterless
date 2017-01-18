#!/usr/bin/env node
"use strict";

var express = require("express");
var app = express();
var Twitter = require("twitter");
var MY_USERNAME = "mutablemind";
var _ = require("lodash");
const request = require('request-promise');
var request_ip = require("request-ip");
var dbip = require("dbip");

var client = new Twitter({
	consumer_key: process.env.CONSUMER_KEY,
	consumer_secret: process.env.CONSUMER_SECRET,
	access_token_key: process.env.ACCESS_TOKEN_KEY,
	access_token_secret: process.env.ACCESS_TOKEN_SECRET
});

const isTweet = _.conforms({
	contributors: _.isObject,
	id_str: _.isString,
	text: _.isString
})


app.set("port", (process.env.PORT || 5000));

app.get("/", function (req, res) {
	var ip = request_ip.getClientIp(req);
	dbip(ip).then(ip_info => {
		console.log({"event": "Request / redirected", "ip_info": ip_info});
	});
	res.redirect("http://twitter.com/"+MY_USERNAME);
});

app.listen(app.get("port"), function () {
	console.log("App is running on " + app.get("port") + " port");
	setInterval(unsubscribeFromUnfollowers, randomDelayTimeMs(20,60));
});

var getUnfollowers = new Promise((resolve,reject) => {
	// get sync list of unsubscribed users
	client.get("followers/list", {screen_name: MY_USERNAME, count: 100},
			(err, data, res) => {
				const friends = data.users.filter((user) => { return !user.following });
				err ? reject(err) : resolve(friends);
			}
		);
});

function unsubscribeFromUnfollowers() {
	getUnfollowers.then((users) => {
		users.forEach((user)=>{
			client.post("friendships/destroy", { screen_name: user.screen_name },
			(err, data, res) => {
				if (!err) console.log({"event":"DESTROY CONNECTION "+user.screen_name});
				else console.error(err);
			});
		});
	}).catch((err) => {
		console.error(err)
	});
}

// User stream is used to handle primary action triggered by the user
var user_stream = client.stream("user");
// Handle follow event
user_stream.on("follow", function(event) {
	var username = event.source.screen_name;
	if (username == MY_USERNAME) return;
	var delayTime = randomDelayTimeMs(40,120);
	setTimeout(function(){
		client.post("direct_messages/new",
			{
				screen_name: username,
				text: "Thanks for following me on twitter (˘▾˘~) "
			}, function(error, data, response) {
				if (!error) console.log({"event":"SEND DIRECT TO "+username});
				else console.error(error);
			});
	},delayTime);

	// Avoid bot or fake account following
	var user_followers = event.source.followers_count;
	var user_followings = event.source.friends_count;
	var ratio = user_followers / user_followings;
	if (ratio < 1.0) return;
	setTimeout(function(){
		client.post("friendships/create", {
			screen_name: username,
			follow: true
		}, function(error, data, response) {
			if (!error) console.log({"event":"FOLLOW "+username});
			else console.error(error);
		});
	},delayTime);
});

user_stream.on("error", function(error) {
	  console.error(error);
});

var TECH_STRINGS = require("./keywords.js").tech();

// Statuses stream is used to filter twits  according to the given tracking request
var tech_stream = client.stream("statuses/filter",
		{
			track: "technology",
			track: "react.js,node.js,nomad,business,technology", 
			language: "en",
			filter_level: "medium"
		},
		function(stream) {
			stream.on("data", function(event) {
				var status_id = event.id;
				var user = event.user;
				var delayTime = randomDelayTimeMs(10,600);
				if (isUserValidByFollowers(user,1000)) {
					var url = event.urls.url;
					var now = new Date().getTime();
					var time = new Date(now + delayTime);
					console.log({"event": "LIKE", "url": url,"time": time});
					setTimeout(function () {
						client.post("favorites/create", {id: status_id},
							function(error, data, response) {
								if (!error) console.log({"event":"LIKE "+status_id});
								else console.error(error);
							});
					},delayTime);
			}
		});

			stream.on("error", function(error) {
				console.error(error);
			});
		}
);

var randomDelayTimeMs = function (min,max) {
	return random(min*60000,max*60000);
}

var random = function (min,max) {
	return Math.floor((Math.random() * max) + min);
}

var isUserValidByFollowers = function (user,count) {
	return (user != null && user.followers_count > count ? true : false);
}
