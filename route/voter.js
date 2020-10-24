var express = require('express');
var router = express.Router();
const util = require('util');


var voter_utilities = require('../tools/voter_utilities');

var app_settings, open_graph, site_settings;

// middleware that is specific to this router
router.use(function timeLog (req, res, next) {
	app_settings = req.app.get('app_settings');

	var redirect_protocol = (process.env.REDIRECT_PROTOCOL || 'http://');

	site_settings = {
		fullUrl: redirect_protocol + req.get('host') + req.originalUrl
	};
	
	/*
	if (req.headers.host != 'www.votewashington.info'){
		//catch our old website names and redirect them in to votewashington with lower case url
		res.redirect('https://www.votewashington.info' + req.originalUrl.toLowerCase());
	}
	else*/
	 if(site_settings.fullUrl.match(new RegExp("[A-Z]"))){
		//if we have an upper case url redirect it to lower
		res.redirect(301, site_settings.fullUrl.toLowerCase());
	}else{
	

		site_settings.name = 'Vote Washington';
		site_settings.header = 'Vote Washington';
		site_settings.footer = 'VoteWashington.info 2020';


		open_graph = {
			title: site_settings.name,
			desc: '',
			url: site_settings.fullUrl,
			img: 'https://' + req.get('host') + '/img/vote-small.jpg'
		};

		next();
	}
	/*  	
  	}
  	*/
})

router.get('/', function(req,res){
	//if(req.headers.host.indexOf('.votewhatcom.') > -1)
	//	res.redirect('/voter/wa/wm');
	//else
		res.redirect(301, '/voter/wa');

});

//old rounte to the non wa/wm endpoint, redirect to current county
router.get('/id/:id', function(req,res){
	var voter_id = req.params.id.trim();
	res.redirect(301, '/voter/wa/id/' + voter_id);
});

router.get('/wa', function(req,res){ 

	//var app_settings = req.app.get('app_settings');
	//og.title = 

	open_graph.title = site_settings.name + ' - State Voter Information';
	open_graph.desc = 'Explore Washington state voter information.';

	res.render('state',
		{
			title: site_settings.name + ': State Info',
			header: site_settings.header,
			footer: site_settings.footer,
			og: open_graph,
			counties: app_settings.counties,
			state_stats: app_settings.stats,
			as_of:app_settings.as_of,
						breadcrumbs: [
							{'title': 'WA', 'url': '/voter/wa'}
						],
			hide_search: true
		}
	);
});

