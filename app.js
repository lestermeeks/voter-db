var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var util = require('util');
const MongoClient = require('mongodb').MongoClient;

var apiRouter = require('./route/api');
var frameRouter = require('./route/frame');
var voterRouter = require('./route/voter');

//var voter_utilities = require('./tools/voter_utilities');

var app = express();

var currentUpdateRequest = null;
var updateRequestList = [];

var app_settings = {
	wa_voter_db: null,
	stats: null,
	db_counts: {},
	current_last_seen: "10/31/2018",
	current_election: "2019-02-12",
	//as_of: "11/02/2018",
	as_of:"11/30/2018",
	elections: [
		{date: '2018-11-06', desc:'2018: Midterm Election'},
		//{date: '2018-08-07', desc:'2018: State Primary'},
		{date: '2017-11-07', desc:'2017: General Election'},
		//{date: '2017-08-01', desc:'08/01/2017: Primary Election'},
		{date: '2016-11-08', desc:'2016: Trump/Clinton Election'},
		//{date: '2016-08-02', desc:'08/02/2016: State Primary'},
		//{date: '2016-05-24', desc:'05/24/2016: Presidential Primary'},
		//{date: '2016-02-09', desc:'02/09/2016: Special Election'},
		{date: '2015-11-03', desc:'2015: General Election'},
		//{date: '2015-08-04', desc:'08/04/2015: Primary Election'},
		//{date: '2015-02-10', desc:'2015: Special Election'},
		//{date: '2014-11-04', desc:'2014: Midterm Election'},
		//{date: '2013-08-06', desc:'2013 State Primary'},
		//{date: '2014-02-11', desc:'2014 Special Election'}
		//{date: '2012-11-06', desc:'2012: Obama/Romney Election'},
		//{date: '2011-11-08', desc:'2011 General Election'},
		//{date: '2011-08-16', desc:'2011 Primary Election'},
		//{date: '2010-11-02', desc:'2010: Midterm Election'},
		//{date: '2010-08-17', desc:'2010 Midterm Primary'},
		//{date: '2010-02-09', desc:'2010 Special Election'},
		//{date: '2009-11-03', desc:'2009 General Election'},
		//{date: '2008-11-04', desc:'2008: Obama/McCain Election'},
		//{date: '2008-08-19', desc:'2008 Special Election'},
		//{date: '2008-02-19', desc:'2008 State Primary'},
		//{date: '2007-11-06', desc:'2007 General Election'},
	],
	counties: [
		{code: 'AD', name: 'Adams',    voter_count: 6706, ballot_count: 2431},
		{code: 'AS', name: 'Asotin',   voter_count: 14604, ballot_count: 5894},
		{code: 'BE', name: 'Benton',   voter_count: 108592, ballot_count: 40394},
		{code: 'CH', name: 'Chelan',   voter_count: 43849, ballot_count: 20044},
		{code: 'CM', name: 'Clallam',  voter_count: 51833, ballot_count: 25394},
		{code: 'CR', name: 'Clark',    voter_count: 279251, ballot_count: 100903},
		{code: 'CU', name: 'Columbia', voter_count: 2710, ballot_count: 1782},
		{code: 'CZ', name: 'Cowlitz',  voter_count: 63688, ballot_count: 25779},
		{code: 'DG', name: 'Douglas',  voter_count: 21110, ballot_count: 8462},
		{code: 'FE', name: 'Ferry',    voter_count: 4596, ballot_count: 2635},
		{code: 'FR', name: 'Franklin', voter_count: 34538, ballot_count: 11603},
		{code: 'GA', name: 'Garfield', voter_count: 1591, ballot_count: 1098},
		{code: 'GR', name: 'Grant',    voter_count: 40064, ballot_count: 15194},
		{code: 'GY', name: 'Grays Harbor', voter_count: 42317, ballot_count: 17026},
		{code: 'IS', name: 'Island',   voter_count: 54429, ballot_count: 26780},
		{code: 'JE', name: 'Jefferson', voter_count: 25109, ballot_count: 15135},
		{code: 'KI', name: 'King',     voter_count: 1283855, ballot_count: 546550},
		{code: 'KP', name: 'Kitsap',   voter_count: 167088, ballot_count: 65967},
		{code: 'KS', name: 'Kittitas', voter_count: 24732, ballot_count: 10983},
		{code: 'KT', name: 'Klickitat', voter_count: 14136, ballot_count: 6582},
		{code: 'LE', name: 'Lewis',    voter_count: 46902, ballot_count: 19113},
		{code: 'LI', name: 'Lincoln', voter_count: 7076, ballot_count: 3838},
		{code: 'MA', name: 'Mason', voter_count: 38661, ballot_count: 17239},
		{code: 'OK', name: 'Okanogan', voter_count: 22537, ballot_count: 11476},
		{code: 'PA', name: 'Pacific', voter_count: 14504, ballot_count: 8153},
		{code: 'PE', name: 'Pend Oreille', voter_count: 9063, ballot_count: 4944},
		{code: 'PI', name: 'Pierce', voter_count: 492036, ballot_count: 169178},
		{code: 'SJ', name: 'San Juan', voter_count: 13074, ballot_count: 7116},
		{code: 'SK', name: 'Skagit', voter_count: 74937, ballot_count: 31697},
		{code: 'SM', name: 'Skamania', voter_count: 7613, ballot_count: 3060},
		{code: 'SN', name: 'Snohomish', voter_count: 454267, ballot_count: 168226},
		{code: 'SP', name: 'Spokane', voter_count: 311209, ballot_count: 143569},
		{code: 'ST', name: 'Stevens', voter_count: 30320, ballot_count: 15626},
		{code: 'TH', name: 'Thurston', voter_count: 178188, ballot_count: 68740},
		{code: 'WK', name: 'Wahkiakum', voter_count: 3064, ballot_count: 1936},
		{code: 'WL', name: 'Walla Walla', voter_count: 33949, ballot_count: 16016},
		{code: 'WM', name: 'Whatcom', voter_count: 139813, ballot_count: 62717},
		{code: 'WT', name: 'Whitman', voter_count: 22476, ballot_count: 10421},
		{code: 'YA', name: 'Yakima', voter_count: 114826, ballot_count: 39844},
		//{code: 'ALL', name: 'All', voter_count: 4299309, ballot_count: 1753545}
	]
};

