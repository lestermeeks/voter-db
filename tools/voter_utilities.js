var util = require('util');

function findElectionStatus(date, voter){
    if(voter)
    {
        /*
        if(util.isArray(voter.estatus))
        {
            for(var i = 0; i<voter.estatus.length; i++)
            {
                if(voter.estatus[i].edate == date)
                    return voter.estatus[i];
            }
        }
        */
        //there is no more estatus so now just watch for our "current" election date
        //'2018-11-06' hard coded for now, should compar this with settings though.
        if(date == '2019-02-12')
        {
            if(voter.bstatus)
                return true;
            else
                return false;
        }
        else
        {
            if(util.isArray(voter.history))
            {
                return voter.history.includes(date);
            }
        }
    }
    return false;
};

function getBallotStatus(voter)
{
    if(voter && voter.bstatus)
    {
        var retval = "Unknown";
        switch (voter.ballot)
        {
            case "A":
            retval = "Accepted";
            break;

            case "C":
            retval = "Challenged";
            break;

            case "R":
            retval = "Received";
            break;

        }

        return retval;
    }
    return false;
}

//determine voter status for all voters
function setVoterStatus(voters, elections) {
    //console.log('setVoterStatus: ' + JSON.stringify(voters));
	if(voters){
		//console.log('setVoterStatus: voters first' + JSON.stringify(voters) + '\r\n');	
        if(!Array.isArray(voters))
            voters = [voters];


        voters.forEach(function(voter, index, voters)
        {
			//console.log('setVoterStatus: voter after' + JSON.stringify(voter) + '\r\n');
			//console.log('setVoterStatus: voter' + JSON.stringify(voter) + '\r\n');
            voter._elections_past = [];
            if(elections){
                elections.forEach(function(election, e_idx, elections){
                    //if(voter.history)
                    //    voter.__elections.push({ date:election.date, desc:election.desc, status:voter.history.includes(election.date) });
                    //else
                    //    voter.__elections.push({ date:election.date, desc:election.desc, status:false});
                    voter._elections_past.push({ date:election.date, desc:election.desc, status:findElectionStatus(election.date, voter) });
                });
            }

            //voter._election_current = findElectionStatus('2018-08-07', voter);
            //voter._election_current = findElectionStatus('2018-11-06', voter);
            //voter._ballot_status = getBallotStatus(voter);

			if(voter.ballot)
			{
				//console.log("Ballot Status: " + voter.ballot.status);
				if(voter.ballot.status == 'Rejected')
				{
				
					voter.ballot.status = 'Challenged';
				}
			}
            //setup comparison
            var new_cutoff_date = new Date(2018,1);
            var reg_date = new Date(voter.reg);
            var last_voted = voter.voted;
     
            if (last_voted == '08/07/2018')
                voters[index].turnout_status = "current";
            else if (reg_date.getTime() > new_cutoff_date.getTime() && !last_voted)
                voters[index].turnout_status = "new";
            else if (last_voted)
                voters[index].turnout_status = "infrequent";
            else 
                voters[index].turnout_status = "never";
        });
    }
 };

// Generic error handler used by all endpoints.
function handleError(res, reason, message, code) {
  console.log("ERROR: " + reason);
  res.status(code || 500).json({"error": message});
}

async function findUser(db, voterId)
{
    var voter = await db.collection('voter').find({_id: voterId});//.then(user=>return user).catch(err=>return err);
    return voter;
}

module.exports = {
    setVoterStatus: setVoterStatus,
    handleError: handleError,
    FindVoter: (db, voterId) => {
        return new Promise((resolve, reject) => {

            db
             .collection('voter')
             .find({_id: voterId})
             .limit(1)
             .toArray(function(err, data) {
                 err 
                    ? reject(err) 
                    : resolve(data[0]);
               });
        });
    },
    FindPrecinctVoters: (db, county, precinct)=>{
        return new Promise((resolve, reject) => {

            db
             .collection('voter')
             .find({status: 'ACTIVE', county:county, pc:precinct})
             .toArray(function(err, data) {
                 err 
                    ? reject(err) 
                    : resolve(data);
               });
        });
    }

};