var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var util = require('util');

const MongoClient = require('mongodb').MongoClient;
const voter_utilities = require('./tools/voter_utilities');

//var fs = require('fs');
//var path = require('path');
//const readline = require('readline');
//const pEvent = require('p-event');


//var apiRouter = require('./route/api');
//var frameRouter = require('./route/frame');
var voterRouter = require('./route/voter');

//var voter_utilities = require('./tools/voter_utilities');

var app = express();

var currentUpdateRequest = null;
var updateRequestList = [];



var app_settings = {
	//alert: 'We use official state ballot data released by the WA Secretary of State, to provide enhanced access to your voter information.  VoteWashington.info is not associated with any state agency, and relies on the public disclosure of official data found here to provide enchanced access to real voter data.',
	wa_voter_db: null,
	stats:  {counties:[]},
	db_counts: {},
	faq_index: 0,
	faqs:[

	],
	//current_last_seen: "10/31/2018",
	//current_election: "2020-03-10",
	//as_of: "11/02/2018",
	//as_of:"11/08/2019",
	elections: [
		{date: '2020-11-03', desc:'2020: Presidental Election'},		
		//{date: '2020-03-10', desc:'2020: Presidental Primary'},
		{date: '2019-11-05', desc:'2019: General Election'},
		//{date: '2019-08-06', desc:'2019: State Primary Election'},
		{date: '2018-11-06', desc:'2018: Midterm Election'},
		//{date: '2018-08-07', desc:'2018: State Primary'},
		{date: '2017-11-07', desc:'2017: General Election'},
		//{date: '2017-08-01', desc:'08/01/2017: Primary Election'},
		{date: '2016-11-08', desc:'2016: Trump/Clinton Election'},
		//{date: '2016-08-02', desc:'08/02/2016: State Primary'},
		//{date: '2016-05-24', desc:'05/24/2016: Presidential Primary'},
		//{date: '2016-02-09', desc:'02/09/2016: Special Election'},
		//{date: '2015-11-03', desc:'2015: General Election'},
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
/*
MongoClient.connect(process.env.MONGODB_URI, { useNewUrlParser: true })
	.then( function (client) {
		app_settings.wa_voter_db = client.db('wa-voter-db');

	//setInterval(updateStats, 2500, app_settings);


		console.log('MongoClient connected');


	}).catch(function(error){

		console.log('MongoClient Error:');
	    console.log(err);
	    process.exit(1);
	  	
	});
*/

MongoClient.connect(process.env.MONGODB_URI, { useNewUrlParser: true,  useUnifiedTopology: true  })
	.then(function(client){
		app_settings.wa_voter_db = client.db('wa-voter-db');
		console.log('MongoClient connected');
	})
	.then(function(){
		console.log('Then AGAIN');

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

		setInterval(updateStats, 2500, app_settings);

	})
	.catch(function(error){
		console.log('MongoClient Error:');
		console.log(error);
		process.exit(1);
	});




  // ... start the server
var processStats = false;
var updateTick = 360; //15 mins
//var workingStats = null;
function updateStats(arg) {
	updateTick++;



	if(updateTick>360)
	{
		console.log('Updating Stats.');
		app_settings.wa_voter_db.collection('stats').find({state:'WA'}).toArray(function(err, stats) {
			if(err || !stats || stats.length == 0)
			{
				console.log('No Stats?');
				app_settings.stats = {counties:[]};
			}
			else
			{
				app_settings.stats = stats[0];
			
				app_settings.current_election = app_settings.stats.election;
				app_settings.as_of = app_settings.stats.date;

				if(app_settings.stats && app_settings.stats.counties)
				{
					app_settings.stats.v_count_format = Number(app_settings.stats.v_count).toLocaleString();
					app_settings.stats.b_count_format = Number(app_settings.stats.b_count).toLocaleString();
					app_settings.stats.turnout = (app_settings.stats.b_count / app_settings.stats.v_count * 100).toFixed(1);
					app_settings.stats.turnout_dec = (app_settings.stats.b_count / app_settings.stats.v_count);

					app_settings.stats.counties.forEach(function(county) {

						county.rejected_voters = null;

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
		updateTick = 0;



	}
}
/*
async function parseHistory() {


		//var x = path.join('Users', 'Refsnes', 'demo_path.js');
var data_path = path.join(process.cwd(), 'data');
var history_path = path.join(data_path, 'history');


// delete everything in histsory

var filesToDelete = fs.readdirSync(history_path);

filesToDelete.forEach( function( filetoDelete) {

        console.log('Deleting: ', filetoDelete);
        fs.unlinkSync(path.join(history_path, filetoDelete));
    
});


var history = [];
//check for our voter db file
fs.readdir(data_path, async function(err, items) {
    //console.log(items);
 
    for (var i=0; i<items.length; i++) {
        console.log(items[i]);

        if(items[i].indexOf('History') > -1)
        {

			try {
			    const lineReader = readline.createInterface({
			      input: fs.createReadStream(path.join(data_path, items[i]))
			    });

			    const asyncIterator = pEvent.iterator(lineReader, 'line', {
			      resolutionEvents: ['close']
			    });

			    //bool busyWithHistory = false;
			    for await (const line of asyncIterator) {
			      console.log('Line from file:', line);

				    var tokens = line.split('\t');
				    //for(var idx = 0 ; idx < tokens.length; idx++)
				    //{
				    //	console.log(tokens[idx]);
				    //}

				    //while(!busyWithHistory);

				    if(tokens.length > 2)
				    {
				    	//fs.appendFileSync(path.join(data_path,"history",tokens[1]), tokens[2]);

				    	app_settings.wa_voter_db.collection('history').find({_id:voter_id}).toArray(function(err, voters) {

				    	});

				    	if(history[tokens[1]] === undefined)
				    	{
				    		history[tokens[1]] = [];
				    	}
						history[tokens[1]].push(tokens[2]);
				    }
			    }
			} catch(e) {
			    console.log(e);
			} finally {
			  console.log('Finished');
			}

        }
    }
});
}
*/


module.exports = app;
