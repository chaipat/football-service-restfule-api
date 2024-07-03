var express = require('express');
var config = require('../config/index');
var utils = require('../utils/index');
var log = require('../logging/index');
var request = require('request');
var dateFormat = require('dateformat');
var async = require("async");
/*
var page = express.Router();
var mysql_connection = config.getMySQLConnection();

function getTournamentNews(req, res, tournamentName) {
  var data = getDataFromMySQL(mysql_connection, query, function( err, data ) {
    if ( err ) {
        utils.printJSON(res, utils.getJSONObject(500, err.stack, null));
    } else {
        utils.printJSON(res, utils.getJSONObject(200, {"status":"ok"}, data));
    }

  });


}


function getSportNews(req, res, sportName) {
  var query = 'select * from sports limit 5';
  getDataFromMySQL(conn, query, done);
}


function getDataFromMySQL(conn, query, callback) {
  conn.connect( err ) {
    if ( err ) {
      callback(err);
      conn.end();
    } else {
      result = [{'data1': 'name1', 'data2': 'name2'}];
      callback(result);
    }
  }
}


page.get("/getTournament/:tournamentName", function( req, res, next ) {
  var tournamentName = req.params.tournamentName;
  getTournamentNews(req, res, tournamentName);
});


page.get("/getSport/:sportName", function( req, res, next ) {
  var sportName = req.params.sportName;
  var cacheKey = cacheKeyPrefix + '-' + sportName;
  getSportNews(req, res, sportName);
});
*/

module.exports = page;