//old rounte to the non wa/wm endpoint, redirect to current county
router.get('/wa/id/:id', async function(req,res){
	var voter_id = req.params.id.trim().toUpperCase();
	//var county_code = req.params.county_code.toUpperCase
	var db = app_settings.wa_voter_db;
	
	voter_utilities.FindVoter(db, voter_id)
	.then(function(voter){
		if(!voter){
			//none found
			//res.render('voter_not_found', { title: site_settings.name});
			res.status(404).send("No Voter Found");
		} else {

						//set status for this voter
			voter_utilities.setVoterStatus(voter, app_settings.elections);

			//render the first one... id is unique don't wast time checking for multiples
			//var voter = voters[0];
			
			//console.log(util.inspect(voter));
			//var app_settings = req.app.get('app_settings');
			var county = {};
			if(app_settings.stats && app_settings.stats.counties){


				app_settings.stats.counties.forEach(function(county_loop){
			  		if(county_loop.code == voter.county){
			  			county = county_loop;
			  		}
			  	});

			}


			//fill in some basic precinct and street turnout data
			app_settings.wa_voter_db.collection('voter').find({status: 'ACTIVE', county:voter.county, pc:voter.pc}).toArray(function(err, precinct_voters) {
				var pc_current = 0, street_current = 0;

				voter_utilities.setVoterStatus(precinct_voters);
				
				neighbors = [];
				if(precinct_voters){
					precinct_voters.forEach(function(precinct_voter) {

						if(precinct_voter.bstatus)
						{
							pc_current++;
						}

						if (precinct_voter.street == voter.street)
						{
							neighbors.push(precinct_voter);
							if(precinct_voter.bstatus)
							{
								street_current++;
							}
						}
					});
				}
				var st_percentage;
				if(neighbors.length > 0)
					st_percentage = Math.round(street_current / neighbors.length * 100);

				var pc_turnout;
				if(precinct_voters.length > 0)
					pc_turnout = Math.round(pc_current / precinct_voters.length * 100);
		      		
				open_graph.title = site_settings.name + ' Voter History: ' + voter.fname + ' ' + voter.lname
				open_graph.desc = 'Washington Voter History: ' + voter.fname + ' ' + voter.lname
				
				/*if (voter.bstatus){
                    //img.card-img-top(src="/img/voted-2018-midterm-small.jpg" alt="Vote Image")
                    open_graph.img = 'https://' + req.headers.host + '/img/voted-2018-midterm-small.jpg';
				}
                else{
                    open_graph.img = 'https://' + req.headers.host + '/img/vote-2018-midterm-small.jpg';
                }
				*/

					res.render('voter', { 
						title: site_settings.name + ' Voter History: ' + voter.fname + ' ' + voter.lname,
						header: site_settings.header,
						footer: site_settings.footer,
						og:open_graph,
						voter: voter,
						counties: app_settings.counties,
						county: county,
						state_stats: app_settings.stats,
						as_of:app_settings.as_of,
						//near_voters: near_voters,
						street_turnout: st_percentage,
		      			pc_turnout: pc_turnout,
		      			map_src: '/img/vote-small.jpg',
						fullUrl: site_settings.fullUrl,
						canonical: site_settings.fullUrl,
						breadcrumbs: [
							{'title': 'WA', 'url': '/voter/wa'},
							{'title': county.name, 'url':'/voter/wa/'+county.code},
							{'title': voter.fname + ' ' + voter.lname, 'url':'/voter/wa/wm/id/'+voter._id, 'active':true}
						],
						hide_search: true
					});
				//}

			});
		}
	})
	.catch(function(err){
		voter_utilities.handleError(res, err.message, err.message);
	});
	/*
	app_settings.wa_voter_db.collection('voter').find({_id:voter_id}).toArray(function(err, voters) {
		if(err){
			voter_utilities.handleError(res, err.message, err.message);
		} else if(!voters || voters.length == 0){
			//none found
			res.render('voter_not_found', { title: site_settings.name});
		} else {

						//set status for this voter
			voter_utilities.setVoterStatus(voters, app_settings.elections);

			//render the first one... id is unique don't wast time checking for multiples
			var voter = voters[0];
			
			//console.log(util.inspect(voter));
			//var app_settings = req.app.get('app_settings');
			var county = {};
			if(app_settings.stats && app_settings.stats.counties){


				app_settings.stats.counties.forEach(function(county_loop){
			  		if(county_loop.code == voter.county){
			  			county = county_loop;
			  		}
			  	});

			}


			//fill in some basic precinct and street turnout data
			app_settings.wa_voter_db.collection('voter').find({status: 'A', county:voter.county, pc:voter.pc}).toArray(function(err, precinct_voters) {
				var pc_current = 0, street_current = 0;

				voter_utilities.setVoterStatus(precinct_voters);
				
				neighbors = [];
				precinct_voters.forEach(function(precinct_voter) {

					if(precinct_voter.bstatus)
					{
						pc_current++;
					}

					if (precinct_voter.street == voters[0].street)
					{
						neighbors.push(precinct_voter);
						if(precinct_voter.bstatus)
						{
							street_current++;
						}
					}
				});
			
				var st_percentage;
				if(neighbors.length > 0)
					st_percentage = Math.round(street_current / neighbors.length * 100);

				var pc_turnout;
				if(precinct_voters.length > 0)
					pc_turnout = Math.round(pc_current / precinct_voters.length * 100);
		      		
				open_graph.title = site_settings.name + ' Voter History: ' + voter.name;
				open_graph.desc = 'Washington State Voter History for ' + voter.name;
				if (voter.bstatus){
                    //img.card-img-top(src="/img/voted-2018-midterm-small.jpg" alt="Vote Image")
                    open_graph.img = 'https://' + req.headers.host + '/img/voted-2018-midterm-small.jpg';
				}
                else{
                    open_graph.img = 'https://' + req.headers.host + '/img/vote-2018-midterm-small.jpg';
                }


					res.render('voter', { 
						title: site_settings.name + ' Voter History: ' + voter.fname + ' ' + voter.lname,
						header: site_settings.header,
						footer: site_settings.footer,
						og:open_graph,
						voter: voter,
						counties: app_settings.counties,
						county: county,
						state_stats: app_settings.stats,
						as_of:app_settings.as_of,
						//near_voters: near_voters,
						street_turnout: st_percentage,
		      			pc_turnout: pc_turnout,
		      			map_src: '/img/vote-256.png',
						fullUrl: site_settings.fullUrl,
						canonical: site_settings.fullUrl,
						//breadcrumbs: [
						//	{'title': 'WA', 'url': '/voter/wa'},
						//	{'title': 'Whatcom', 'url':'/voter/wa/wm'},
						//	{'title': 'Voter Name', 'url':'/voter/wa/wm/id/'+voter._id, 'active':true}
						//],
						hide_search: true
					});
				//}

			});
		}
	});*/
});

