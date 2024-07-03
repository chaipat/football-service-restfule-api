var express = require('express');
var config = require('../config/index');
var utils = require('../utils/index');
var log = require('../logging/index');
var dateFormat = require('dateformat');
var async = require("async");

var router = express.Router();
var cached = "redis";
var tournament_id = 0;
var redis_cache_timeout = 86400; //Second //1 Days (1*24*60*60)
var logger = "[Relate]-";
var cache_key = config.getKeyPrefix() + "relate_";
var init_limit = 2;

function setData2RedisCluster(redisCluster, news_data, redisCluster, callback) {

	var key = news_data["key"];
	var value = JSON.stringify(news_data);
	
	if(redisCluster != null) {
		redisCluster.set( key, value, function(err, reply) {
			
			if (!err) {
				redisCluster.expire( key, redis_cache_timeout );	
			}

			if( redisCluster != null ) {
				redisCluster.disconnect();
				redisCluster = null;
			}
		});

		callback(null, news_data);
	} else {
		callback(null, news_data);
	}
}

function getRelate(redisCluster, mysql_connection, news_data, redisCluster, callback) {

	var limit = "";
	if (news_data["limit"] == undefined) {
		limit = init_limit;
	} else {
		limit = news_data["limit"];
	}

	var id = news_data["id"];
	var query = "SELECT `ss_video_relate`.video_id as relate_id, `ss_video`.title, ";
	query = query + " concat(`ss_picture`.`folder`,'/',`ss_picture`.`file_name`) as picture, ";
	query = query + " redirect_url, ss_tournament.tournament_id, ss_tournament.tournament_name_th, ";
	query = query + " ss_tournament.tournament_name_en, ss_tournament.url as tournament_url, ss_tournament.dimension as tournament_dimension, ";
	query = query + " ss_sport.sport_name_th, ss_sport.sport_name_en, ss_sport.url as sport_url, ss_sport.dimension as sport_dimension, "; 
	query = query + " ss_picture.folder, ss_picture.file_name, DATE_FORMAT(ss_video.lastupdate_date, '%d-%m-%Y %H:%m') as lastupdate_date ";
	query = query + " FROM `ss_video_relate` ";
	query = query + " JOIN `ss_video` ON `ss_video_relate`.`video_id` = `ss_video`.`video_id2` ";
	query = query + " AND `ss_video`.`status` = 1 AND `ss_video`.`approve` = 1 ";
	query = query + " LEFT JOIN `ss_picture` ON `ss_video`.`video_id2` = `ss_picture`.`ref_id` AND `ss_picture`.`ref_type` = 4 AND `ss_picture`.`default` = 1 ";
	query = query + "LEFT JOIN ss_tournament ON ss_video.tournament_id = ss_tournament.tournament_id LEFT JOIN ss_sport ON ss_video.sport_id = ss_sport.sport_id ";
	query = query + " WHERE `ss_video_relate`.ref_id = ? " ;		
	query = query + " ORDER BY `ss_video_relate`.`order` ASC LIMIT 4 ";

	var data_for_query = [];
	data_for_query.push( id );

	mysql_connection.query({
		sql : query, 
		timeout : 2000, //2 Sec.
		values : data_for_query
	}, function(error, result) {

		if (error) {
			log.error( "[500] getRelateVideo Service: " + error );
			news_data.relate = [];
		} else {

			if( !utils.isEmptyObject(result) && result.length > 0 ) {
				
				for(var i=0; i<result.length; i++) {
					var obj = result[i];
					obj.types = "vdo";			
					result[i] = obj;

					var data2 = result[i];
					for(var j in data2){
						var picType = 'vdo';
						var picture_size = {
							'fullsize': picType + '/' + data2['folder'] +'/' + data2['file_name'],
							'size128': 'size128/' + data2['folder'] + '/' + data2['file_name'],
							'size224': 'size224/' + data2['folder'] + '/' + data2['file_name'],
                            'size304': 'size304/' + data2['folder'] + '/' + data2['file_name'],
                            'size640': 'size640/' + data2['folder'] + '/' + data2['file_name']
						};
						result[i].picture_size = picture_size;
					}
				}
				news_data.relate = result;
			} else {
				news_data.relate = [];
			}
		}

		news_data.relate = news_data.relate.slice(0, limit);
		callback(null, redisCluster, news_data, redisCluster);
	});
}

