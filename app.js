#!/usr/bin/env node
"use strict";

const Twitter = require("twitter");
const MY_USERNAME = "mutablemind";

const PORT = process.env.PORT || 3000;
const http = require("http");
http.createServer().listen(PORT, console.log("App is running!"));

var client = new Twitter({
	consumer_key: process.env.CONSUMER_KEY,
	consumer_secret: process.env.CONSUMER_SECRET,
	access_token_key: process.env.ACCESS_TOKEN_KEY,
	access_token_secret: process.env.ACCESS_TOKEN_SECRET
});

// perform unsubscribe task once per 1-2 hours
setInterval(unsubscribeFromUnfollowers, randomDelayTimeMin(60,120));

// unsubscribe from those who isn't following back
function unsubscribeFromUnfollowers() {
	getFollowersUsernames.then(filterUnfollowers).then((unfollowers) => unfollowers.forEach(unsubscribe)).catch(console.error);
}

// filter all users who isn't following back
function filterUnfollowers(usernames) {
	return new Promise((res, rej) => {
		client.get("friendships/lookup", { screen_name: usernames },
		(err, data, resp) => {
			if (!err) {
				const unfollowers = data.filter((user) => !user.connections.includes("followed_by"));
				console.log({"action":"friendships/lookup","username":usernames});
				res(unfollowers);
			} else rej(err);
		});
	});
}

// get list of users who is following back
const getFollowersUsernames = new Promise((res, rej) => {
	client.get("followers/list", (err, data, resp) => {
		if (!err) {
			// reduce list of users into csv of usernames
			const usernames = data.users.reduce((acc, cur) => acc + (acc.length ? ", " : "") + cur.screen_name, "");
			console.log({"action":"friendships/list","username":usernames});
			res(usernames);
		} else {
			rej(err);
		}
	});
});

// unsubscribe from user
function unsubscribe(user) {
	return new Promise((res, rej) => {
		client.post("friendships/destroy",
		{ screen_name: user.screen_name },
		(err, data, resp) => {
			if (!err) {
				console.log({"action":"friendships/destroy","username":user.screen_name});
				res(true);
			}
			else rej(err);
		});
	});
}

// user stream is used to handle primary action triggered by the user
const user_stream = client.stream("user");
// handle event on follow
user_stream.on("follow", (event) => {
	const username = event.source.screen_name;
	// incomming request
	if (username != MY_USERNAME) {
		const delayTime = randomDelayTimeMin(20,50);
		setTimeout(sendDirect(username), delayTime);

		const followers = event.source.followers_count;
		const followings = event.source.friends_count;
		// Avoid bot or fake account following
		if (isValidForFollowingBack(followers,followings)) {
			setTimeout(follow(username), delayTime);
		}
	}
});
// handle occured error while streaming
user_stream.on("error", (err) => { throw err });
// send direct message to user
function sendDirect(username) {
	return new Promise((res, rej) => {
		client.post("direct_messages/new",
		{ screen_name: username, text: "Thanks for following me on twitter (˘▾˘~)"},
		(err, data, resp) => {
			if (!err) console.log({"action":"direct_messages/new", "username":username});
			else throw err;
		});
	});
}
// follow the user
function follow(username) {
	return new Promise((res,rej) => {
		client.post("friendships/create", {
			screen_name: username,
			follow: true
		}, (err, data, res) => {
			if (!err) console.log({"action":"friendships/create", "username":username});
			else throw err;
		});
	});
}

// generate random value of minutes
function randomDelayTimeMin(min,max) {
	return random(min * 60000, max * 60000);
}
// generate random value
function random(min,max) {
	return Math.floor((Math.random() * max) + min);
}
// check on validity
function isValidForFollowingBack(followers, followings) {
	const ratio = user_followers / user_followings;
	if (ratio < 0.8) return true;
	else return false;
}