router.get('/wa/search', function(req,res){
	var fname = req.query.fname.toUpperCase();
	var lname = req.query.lname.toUpperCase();

	//var app_settings = req.app.get('app_settings');
	
    //build query, basic case insensitive substring regex
	var query_obj = {status:'ACTIVE'};
	if (lname) {
		query_obj.lname= new RegExp('^'+lname.trim());
	}

	//build query, basic case insensitive substring regex
	if (fname) {
		query_obj.fname=new RegExp('^'+fname.trim());
	}

	//render blank search again if no query parameters available
	if (!query_obj.lname && !query_obj.fname) {
		renderVoterResponse(site_settings.name + ': Voter Search', req, res, null, null);
	}
	else
	{
		app_settings.wa_voter_db.collection('voter').find(query_obj).sort({lname:1,fname:1}).toArray(function(err, voters) {
			renderVoterResponse('Voter Search', req, res, err, voters);
		});
	}
});

/*
router.get('/wa/cd/:cd', function(req,res){
	var voter_cd = req.params.cd.trim();

	var wa_voter_db = req.app.get('app_settings').wa_voter_db;
	wa_voter_db.collection('voter').find({status:'A', cd:voter_cd}).sort({lname:1,fname:1}).toArray(function(err, voters) {
		renderVoterResponse(site_settings.name + ': Congressional District ' + voter_cd, req, res, err, voters);
	});
});
*/

router.get('/wa/ld/:ld/ballot/:ballot_status', function(req,res){
	var voter_ld = req.params.ld.trim();
	var ballot_status = req.params.ballot_status.trim().toUpperCase();

	//var app_settings = req.app.get('app_settings');
	var wa_voter_db = app_settings.wa_voter_db;


	wa_voter_db.collection('voter').find({status:'ACTIVE', ld:voter_ld, bstatus:ballot_status}).sort({lname:1,fname:1}).toArray(function(err, voters) {
		
		renderVoterResponse('Legislative District Ballot Status ' + voter_ld, req, res, err, voters);
	});

});


router.get('/wa/ld/:ld', function(req,res){
	var voter_ld = req.params.ld.trim();
	var wa_voter_db = req.app.get('app_settings').wa_voter_db;
	wa_voter_db.collection('voter').find({status:'ACTIVE', ld:voter_ld}).sort({lname:1,fname:1}).toArray(function(err, voters) {
		renderVoterResponse('Legislative District ' + voter_ld, req, res, err, voters);
	});
});

