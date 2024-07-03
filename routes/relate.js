var express = require('express');
var config = require('../config/index');
var utils = require('../utils/index');
var log = require('../logging/index');
var dateFormat = require('dateformat');
var async = require("async");

var router = express.Router();
var cached = "redis";
var tournament_id = 0;
var conf_types = ["news", "column", "video", "gallery"];
var redis_cache_timeout = 432000; //Second //5 Days (5*24*60*60)
var memcached_cache_timeout = 604800; //Second //1 Week (7*24*60*60)

var logger = "[Relate]-";
var cache_key = config.getKeyPrefix() + "Relate_";

function setData2RedisCluster(redisCluster, news_data, preview, callback) {

	var key = cache_key + news_data["id"];
	var value = JSON.stringify(news_data);
	
	if(preview == true){
			callback(null, news_data);
	}else{
		if(redisCluster != null) {
			redisCluster.set( key, value);
			redisCluster.expire( key, redis_cache_timeout );
			callback(null, news_data);
		} else {
			callback(null, news_data);
		}
	}	
	
}

function getRelateClip(redisCluster, memcached, mysql_connection, news_data, preview, callback) {

	var id = news_data["id"];
	var relate = news_data["relate"];
	var query = "SELECT `ss_news_relate`.order, `ss_news_relate`.news_id as relate_id, `ss_video`.title, concat(`ss_picture`.`folder`,'/',`ss_picture`.`file_name`) as picture, redirect_url, tournament_id "; 
	query = query + "FROM `ss_news_relate` ";
	query = query + "JOIN `ss_video` ON `ss_news_relate`.`news_id` = `ss_video`.`video_id2` ";
	query = query + "AND `ss_video`.`status` = 1 AND `ss_video`.`approve` = 1 AND `ss_news_relate`.type = 'clip' ";	
	query = query + "LEFT JOIN `ss_picture` ON `ss_video`.`video_id2` = `ss_picture`.`ref_id` AND `ss_picture`.`ref_type` = 4 AND `ss_picture`.`default` = 1 ";
	query = query + "WHERE `ss_news_relate`.ref_id = ? ";
	query = query + "ORDER BY `ss_news_relate`.`order` ASC";

	var data_for_query = [];
	data_for_query.push( id );

	mysql_connection.query({
		sql : query, 
		timeout : 2000, //2 Sec.
		values : data_for_query
	}, function(error, result) {

		if (error) {
			log.error( "[500] getRelateVideo Service: " + error );
			//news_data.relate = [];
		} else {

			if( !utils.isEmptyObject(result) && result.length > 0 ) {
				
				for(var i=0; i<result.length; i++) {
					var obj = result[i];
					obj.type = "video";				
					result[i] = obj;
					
					relate.push(obj);
				}
				news_data.relate = relate;
				
				news_data.relate.sort(function(a, b){
 					return a.order>b.order;
				});
			} 
		}

		//callback(null, redisCluster, memcached, news_data, preview);
		callback(null, redisCluster, memcached, mysql_connection, news_data, preview);
	});
}

function getRelateColumn(redisCluster, memcached, mysql_connection, news_data, preview, callback) {

	var id = news_data["id"];
	var relate = news_data["relate"];
	var query = "SELECT `ss_news_relate`.order, `ss_news_relate`.news_id as relate_id, `ss_column`.title, concat(`ss_picture`.`folder`,'/',`ss_picture`.`file_name`) as picture, redirect_url, tournament_id "; 
	query = query + "FROM `ss_news_relate` ";
	query = query + "JOIN `ss_column` ON `ss_news_relate`.`news_id` = `ss_column`.`column_id2` ";
	query = query + "AND `ss_column`.`status` = 1 AND `ss_column`.`approve` = 1 AND `ss_news_relate`.type = 'column' ";	
	query = query + "LEFT JOIN `ss_picture` ON `ss_column`.`column_id2` = `ss_picture`.`ref_id` AND `ss_picture`.`ref_type` = 2 AND `ss_picture`.`default` = 1 ";
	query = query + "WHERE `ss_news_relate`.ref_id = ? ";
	query = query + "ORDER BY `ss_news_relate`.`order` ASC";

	var data_for_query = [];
	data_for_query.push( id );

	mysql_connection.query({
		sql : query, 
		timeout : 2000, //2 Sec.
		values : data_for_query
	}, function(error, result) {

		if (error) {
			log.error( "[500] getRelate Service: " + error );
			//news_data.relate = [];
		} else {

			if( !utils.isEmptyObject(result) && result.length > 0 ) {
				
				for(var i=0; i<result.length; i++) {
					var obj = result[i];
					obj.type = "column";				
					result[i] = obj;
					
					relate.push(obj);
				}
				news_data.relate = relate;
			} 
		}

		//callback(null, redisCluster, memcached, news_data, preview);
		callback(null, redisCluster, memcached, mysql_connection, news_data, preview);
	});
}

