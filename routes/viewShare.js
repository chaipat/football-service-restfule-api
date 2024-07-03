var express = require('express');
var config = require('../config/index');
var utils = require('../utils/index');
var log = require('../logging/index');
var async = require("async");
var router = express.Router();

var keys = config.getKeyPrefix() + config.getKeyProjectName() + "a-";
var conf_types = ["line", "twitter", "gplus", "email"];
var conf_rand = 100; // for use random update to visitor database
var redis_cache_timeout = 360000;
var tournament_id = 0;
//===================================================================//

function clearGarbageCollection() {
	if (utils.clearGarbageCollection() == false) {
	   log.error("Garbage collection unavailable.  Pass --expose-gc when launching node to enable forced garbage collection.");
	}
}

function getPreview(res, raw_json, redisCluster){

	var data = {};
	data.share_count = parseInt(raw_json["view"]);
	data.id = raw_json["rpl_url"];
	data.comment = raw_json["comment"];
	data.social = raw_json["social"];
	
	utils.printJSON(res, utils.getJSONObject(200, "success", data));
	redisCluster.disconnect();
	clearGarbageCollection();
}

function setData2RedisCluster(res, raw_json, redisCluster){
	
	var cache_key = raw_json["cache_key"];
	///  Set Redis Cluster  \\\
	if(redisCluster != null) {
			redisCluster.set( cache_key, raw_json["view"]);
			redisCluster.expire( cache_key, redis_cache_timeout );	
			getPreview(res, raw_json, redisCluster);
	}else{
		getPreview(res, raw_json, redisCluster);
	} 
}	

function getDataFromMySQL(res, raw_json, redisCluster){
	
	var mysql_connection = config.getMySQLConnection();
	var data = [];
	var url = raw_json["url"];
	var rpl_url = raw_json["rpl_url"];
	var tournament_id = raw_json["tournament_id"];
	var social = raw_json["social"];
	var cache_key = raw_json["cache_key"];
	
	mysql_connection.connect(function(err) {
		
		if (err) {
			mysql_connection.end();
			log.error( "[500] viewShare Service: " + err.stack );
			utils.printJSON(res, utils.getJSONObject(500, err.stack, null));
			return;
		}
		
		//*************************************//
		if(raw_json["option"] != "update"){
			
			//+++++++ SQL ++++++++//
			data.push(rpl_url, social);
			var query = "SELECT countview ";
			query = query + " from `ss_social` ";
			query = query + " WHERE (url = ? AND `social_group` = ? )";
			query = query + " LIMIT 1 ";
			
			//++++++++++++++++++++//
			
			mysql_connection.query({
						sql : query, 
						timeout : 2000, //2 Sec.
						values : data
					}, function(error, result) {	
					
					if (error){	
						mysql_connection.end();
						log.error( "[500] ViewShare getDataFromMySQL: " + error.stack );
					} else {
						if (utils.isEmptyObject(result)) {
								var data = [];
								data.push(cache_key, social, rpl_url, tournament_id);
								var query = "INSERT INTO `ss_social` ";
								query = query + "(`id`, `social_name`, `social_group`, `countview`, `url`, `tournament_id`) ";
								query = query + "VALUES (NULL, ?, ?, 1, ?, ?)";	
								mysql_connection.query({
									sql : query, 
									timeout : 2000, //2 Sec.
									values : data
								}, function(error1, result2) {
									mysql_connection.end();
									if (error1) {
										log.error( "[500] InsertgetDataFromMySQL:"  + error1.stack );
									}else{
										raw_json["view"] = 1;
										getPreview(res, raw_json, redisCluster);	
									}	
									
									
								});	
						}else{ // Get View into Database
							var rs = result[0];
							raw_json["view"] = rs["countview"];		
							setData2RedisCluster(res, raw_json, redisCluster);
						}
				   }
			});
						
		}else{  // Update View Into Database
			
			data.push(raw_json["view"], rpl_url, social, tournament_id);
			//+++++++ SQL ++++++++//	
			var query = "UPDATE `ss_social` ";
				query = query + "SET `countview` = ? ";
				query = query + "WHERE (`url` = ? AND `social_group` = ? ) AND  `tournament_id` = ? ";
			//+++++++ SQL ++++++++//
			
			mysql_connection.query({
				sql : query, 
				timeout : 2000, //2 Sec.
				values : data
			}, function(error, result) {	
				
				if(result["changedRows"] > 0){
					mysql_connection.end();	
					getPreview(res, raw_json, redisCluster);
				}else{
					var data = [];
					data.push(cache_key, social, raw_json["view"], rpl_url, tournament_id);
					var query = "INSERT INTO `ss_social` ";
					query = query + "(`id`, `social_name`, `social_group`, `countview`, `url`, `tournament_id`) ";
					query = query + "VALUES (NULL, ?, ?, ?, ?, ?)";	
						
					mysql_connection.query({
						sql : query, 
						timeout : 2000, //2 Sec.
						values : data
					}, function(error1, result2) {
							mysql_connection.end();
							if (error1) {
								log.error( "[500] InsertgetDataFromMySQL:"  + error1.stack );
							}else{

								getPreview(res, raw_json, redisCluster);	
							}							
					});	
				}
			});	
			
		}	
		//*************************************//
	});	
}

