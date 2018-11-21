var express = require('express');
var router = express.Router();
const util = require('util');

var voter_utilities = require('../tools/voter_utilities');
var app_settings;


// middleware that is specific to this router
router.use(function (req, res, next) {
  app_settings = req.app.get('app_settings');
  next()
})


//frame routing
router.get('/search', function(req,res){
	var fname = req.query.fname;//.toUpperCase();
	var lname = req.query.lname;//.toUpperCase();
	var query_name = req.query.name;
	var personal = req.query.personal;
	if (!personal)
		personal = "no";


    //build query, basic case insensitive substring regex
	var query_obj = null;
	if(query_name)
	{
		query_obj = {};
		query_obj.name= new RegExp(query_name, 'i');
	}
	else
	{
		if (lname) {
			if(!query_obj)
				query_obj = {};
			query_obj.lname= new RegExp(lname, 'i');
		}

		//build query, basic case insensitive substring regex
		if (fname) {
			if(!query_obj)
				query_obj = {};
			query_obj.fname=new RegExp(fname, 'i');
		}
	}
	//just render home page if frame endpoint is used w/ no params, may want to return error code, but as long as it's in an iFrame,
	//  this routing has to produce some user facing content, a search bar seems like a good fallback
	if (query_obj) {
		query_obj.status = 'A';
		query_obj.county = 'WM';
		//console.log('frame/search: ' + util.inspect(req.query));
		//console.log('frame/search: ' + util.inspect(query_obj, { compact: true, depth: 10, breakLength: 80 }));
		app_settings.wa_voter_db.collection('voter').find(query_obj).toArray(function(err, voters) {

			voter_utilities.setVoterStatus(voters, app_settings.elections);

			//none should render a "not found page", and errors?
			if(!voters || voters.length == 0) 			{
				res.render('frame/voter_not_found', { title: 'VoteWhatcom.org'});
			} else if ( voters.length == 1) 		{
				res.redirect('/frame/id/'+voters[0]._id + '?personal=' + personal);
			} else {

				res.render('frame/voter_list', { title: 'powered by VoteWhatcom.org', voters: voters, personal: personal});
			}
		});
	} else {
		res.render('index', { title: 'VoteWhatcom.org', voters: {}});
	}
});


//frame routing
router.get('/id/:id', function(req,res){
	var voter_id = req.params.id;
	var personal = req.query.personal;

	app_settings.wa_voter_db.collection('voter').find({_id:voter_id}).toArray(function(err, voters) {

		voter_utilities.setVoterStatus(voters, app_settings.elections);
		var this_voter = voters[0];

		//just run a blank response for now.
		if(!this_voter)
			this_voter = {};
		//console.log('id: ' + JSON.stringify(this_voter));
		app_settings.wa_voter_db.collection('voter').find({status:'A', county:this_voter.county, pc:this_voter.pc}).toArray(function(err, precinct_voters) {
			var pc_current = 0, street_current = 0;

			voter_utilities.setVoterStatus(precinct_voters);
			
			//walk this return, and grab the 
			neighbors = [];
			precinct_voters.forEach(function(precinct_voter) {
				//console.log('precinct_voter: status - ' + precinct_voter.turnout_status);
				if(precinct_voter.turnout_status == "current")
				{
					//console.log('pc current voter: id - ' + precinct_voter._id + ' ' + precinct_voter.turnout_status);
					pc_current++;
				}

				if (precinct_voter.street == this_voter.street)
				{
					neighbors.push(precinct_voter);
					if(precinct_voter.turnout_status == "current")
					{
						street_current++;
					}
				}
			});
			

			//temporary way to compute primary turnout for ST
			//var current = 0;
			//neighbors.forEach(function(voter) {
			//	if (voter.turnout_status == "current")
			//		current++;
			//});

			//console.log('street_current: ' + street_current);
			//console.log('street_count: ' + neighbors.length);
			//console.log('precinct_current: ' + pc_current);
			//console.log('precinct_count: ' + precinct_voters.length);

			var st_percentage;
			if(neighbors.length > 0)
				st_percentage = Math.round(street_current / neighbors.length * 100);

			var pc_turnout;
			if(precinct_voters.length > 0)
				pc_turnout = Math.round(pc_current / precinct_voters.length * 100);
      		
      		res.render('frame/voter', { 
      			title: 'powered by VoteWhatcom.org', 
      			voter: this_voter, 
      			neighbors: neighbors, 
      			street_turnout: st_percentage,
      			pc_turnout: pc_turnout,
      			personal: personal
      		});
      });
	});
});


module.exports = router