function getRelate(redisCluster, mysql_connection, news_data, callback) {

	var id = news_data["id"];
	var query = "SELECT `ss_news_relate`.order, `ss_news_relate`.news_id as relate_id, `ss_news`.title, concat(`ss_picture`.`folder`,'/',`ss_picture`.`file_name`) as picture, redirect_url, tournament_id "; 
	query = query + "FROM `ss_news_relate` ";
	query = query + "JOIN `ss_news` ON `ss_news_relate`.`news_id` = `ss_news`.`news_id2` ";
	query = query + "AND (`ss_news`.`status` = 1 AND `ss_news`.`approve` = 1) AND `ss_news_relate`.type = 'news' ";	
	query = query + "LEFT JOIN `ss_picture` ON `ss_news`.`news_id2` = `ss_picture`.`ref_id` AND `ss_picture`.`ref_type` = 1 AND `ss_picture`.`default` = 1 ";
	query = query + "WHERE `ss_news_relate`.ref_id = ? ";
	query = query + "ORDER BY `ss_news_relate`.`order` ASC";

	var data_for_query = [];
	data_for_query.push( id );

	mysql_connection.query({
		sql : query, 
		timeout : 2000, //2 Sec.
		values : data_for_query
	}, function(error, result) {

		if (error) {
			log.error( "[500] getRelate Service: " + error );
			news_data.relate = [];
		} else {

			if( !utils.isEmptyObject(result) && result.length > 0 ) {
				
				for(var i=0; i<result.length; i++) {
					var obj = result[i];
					obj.type = "news";
					//obj.query = query;				
					result[i] = obj;
				}
				news_data.relate = result;
			} else {
				news_data.relate = [];
			}
		}

		callback(200, news_data);
		//callback(null, redisCluster, memcached, mysql_connection, news_data, preview);
	});
}

function prepareWaterfall(res, redisCluster, param) {


	var mysql_connection = config.getMySQLConnection();
	mysql_connection.connect(function(err) {

		if (err) {
			mysql_connection.end();
			log.error( "[500] GetRelate Service - prepareWaterfall: " + err );
			utils.printJSON(res, utils.getJSONObject(500, err, null));
		} else {

			async.waterfall([
				async.apply(getRelate, redisCluster, mysql_connection, param),
				//getRelateColumn,
				//getRelateClip,
				//setData2Memcached,
				//setData2RedisCluster,
			], function (err, result) {

				mysql_connection.end();
				mysql_connection = null;

				if( redisCluster != null ) {
					redisCluster.disconnect();
					redisCluster = null;
				}

				
			    if(err) {
			    	
			    	var output = [];
			    	output[0] = result;
			    	if(err == 200) {
						utils.printJSON(res, utils.getJSONObject(200, "Success", output));
			    	} else {
			    		utils.printJSON(res, utils.getJSONObject(err, output, null));	
			    	}
			    		
			    } else {
			    	
			    	var output = [];
			    	output[0] = result;
			    	utils.printJSON(res, utils.getJSONObject(200, "Success", output));
			    }
			});
		}
	});
}

function getDataFromRedisCluster(res, key, id, preview, clear_cache) {
	
	var redisCluster = config.getRedisCluster();
	redisCluster.once('connect', function() {
		redisCluster.exists(key, function (err, reply) {
			if (err) {

				if( redisCluster != null ) {
					redisCluster.disconnect();
					redisCluster = null;
				}
				utils.printJSON(res, utils.getJSONObject(500, err.stack, null));
			}else{

				if(reply == true){

					if(clear_cache == true) {
						redisCluster.del(key, function(err) {

                            if (redisCluster != null) {
                                redisCluster.disconnect();
                                redisCluster = null;
                            }
                        });
						utils.printJSON(res, utils.getJSONObject(200, "Delete : " + key, null));
					}else{

						redisCluster.get( key, function (error, reply) {
							
							if(error) {
								prepareWaterfall(res, redisCluster, null, id, preview, clear_cache);
							} else {
								if(reply != "" && reply != undefined) {
									var json = [];
									json[0] = JSON.parse(reply);
									redisCluster.disconnect();	
									utils.printJSON(res, utils.getJSONObject(200, "Redis", json));					
								} else {
									
									prepareWaterfall(res, redisCluster, null, id, preview, clear_cache);
									
								}
							}
						});
					}
				}else{
					prepareWaterfall(res, redisCluster, null, id, preview, clear_cache); //get database
				}			
			}
		});
	});
}

router.get('/', function(req, res, next) {
	
	utils.printJSON(res, utils.getJSONObject(504, "Missing the Parameter.", null));
});

router.get('/:types/:id', function(req, res, next) {
	
	var param = {};
	var id = parseInt(req.params.id);
	var types = req.params.types;
		
	 if(conf_types.indexOf(types) >= 0 ){
	 	
	 	param.id = req.params.id;
		param.types = req.params.types;
		param.key = cache_key + types + "_" + id;
	 	prepareWaterfall(res, null, param); 
	 }else{
		utils.printJSON(res, utils.getJSONObject(507, "Types not found.", types));	
	 }	
});



module.exports = router;