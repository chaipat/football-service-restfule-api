var express = require('express');
var config = require('../config/index');
var utils = require('../utils/index');
var log = require('../logging/index');
var async = require("async");
var router = express.Router();

var keys = config.getKeyPrefix() + config.getKeyProjectName() + "visitor-";
var conf_types = ["news", "column", "video", "gallery"];
var conf_rand = 500; // for use random update to visitor database
var redis_cache_timeout = 360000;
//===================================================================//

function clearGarbageCollection() {

	if (utils.clearGarbageCollection() == false) {
	   log.error("Garbage collection unavailable.  Pass --expose-gc when launching node to enable forced garbage collection.");
	}
}

function getPreview(res, raw_json, redisCluster){

	var data = {};
	data.view_count = parseInt(raw_json["view"]);
	data.comment = raw_json["comment"];
	
	utils.printJSON(res, utils.getJSONObject(200, "success", data));

	if( redisCluster != null ) {
		redisCluster.disconnect();
		redisCluster = null;
	}

	clearGarbageCollection();
}

function setData2RedisCluster(res, raw_json, redisCluster){
	
	var cache_key = raw_json["cache_key"];
	if(redisCluster != null) {

		redisCluster.set( cache_key, raw_json["view"], function(err, reply) {

			if (!err) {
				redisCluster.expire( cache_key, redis_cache_timeout );	
			}

			if( redisCluster != null ) {
				redisCluster.disconnect();
				redisCluster = null;
			}
		});
		
		getPreview(res, raw_json, redisCluster);

	} else {

		getPreview(res, raw_json, redisCluster);
	} 
}	