function prepareWaterfall(res, redisCluster, param) {

	var mysql_connection = config.getMySQLConnection();
	mysql_connection.connect(function(err) {

		if (err) {
			mysql_connection.end();

			if( redisCluster != null ) {
				redisCluster.disconnect();
				redisCluster = null;
			}

			log.error( "[500] GetRelate Service - prepareWaterfall: " + err );
			utils.printJSON(res, utils.getJSONObject(500, err, null));
		} else {

			async.waterfall([
				async.apply(getRelate, redisCluster, mysql_connection, param, redisCluster),
				setData2RedisCluster,
			], function (err, result) {

				mysql_connection.end();
				
			    if(err) {
			    	
			    	var output = [];
			    	output[0] = result;
			    	if(err == 200) {
						utils.printJSON(res, utils.getJSONObject(200, "Success", output));
			    	} else {

			    		if( redisCluster != null ) {
							redisCluster.disconnect();
							redisCluster = null;
						}
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

function getDataFromRedisCluster(res, param) {
	
	var key = param.key;
	var clear_cache = param.cache;
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
				////////// reply  //////////
				if(reply == true){
					////////// clear cache  //////////
					if(clear_cache == true) {
						redisCluster.del( key,function(err) {
							
							if( redisCluster != null ) {
								redisCluster.disconnect();
								redisCluster = null;
							}
						});

						utils.printJSON(res, utils.getJSONObject(200, "Delete : " + key, null));
					}else{
						redisCluster.get( key, function (error, reply) {
							if(error) {
								log.error( "[500] RelateVideo Service: " + error );
								prepareWaterfall(res, redisCluster, param);
							} else {
								if(reply != "" && reply != undefined) {
									var json = [];
									json[0] = JSON.parse(reply);
									
									if( redisCluster != null ) {
										redisCluster.disconnect();
										redisCluster = null;
									}

									utils.printJSON(res, utils.getJSONObject(200, "Redis", json));					
								} else {
									prepareWaterfall(res, redisCluster, param);
								}
							}
						});
					}
					////////// clear cache  //////////
				}else{
					prepareWaterfall(res, redisCluster, param);//get database
				}
				////////// reply  //////////			
			}
		});
	});
}

router.get('/', function(req, res, next) {
	
	utils.printJSON(res, utils.getJSONObject(504, "Missing the Parameter.", null));
});

router.get('/:id', function(req, res, next) {
	
	var param = {};
	var id = parseInt(req.params.id);
		
	if (!isNaN(id)) {
	 	param.id = req.params.id;
		param.types = "video";
		param.key = cache_key + param.types + "_" + id;
		param.limit = req.query.limit;
	 	getDataFromRedisCluster(res, param); 
	 }else{
		utils.printJSON(res, utils.getJSONObject(507, "ILLEGAL_CHARACTERS ", null));	
	 }	
});


router.get('/:id/:clear_cache', function(req, res, next) {
	
	var param = {};
	var id = parseInt(req.params.id);
	var clear_cache = req.params.clear_cache;
		
	if (!isNaN(id)) {
	 	param.id = req.params.id;
		param.types = "video";
		param.key = cache_key + param.types + "_" + id;
		param.limit = req.query.limit;
		
		if(clear_cache == "clear"){
			param.cache = true;	
		}else{
			param.cache = false;
		}

	 	getDataFromRedisCluster(res, param); 
	 }else{
		utils.printJSON(res, utils.getJSONObject(507, "ILLEGAL_CHARACTERS ", null));	
	 }	
});

module.exports = router;