if(!process.env.MONGODB_URI)
{
	console.log('Missing ENV var MONGODB_URI');
	process.exit(1);
}

MongoClient.connect(process.env.MONGODB_URI, { useNewUrlParser: true }, (err, client) => {

	if (err) {
    	console.log(err);
    	process.exit(1);
  	}

	app_settings.wa_voter_db = client.db('wa-voter-db');

	//setTimeout(myFunc, 1500, 'funky');
	app_settings.wa_voter_db.collection('stats').find({state:'WA', election:app_settings.current_election}).toArray(function(err, stats) {
		if(err || !stats || stats.length == 0)
		{
			console.log('No Stats?');
		}
		else
		{
			app_settings.stats = stats[0];
		
			if(app_settings.stats && app_settings.stats.counties)
			{
				app_settings.stats.v_count_format = Number(app_settings.stats.v_count).toLocaleString();
				app_settings.stats.b_count_format = Number(app_settings.stats.b_count).toLocaleString();
				app_settings.stats.turnout = (app_settings.stats.b_count / app_settings.stats.v_count * 100).toFixed(1);
				app_settings.stats.turnout_dec = (app_settings.stats.b_count / app_settings.stats.v_count);

				app_settings.stats.counties.forEach(function(county) {

					county.turnout = (county.b_count / county.v_count * 100).toFixed(1);
					county.turnout_dec = (county.b_count / county.v_count);
					//console.log(county.code + ': ' + county.turnout);

					if(county.precincts)
					{
						county.precincts.forEach(function(precinct) {

							precinct.turnout = (precinct.b_count / precinct.v_count * 100).toFixed(1);
							precinct.turnout_dec = (precinct.b_count / precinct.v_count);
							//console.log(precinct.code + ': ' + precinct.turnout);

						});


						for(var i = 0; i < county.precincts.length; i++)
						{
							var precinct = county.precincts[i];

							precinct.voter_rank = 1;
							precinct.turnout_rank = 1;

							for(var j = 0; j < county.precincts.length; j++)
							{
								if(county.precincts[j].v_count > precinct.v_count)
									precinct.voter_rank++;
								if(county.precincts[j].turnout_dec > precinct.turnout_dec)
									precinct.turnout_rank++;
							}

							//console.log(county.name + ': Voter Rank: ' + county.voter_rank + ' ' + county.v_count);
							//console.log(county.name + ': Turnout Rank: ' + county.turnout_rank + ' ' + county.turnout);
						}

						county.precincts.sort(function(a,b){
							if(a.turnout_rank < b.turnout_rank)
								return -1;
							else
								return 1;
						});
					}



				});


				for(var i = 0; i < app_settings.stats.counties.length; i++)
				{
					var county = app_settings.stats.counties[i];

					county.voter_rank = 1;
					county.turnout_rank = 1;

					for(var j = 0; j < app_settings.stats.counties.length; j++)
					{
						if(app_settings.stats.counties[j].v_count > county.v_count)
							county.voter_rank++;
						if(app_settings.stats.counties[j].turnout_dec > county.turnout_dec)
							county.turnout_rank++;
					}

					//console.log(county.name + ': Voter Rank: ' + county.voter_rank + ' ' + county.v_count);
					//console.log(county.name + ': Turnout Rank: ' + county.turnout_rank + ' ' + county.turnout);
				}

				app_settings.stats.counties.sort(function(a,b){
					if(a.turnout_rank < b.turnout_rank)
						return -1;
					else
						return 1;
				});

				//updateStats(app_settings);
			}
		}
		
	});

	//process our counties list... this will be a query eventually.
	app_settings.counties.forEach(function(county) {

		county.turnout = (county.ballot_count / county.voter_count * 100).toFixed(0);
		county.turnout_dec = (county.ballot_count / county.voter_count);
		//console.log(county.code + ': ' + county.turnout);

	});

	for(var i = 0; i < app_settings.counties.length; i++)
	{
		var county = app_settings.counties[i];

		county.voter_rank = 1;
		county.turnout_rank = 1;

		for(var j = 0; j < app_settings.counties.length; j++)
		{
			if(app_settings.counties[j].voter_count > county.voter_count)
				county.voter_rank++;
			if(app_settings.counties[j].turnout_dec > county.turnout_dec)
				county.turnout_rank++;
		}

		//console.log(county.name + ': Voter Rank: ' + county.voter_rank + ' ' + county.voter_count);
		//console.log(county.name + ': Turnout Rank: ' + county.turnout_rank + ' ' + county.turnout);
	}


	console.log('MongoClient connected');
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.set('app_settings', app_settings);

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
//app.use('/stylesheets/fontawesome', express.static(__dirname + '/node_modules/@fortawesome/fontawesome-free/'));
app.use(express.static(path.join(__dirname, 'public')));
/*
app.get('*',function(req,res,next){
	//console.log(req.app.get('env'));
	if(req.app.get('env') !== 'development' && req.headers['x-forwarded-proto']!='https')
		res.redirect('https://'+req.headers.host+req.url);
	else
		next();
});
*/
app.get('/', function(req,res){ 
	res.redirect('/voter');
});


//app.use('/api/v1', apiRouter);
//app.use('/frame', frameRouter);
app.use('/voter', voterRouter);


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});
  /* ... start the server
var processStats = false;
var updateTick = 360; //15 mins
var workingStats = null;
function updateStats(arg) {
	updateTick++;

	if(!currentUpdateRequest)
	{
		if(updateRequestList.length == 0 && updateTick > 360 && arg.stats)
		{
			console.log("Starting Update");

			workingStats = JSON.parse(JSON.stringify(arg.stats));
	  		updateRequestList.push({ "target": workingStats, "v_filter": {status:'A'}, "b_filter": {status:'A', ballot:{$ne:null}}});

	  		workingStats.counties.forEach(function(county){
	  			updateRequestList.push({ "target": county, "v_filter": {status:'A', county:county.code}, "b_filter": {status:'A', county:county.code, ballot:{$ne:null}}});

	  			//county.precincts.forEach(function(precint){
	  			//	updateRequestList.push({ "target": precint, "v_filter": {status:'A', county:county.code, pc:precint.code}, "b_filter": {status:'A', county:county.code, pc:precint.code, ballot:{$ne:null}}});
	  			//});
	  		});
	  		updateTick = 0;
	  	}

	  //console.log(`arg was => ${arg}`);
	  	if(updateRequestList.length == 0 && processStats)
	  	{



	  		console.log("Processing Stats");
	  		
		
			for(var i = 0; i < workingStats.counties.length; i++)
			{
				var county = workingStats.counties[i];

				county.voter_rank = 1;
				county.turnout_rank = 1;

				for(var j = 0; j < workingStats.counties.length; j++)
				{
					if(workingStats.counties[j].v_count > county.v_count)
						county.voter_rank++;
					if(workingStats.counties[j].turnout_dec > county.turnout_dec)
						county.turnout_rank++;
				}

				//console.log(county.name + ': Voter Rank: ' + county.voter_rank + ' ' + county.v_count);
				//console.log(county.name + ': Turnout Rank: ' + county.turnout_rank + ' ' + county.turnout);
			}

			workingStats.counties.sort(function(a,b){
				if(a.turnout_rank < b.turnout_rank)
					return -1;
				else
					return 1;
			});

			arg.stats = workingStats;
			workingStats = null;
			processStats = false;

	  	}
		
	  	if(updateRequestList.length)
	  	{
	  		console.log(`Request List Length: ${updateRequestList.length}`);
			currentUpdateRequest = updateRequestList[0];
			updateRequestList.shift();

		  	app_settings.wa_voter_db.collection('voter').find(currentUpdateRequest.v_filter).count(function(err, v_count) {
		  	app_settings.wa_voter_db.collection('voter').find(currentUpdateRequest.b_filter).count(function(err, b_count) {
				
				currentUpdateRequest.target.v_count = v_count;
				currentUpdateRequest.target.v_count_format = Number(v_count).toLocaleString();
				currentUpdateRequest.target.b_count = b_count;
				currentUpdateRequest.target.b_count_format = Number(b_count).toLocaleString();
				currentUpdateRequest.target.turnout_dec = (b_count / v_count);
				currentUpdateRequest.target.turnout = (currentUpdateRequest.target.turnout_dec* 100).toFixed(1);
				
				//arg.db_counts.docs = doc_count;
				//console.log(`arg was => ${doc_count}`);
				console.log(`${currentUpdateRequest.target.code}: ${b_count}/${v_count}=${currentUpdateRequest.target.turnout}`)
				//db.collection.find({"docs": { $not: {$elemMatch: {foo: 1 } } } })
				currentUpdateRequest = null;

				if(updateRequestList.length == 0)
				{
					//sort the counties
					processStats = true;
				}
			});
			});
		}

	}
	else
	{
		//console.log("Update Busy");
	}
}


setInterval(updateStats, 2500, app_settings);
*/
module.exports = app;