function setDailyFromMysql(res, raw_json, mysql_connection, redisCluster){
	
	var id = raw_json["id"];
	var tournament_id = raw_json["tournament_id"];
	var cache_key = raw_json["cache_key"];
	var types = raw_json["types"];
	var view = raw_json["view"];
	
	var data = [];
	data.push( id, types );
	
	var query = "SELECT sum(view_count) as view_count ";
	query = query + " FROM `ss_report_viewcount` ";
	query = query + " WHERE DATE_FORMAT(`date`, '%Y-%m-%d') < CURDATE() ";
	query = query + " AND (`ss_report_viewcount`.ref_id = ? and `ss_report_viewcount`.types = ? ) ";
	
	if(tournament_id > 0){
		query = query + " AND tournament_id = " + tournament_id;
	}

	mysql_connection.query({
		sql : query, 
		timeout : 2000, //2 Sec.
		values : data
	}, function(error, result) {
		
		if (error) {	

			mysql_connection.end();
			if( redisCluster != null ) {
				redisCluster.disconnect();
				redisCluster = null;
			}

			log.error(query);
			log.error(data);
			log.error( "[500] viewCount-setDailyFromMysql: " + error.stack );
			utils.printJSON(res, utils.getJSONObject(500, error.stack, null));

		} else {
			
			var rs = result[0];
			var view_count = rs["view_count"];
			
			if(view_count) {

				var query = "SELECT view_count ";
				query = query + " from `ss_report_viewcount` ";
				query = query + " WHERE (`ss_report_viewcount`.ref_id = ? and `ss_report_viewcount`.types = ? ) ";
				query = query + " AND DATE_FORMAT(`date`, '%Y-%m-%d') = CURDATE() ";
				
				if(tournament_id > 0){
					query = query + " AND tournament_id = " + tournament_id;
				}
				
				mysql_connection.query({
					sql : query, 
					timeout : 2000,
					values : data
				}, function(error1, result1) {	
					
					if (error1) {

						mysql_connection.end();
						if( redisCluster != null ) {
							redisCluster.disconnect();
							redisCluster = null;
						}

						log.error(query);
						log.error(data);
						log.error( "[500] viewCount-setDailyFromMysql: " + error1.stack );
						utils.printJSON(res, utils.getJSONObject(500, error1.stack, null));

					} else {	
					
						if( utils.isEmptyObject(result1)) {
							
							view = view - view_count;
							if(view <= 0) {
								view = 1;
							}

							var query = "INSERT INTO `ss_report_viewcount` ";
							query = query + "(`ref_id`, `types`, `view_count`, `date`, `tournament_id`) ";
							query = query + "VALUES ("+ id + ", '"+ types +"', " + view + ", CURDATE(), "+tournament_id+" )";
							mysql_connection.query({
								sql : query, 
								timeout : 2000
							}, function(error2, result2) {

								mysql_connection.end();
								if(error2) {
									log.error(query);
									log.error( "[500] viewCount-setDailyFromMysql: " + error2.stack );
									utils.printJSON(res, utils.getJSONObject(500, error2.stack, null));
								} else {
									getPreview(res, raw_json, redisCluster);
								}
							});	

						} else {
							
							view = view - view_count;
							if(view <= 0){
								view = 1;
							}
									
							var query = "UPDATE `ss_report_viewcount` ";
							query = query + " SET `view_count` = " + view + " ";
							query = query + " WHERE (`ss_report_viewcount`.ref_id = "+id+" and `ss_report_viewcount`.types = '"+ types +"' ) ";
							query = query + " AND DATE_FORMAT(`date`, '%Y-%m-%d') = CURDATE() ";
									
							mysql_connection.query({
								sql : query, 
								timeout : 2000
							}, function(error, result) {

								mysql_connection.end();

								if(error) {
									log.error(query);
									log.error("[500] viewCount-setDailyFromMysql: " + error.stack);
									utils.printJSON(res, utils.getJSONObject(500, error.stack, null));
								} else {
									getPreview(res, raw_json, redisCluster);
								}
							});		
						}
					}
				});

			} else {
				
				var query = "INSERT INTO `ss_report_viewcount` ";
				query = query + "(`ref_id`, `types`, `view_count`, `date`, `tournament_id`) ";
				query = query + "VALUES ("+ id + ", '"+ types +"', " + view + ", CURDATE(), "+tournament_id+" )";
				
				mysql_connection.query({
					sql : query, 
					timeout : 2000
				}, function(error2, result2) {
					
					if(error2) {

						var query = "UPDATE `ss_report_viewcount` ";
						query = query + " SET `view_count` = " + view + " ";
						query = query + " WHERE (`ss_report_viewcount`.ref_id = "+id+" and `ss_report_viewcount`.types = '"+ types +"' ) ";
						query = query + " AND DATE_FORMAT(`date`, '%Y-%m-%d') = CURDATE() ";
						mysql_connection.query({
							sql : query, 
							timeout : 2000
						}, function(error3, result3) {
							
							mysql_connection.end();
							if(error3) {
								log.error( "[500] viewCount-setDailyFromMysql: " + error3.stack );
							}

							getPreview(res, raw_json, redisCluster);
						});	

					} else {

						mysql_connection.end();
						getPreview(res, raw_json, redisCluster);	
					}
				});	
			}
		}
	});
}

