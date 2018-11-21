var express = require('express')
var router = express.Router()

// middleware that is specific to this router
//router.use(function timeLog (req, res, next) {
//  console.log('Time: ', Date.now())
//  next()
//})


router.get('/voter/search', function(req,res){
	var fname = req.query.fname;//.toUpperCase();
	var lname = req.query.lname;//.toUpperCase();
	var wa_voter_db = req.app.get('app_settings').wa_voter_db;

    //build query, basic case insensitive substring regex
	var query_obj = {};
	if (lname) {
		query_obj.lname= new RegExp(lname, 'i');
	}

	//build query, basic case insensitive substring regex
	if (fname) {
		query_obj.fname=new RegExp(fname, 'i');
	}

	wa_voter_db.collection('voter').find(query_obj).toArray(function(err, voters) {
		res.json(voters);
	});
});


//routes
router.get('/voter/id/:id', function(req,res){
	var voter_id = req.params.id;
	var wa_voter_db = req.app.get('app_settings').wa_voter_db;

	wa_voter_db.collection('voter').find({_id:voter_id}).toArray(function(err, voters) {
		var this_voter = voters[0];

		//just run a blank response for now.
		if(!this_voter)
			this_voter = {};

		wa_voter_db.collection('voter').find({status:'A', street:this_voter.street}).toArray(function(err, neighbors) {
      		res.json({voter: this_voter, neighbors: neighbors});
      });
	});
});


module.exports = router