router.get('/wa/:county_code/ballot/:ballot_status', function(req,res){
	//var voter_ld = req.params.ld.trim();
	var county_code = req.params.county_code.trim().toUpperCase();
	var ballot_status = req.params.ballot_status.trim().toUpperCase();

	var county = { code:"XX", name:"Unknown"};
  	app_settings.stats.counties.forEach(function(county_loop){
  		if(county_loop.code == county_code){
  			county = county_loop;
  		}
  	});

	if(county.rejected_voters)
	{
		renderVoterResponse( county_code + ' County Ballot Status: ' + ballot_status , req, res, null, county.rejected_voters, county);
	}
	else
	{
		var wa_voter_db = req.app.get('app_settings').wa_voter_db;
		wa_voter_db.collection('voter').find({status:'ACTIVE', county:county_code, bstatus:ballot_status}).sort({lname:1,fname:1}).toArray(function(err, voters) {
			county.rejected_voters = voters;
			renderVoterResponse( county_code + ' County Ballot Status: ' + ballot_status , req, res, err, voters, county);
		});
	}

});

/* GET home page. */
router.get('/wa/:county_code', function(req, res, next) {

	var county_code = req.params.county_code.trim().toUpperCase();
	
  	
	//var app_settings = req.app.get('app_settings');
	var county = { code:"XX", name:"Unknown"};
  	app_settings.stats.counties.forEach(function(county_loop){
  		if(county_loop.code == county_code){
  			county = county_loop;
  		}
  	});

	open_graph.title = site_settings.name + ' - ' + county.name + ' County Voter Information';
	open_graph.desc = 'Explore ' + county.name + ' county voter information.';

	res.render('county',
		{ 
			title: site_settings.name + ' - ' + county.name +' County Voter Information',
			header: site_settings.header,
			footer: site_settings.footer,
			og: open_graph,
			counties: app_settings.counties,
			state_stats: app_settings.stats,
			county: county,
			as_of:app_settings.as_of,
			canonical: site_settings.fullUrl,
			breadcrumbs: [
				{'title': 'WA', 'url': '/voter/wa'},
				{'title': county.name, 'url':'/voter/wa/'+county.code}
				
			],
			hide_search: true
		}
	);
});



//routes
router.get('/wa/:county_code/id/:id', function(req,res){
	var voter_id = req.params.id.trim();
	res.redirect(301, '/voter/wa/id/' + voter_id);
});


/*
router.get('/wa/:county_code/ballot/:ballot_status', function(req,res){

	var county_code = req.params.county_code.toUpperCase();
	var ballot_status = req.params.ballot_status.trim().toUpperCase();
	
	
	//var app_settings = req.app.get('app_settings');
	var county = {};
	app_settings.stats.counties.forEach(function(county_loop){
  		if(county_loop.code == county_code){
  			county = county_loop;
  		}
  	});

	app_settings.wa_voter_db.collection('voter').find({status:'A', county:county_code, ballot:ballot_status}).sort({lname:1,fname:1}).toArray(function(err, voters) {
		renderVoterResponse(site_settings.name + ': Ballot Status Search ', req, res, err, voters, county);
	});
});
*/
router.get('/wa/:county_code/precinct/:precinct', function(req,res){

	var county_code = req.params.county_code.toUpperCase();
	var voter_precinct = req.params.precinct.trim().toUpperCase();
	
	
	//var app_settings = req.app.get('app_settings');
	var county = {};
	app_settings.stats.counties.forEach(function(county_loop){
  		if(county_loop.code == county_code){
  			county = county_loop;
  		}
  	});

	app_settings.wa_voter_db.collection('voter').find({status:'ACTIVE', county:county_code, pc:voter_precinct}).sort({lname:1,fname:1}).toArray(function(err, voters) {
		renderVoterResponse('Precinct ' + voter_precinct, req, res, err, voters, county);
	});
});

router.get('/wa/:county_code/street/:zip/:street', function(req,res){
	var county_code = req.params.county_code.toUpperCase();
	var voter_street = req.params.street.trim().toUpperCase();
	var voter_zip = req.params.zip.trim().toUpperCase();

	//locals
	//var app_settings = req.app.get('app_settings');
	var county = {};
	app_settings.stats.counties.forEach(function(county_loop){
  		if(county_loop.code == county_code){
  			county = county_loop;
  		}
  	});

	app_settings.wa_voter_db.collection('voter').find({status:'ACTIVE', county:county_code, street:voter_street, zip:voter_zip}).sort({lname:1,fname:1}).toArray(function(err, voters) {
		renderVoterResponse('Street Name ' + voter_street, req, res, err, voters, county);
	});
});