function getDataFromMySQL(res, raw_json, redisCluster){
	
	var mysql_connection = config.getMySQLConnection();
	var data = [];
	var id = raw_json["id"];
	var page = raw_json["types"];
	var tournament_id = raw_json["tournament_id"];
	var cache_key = raw_json["cache_key"];
	
	mysql_connection.connect(function(err) {
		
		if (err) {

			mysql_connection.end();
			if( redisCluster != null ) {
				redisCluster.disconnect();
				redisCluster = null;
			}

			log.error( "[500] viewCount Service: " + err.stack );
			utils.printJSON(res, utils.getJSONObject(500, err.stack, null));

		} else {

			if(raw_json["option"] != "update"){
				
				var query = "";

				if(page == "news"){
					query = "SELECT countview, title, description ";
					query = query + "FROM `ss_news` ";
					query = query + "WHERE (status = 1 AND approve = 1) AND lang = 'th' ";
					query = query + "AND news_id2 = " + id;
				}else if(page == "column"){
					query = "SELECT countview, title, description ";
					query = query + "FROM `ss_column` ";
					query = query + "WHERE (`ss_column`.status = 1 AND `ss_column`.approve = 1) AND `ss_column`.lang = 'th' ";
					query = query + "AND column_id2 = " + id;
				}else if(page == "video"){
					query = "SELECT countview, title, caption ";
					query = query + "FROM `ss_video` ";
					query = query + "WHERE (`ss_video`.status = 1 AND `ss_video`.approve = 1) ";
					query = query + "AND video_id2 = " + id;
				}
				
				if(tournament_id > 0){
					 query = query + " AND tournament_id = " + tournament_id;
				}
				
				mysql_connection.query({
					sql : query, 
					timeout : 2000 //2 Sec.
				}, function(error, result) {	

					mysql_connection.end();
					if (error){	
						log.error(query);
						log.error( "[500] viewCount:getDataFromMySQL: " + error.stack );
						utils.printJSON(res, utils.getJSONObject(500, error.stack, null));
					} else {

						if (utils.isEmptyObject(result)) {
							utils.printJSON(res, utils.getJSONObject(404, "Not Found ID", null));	
						}else { 
							var rs = result[0];
							raw_json["view"] = rs["countview"];	
							raw_json["title"] = rs["title"];	
							raw_json["description"] = rs["description"];	
							setData2RedisCluster(res, raw_json, redisCluster);
						}
				   }
				});
							
			} else {
				
				data.push(raw_json["view"], id);

				var query = "";
				if(page == "news"){
					query = " UPDATE `ss_news` SET `countview` = ? WHERE news_id2 = ? AND lang = 'th' ";
				}else if(page == "column"){
					query = " UPDATE `ss_column` SET `countview` = ? WHERE column_id2 = ? AND lang = 'th' ";
				}else if(page == "video"){
					query = " UPDATE `ss_video` SET `countview` = ? WHERE video_id2 = ? ";
				}
				
				if(tournament_id > 0){
					query = query + " AND tournament_id = " + tournament_id;
				}
				
				mysql_connection.query({
					sql : query, 
					timeout : 10000, //10 Sec.
					values : data
				}, function(error, result) {		

					if(error) {
						log.error(query);
						log.error(data);
						log.error( "[500] viewCount:getDataFromMySQL: " + error.stack );
						utils.printJSON(res, utils.getJSONObject(500, error.stack, null));
					} else {

						if(result["changedRows"] > 0){
							setDailyFromMysql(res, raw_json, mysql_connection, redisCluster);
						} else {
							mysql_connection.end();
							utils.printJSON(res, utils.getJSONObject(500, "can not update view count", null));
						}
					}
				});	
				
			}	
		}
	});	
}

function getKeyData(res, types, id, tournament_id, cache){
	
	var redisCluster = config.getRedisCluster();
	var cache_key = keys + types + "-" + id;
	var rand = Math.floor(Math.random() * 1000) + 1;
	var raw_json = [];
	
	raw_json["cache_key"] = cache_key;
	raw_json["id"] = id;
	raw_json["rand"] = rand;  // this for use random update database
	raw_json["types"] = types;
	raw_json["option"]= "insert";
	raw_json["tournament_id"] = tournament_id;
	raw_json["view"] = 0;
	raw_json["comment"] = "created";

	redisCluster.once('connect', function() {

		redisCluster.exists(cache_key, function (err, reply) {

			if (err) {

				if( redisCluster != null ) {
					redisCluster.disconnect();
					redisCluster = null;
				}
				utils.printJSON(res, utils.getJSONObject(500, err.stack, null));
			} else {

				if(reply){  // 1 = true , 0 = false

					redisCluster.incr(cache_key, function(err, value) { // increase visitor redis
						
						raw_json["view"] = value;
						
						if( (value % 10) == 0 ){  //random update into database
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
			}	
		});	
	});
}

router.get('/', function(req, res, next) {

	utils.printJSON(res, utils.getJSONObject(504, "Missing the Parameter.", null));
});

router.get('/:types', function(req, res, next) {

	utils.printJSON(res, utils.getJSONObject(504, "Missing the Parameter.", null));
});

router.get('/:types/:id', function(req, res, next) {
	
	var id = req.params.id;
	var types = req.params.types;
	
	if (isNaN(id)) {
     	 utils.printJSON(res, utils.getJSONObject(507, "Input needs to numberic", null));	
    }else if(id < 0){
		 utils.printJSON(res, utils.getJSONObject(507, "Input needs to Cardinal Number", null));	
	}else{
    
	    if(conf_types.indexOf(types) >= 0 ){
			getKeyData(res, types, id, 0); // Get Key Redis 
		}else{
			utils.printJSON(res, utils.getJSONObject(507, "Types not found.", types));	
		}
	}	
});

module.exports = router;