function getKeyData(res, url, social, opt){
	
	var redisCluster = config.getRedisCluster();
	var rpl_url = url.replace(/_/g, '/');
	var cache_key = keys + rpl_url + "-" + social;
	var rand = Math.floor(Math.random() * 100) + 1;
	var raw_json = [];
	
	///   Create Object Array   \\\
	raw_json["url"] = url;
	raw_json["rpl_url"] = rpl_url;
	raw_json["cache_key"] = cache_key;
	raw_json["rand"] = rand;  // this for use random update database
	raw_json["option"]= "insert";
	raw_json["tournament_id"] = tournament_id;
	raw_json["view"] = 0;
	raw_json["comment"] = "created";
	raw_json["social"] = social;
	///   Create Object Array   \\\	

	//*********************************************//
	redisCluster.once('connect', function() {
		redisCluster.exists(cache_key, function (err, reply) {
			if (err) {
				utils.printJSON(res, utils.getJSONObject(500, err.stack, null));
			} else {
				// if(opt == "share"){
				if(opt == "get"){
					if(reply){  // 1 = true , 0 = false
						redisCluster.incr(cache_key, function(err, value) { // increase visitor redis
							raw_json["view"] = value;
							
							if((value % 10) == 0){  //random update into database
								raw_json["option"] = "update";
								raw_json["comment"] = raw_json["option"];
								getDataFromMySQL(res, raw_json, redisCluster);
							}else{
								raw_json["comment"] = "increase";
								getPreview(res, raw_json, redisCluster);
							}
							
						});
					}else{
						getDataFromMySQL(res, raw_json, redisCluster);
					}
					
				}else{ //=== Else not Share
					redisCluster.get(cache_key, function(error, reply) {
                        if (error) {
                             log.error("[500] getKeyData[redisCluster.get]: " + error.stack);
                             //getDataFromMySQL(res, redisCluster, param, key);
                         } else{
                              if (reply != "" && reply != undefined) {
                              	 raw_json["view"] = reply;
                                 // getPreview(res, raw_json, redisCluster);
                                 // raw_json["option"] = "update";

                              } else {
                              	raw_json["option"] = "update";
                                 // getDataFromMySQL(res, raw_json, redisCluster);
                              }
                              getDataFromMySQL(res, raw_json, redisCluster);
                          }
                     });
				}		
			}	
		});	
	});
	//********************************************//		
}

// router.get('/:url', function(req, res, next) {
	
// 	var url = req.params.url;
// 	var str = url.match(/siamsport.co.th/g);
	
// 	if(str){
// 		utils.printJSON(res, utils.getJSONObject(507, "Service not use", null));	
// 	}else{
// 		utils.printJSON(res, utils.getJSONObject(507, "Service not use", null));	
// 	}

// });

// router.get('/:url/:social', function(req, res, next) {
router.get('/', function(req, res, next) {
	
	// var url = req.params.url;
	// var social = req.params.social;
	// var str = url.match(/siamsport.co.th/g);

	var url = req.query.url;
	// var social = req.query.social;
	
	// if(conf_types.indexOf(social) >= 0 ){
	// 	if(str){
	// 		getKeyData(res, url, social, "get");
	// 	}else{
	// 		utils.printJSON(res, utils.getJSONObject(507, "Service not use", null));	
	// 	}
	// }else{
	// 	utils.printJSON(res, utils.getJSONObject(507, "Service not use", null));	
	// }	

	getKeyData(res, url, "all", "get");
	
});

router.get('/:url/:social/:opt', function(req, res, next) {
	
	var url = req.params.url;
	var social = req.params.social;
	var str = url.match(/siamsport.co.th/g);
	var opt = req.params.opt;
	
	if(conf_types.indexOf(social) >= 0 ){
		if(str && opt == "share"){
			getKeyData(res, url, social, opt);
		}else{
			utils.printJSON(res, utils.getJSONObject(507, "Service not use", null));	
		}
	}else{
		utils.printJSON(res, utils.getJSONObject(507, "Service not use", null));	
	}	
	
});

module.exports = router;