router.get('/wa/:county_code/search', function(req,res){
	var county_code = req.params.county_code.toUpperCase();
	var fname = req.query.fname.toUpperCase();
	var lname = req.query.lname.toUpperCase();

	//var app_settings = req.app.get('app_settings');
	var county = {};
	app_settings.stats.counties.forEach(function(county_loop){
  		if(county_loop.code == county_code){
  			county = county_loop;
  		}
  	});
	
    //build query, basic case insensitive substring regex
	var query_obj = {status:'ACTIVE', county:county_code};
	if (lname) {
		query_obj.lname= new RegExp('^'+lname.trim());
	}

	//build query, basic case insensitive substring regex
	if (fname) {
		query_obj.fname=new RegExp('^'+fname.trim());
	}

	//render blank search again if no query parameters available
	if (!query_obj.lname && !query_obj.fname) {
		renderVoterResponse('County Voter Search', req, res, null, null, county);
	}
	else
	{
		app_settings.wa_voter_db.collection('voter').find(query_obj).sort({lname:1,fname:1}).toArray(function(err, voters) {
			renderVoterResponse('County Voter Search', req, res, err, voters, county);
		});
	}
});

router.get('/wa/:county_code/name/:last', function(req,res){
	//uri params
	var county_code = req.params.county_code.toUpperCase();
	var voter_last_name = req.params.last.trim().toUpperCase();

	//app locals
	//var app_settings = req.app.get('app_settings');
	var county = {};
	app_settings.stats.counties.forEach(function(county_loop){
  		if(county_loop.code == county_code){
  			county = county_loop;
  		}
  	});
	//grab the dataset
	app_settings.wa_voter_db.collection('voter').find({status:'ACTIVE', lname:voter_last_name, county:county_code}).sort({lname:1,fname:1}).toArray(function(err, voters) {
		renderVoterResponse('Voter Last Name ' + voter_last_name, req, res, err, voters, county);
	});
});

router.get('/wa/:county_code/name/:last/:first', function(req,res){
	//uri params
	var county_code = req.params.county_code.toUpperCase();
	var voter_last_name = req.params.last.trim().toUpperCase();
	var voter_first_name = req.params.first.trim().toUpperCase();
	
	//app locals
	//var app_settings = req.app.get('app_settings');
	var county = {};
	app_settings.stats.counties.forEach(function(county_loop){
  		if(county_loop.code == county_code){
  			county = county_loop;
  		}
  	});

	app_settings.wa_voter_db.collection('voter').find({status:'ACTIVE', lname:voter_last_name, fname:voter_first_name, county:county_code}).sort({lname:1,fname:1}).toArray(function(err, voters) {
		renderVoterResponse('Voter Name ' + voter_last_name + ', ' + voter_first_name, req, res, err, voters, county);
	});
});


//these should maybe be broken out into a rending utils module....
function renderVoterResponse (title, req, res, err, voters, county)
{


    if(voters)
      voter_utilities.setVoterStatus(voters);

    if (err) {
      voter_utilities.handleError(res, err.message, "No Voter Found");
    } else if( !voters || voters.length == 0) {
        //res.render('voter_not_found', { 
        //  title: title,
        //  header: site_settings.header,
        //  footer: site_settings.footer,
        //  county: county,
        //  counties: req.app.get('app_settings').counties,
         // hide_search: true
        //});
        res.status(404).send("No Voter Found");
    } else if (voters.length == 1) {

       res.redirect('/voter/wa/id/'+voters[0]._id.toLowerCase());

    } else {
      //updateDoc._id = req.params.id;
	  var breadcrumbs = [];

	  breadcrumbs.push({'title': 'WA', 'url': '/voter/wa'});
	  if(county)
		breadcrumbs.push({'title': county.name, 'url':'/voter/wa/'+county.code});

	breadcrumbs.push({'title':title});

      res.render('voter_list', {
        title: title,
        header: site_settings.header,
        footer: site_settings.footer,
        county: county,
        counties: req.app.get('app_settings').counties,
        og_title: title,
        voters: voters,
		breadcrumbs: breadcrumbs,
        hide_search: true
      });
    }
}


module.exports = router