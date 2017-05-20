"use strict";

//To handle case of redirect loop
var maxRedirect = {'maxRedirects': 3}

var request = require('request').defaults(maxRedirect);
var async = require('async');
var url_lib = require('url');
var fs = require('fs');

let match = 'ahref=';
let state = {
	'a': 'a',
	'h': 'ah',
	'r': 'ahr',
	'e': 'ahre',
	'f': 'ahref',
	'=': 'ahref='
};

var valid_protocols = ['http:', 'https:'];

function getURL(url_obj) {
	return (url_obj.protocol + "//" + url_obj.hostname);
}

function crawl(url_array, visited_array) {
	let currently_processing_urls = url_array;
	let urls_to_be_processed = [];
	let visited = visited_array;

	async.eachLimit(currently_processing_urls, 5, function (url, callback) {
		console.log("Crawling : ", url);
		var url_obj = url_lib.parse(url);
		
		request({
			url: url,
			method: 'GET',
			timeout: 60000
		}, function(err, response, body) {
			if(err) {
				console.log(err);
			}
			if(typeof body === 'string') {
				extract_url(getURL(url_obj), body, urls_to_be_processed, visited);
			}
			callback();
		});
		
	}, function(err) {
		if(err) console.log("Error", err);
		
		//To avoid max call stack
		setTimeout(function(urls_to_be_processed, visited) {
			if(urls_to_be_processed.length > 0){
				fs.appendFile('crawl.csv', '\n' + urls_to_be_processed.join('\n'), function (error) {
					if (error) {
						console.log("Error: " , error);
					}
					crawl(urls_to_be_processed, visited);
				});
			} else {
				console.log("Crawling done");
			}
		}, 10, urls_to_be_processed, visited);
	});
}



function extract_url(base_url, body, urls, visited) {
	let temp_href;
	let temp_url
	let current_match = '';
	for(let i = 0; i < body.length; i++) {
		if(body[i] === ' ') {
			//ignore
		} else if(body[i] === '=') {
			temp_href += '=';
			if(temp_href == match) {
				temp_url = '';
				while ((body[i] != '"' && body[i] != "'") && i < body.length) {
					i++;
				}
				i++;
				while ((body[i] != '"' && body[i] != "'") && i < body.length) {
					temp_url += body[i];
					i++;
				}
				let url_obj = url_lib.parse(temp_url);
				if(!url_obj.protocol || valid_protocols.indexOf(url_obj.protocol) >= 0) {
					if(!url_obj.hostname) {
						temp_url = base_url + ((url_obj.path  &&  ((url_obj.path[0] != '/') ? ('/' + url_obj.path) :  url_obj.path)) || '');
					}
					if(!visited[temp_url]) {
						urls.push(temp_url);
						visited[temp_url] = true;
					} else {
						//console.log("URL already visited ", temp_url);
					}
				} else {
					console.log("Error: Not Crawling invalid URL ", url_obj.href);
				}
			}
			temp_href = '';
		} else if (state[body[i]]){
			temp_href += body[i];
		} else {
			temp_href = '';
		}
	}
}

function startCrawling() {
	//over write file if already existed
	fs.writeFile('crawl.csv', 'URLS', function (error) {
		if (error) {
			console.log("Error:" , error);
		}
		//start crawling
		let seed_url_array = ["http://medium.com"];
		let seed_visited_map = {"http://medium.com": true}
		crawl(seed_url_array, seed_visited_map);
	});
}

startCrawling();

//Functions in followed code have not been inplemented
//So the program will not close instantly
process.stdin.resume();
function exitHandler(err) {
	console("Exiting process");
    process.exit();
}

//Do something when app is closing
process.on('exit', exitHandler);

//Catches ctrl+c event
process.on('SIGINT', exitHandler);

//Catches uncaught exceptions
process.on('uncaughtException', exitHandler);