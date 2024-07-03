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

function setData2RedisCluster(redisCluster, news_data, callback) {

	callback(null, news_data);
	var key = news_data["key"];
	var value = JSON.stringify(news_data);
	
	if(redisCluster != null) {

		redisCluster.set( key, value, function(err, reply) {

			if(!err) {
				redisCluster.expire( key, redis_cache_timeout );	
			}

			if (redisCluster != null) {
                redisCluster.disconnect();
                redisCluster = null;
            }
		});
	}
}

function getRelateClip(redisCluster, mysql_connection, news_data, callback) {

	var limit = ""
	if (news_data["limit"] == undefined) {
		limit = init_limit;
	} else {
		limit = limit = news_data["limit"];
	}

	var id = news_data["id"];
	var relate = news_data["relate"];

	var query = "SELECT `ss_news_relate`.order, `ss_news_relate`.news_id as relate_id, ";
	query = query + " `ss_video`.title, concat(`ss_picture`.`folder`,'/',`ss_picture`.`file_name`) as picture, ";
	query = query + " ss_picture.folder, ss_picture.file_name, redirect_url, ss_tournament.tournament_id, ss_tournament.tournament_name_th, ss_tournament.tournament_name_en, ss_tournament.url as tournament_url, ss_tournament.dimension as tournament_dimension, ss_tournament.domain as domain, ss_sport.sport_name_th, ss_sport.sport_name_en, ss_sport.url as sport_url, ss_sport.dimension as sport_dimension, DATE_FORMAT(ss_video.lastupdate_date, '%d-%m-%Y %H:%m') AS lastupdate_date "; 
	query = query + "FROM `ss_news_relate` ";
	query = query + "JOIN `ss_video` ON `ss_news_relate`.`news_id` = `ss_video`.`video_id2` ";
	query = query + "AND `ss_video`.`status` = 1 AND `ss_video`.`approve` = 1 AND `ss_news_relate`.type = 'clip' ";	
	query = query + "LEFT JOIN `ss_picture` ON `ss_video`.`video_id2` = `ss_picture`.`ref_id` AND `ss_picture`.`ref_type` = 4 AND `ss_picture`.`default` = 1 ";
	query = query + "LEFT JOIN ss_tournament ON ss_video.tournament_id = ss_tournament.tournament_id LEFT JOIN ss_sport ON ss_video.sport_id = ss_sport.sport_id ";
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
			log.error( "[500] getRelateVideo Service: " + error.stack );
		} else {

			if( !utils.isEmptyObject(result) && result.length > 0 ) {
				
				for(var i=0; i<result.length; i++) {

					var obj = result[i];
					obj.types = "vdo";
					result[i] = obj;
					
					relate.push(obj);

					var data2 = result[i];
					for(var j in data2) {

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
				news_data.relate = relate;
				news_data.relate.sort(function(a, b) {

 					return a.order>b.order;
				});

				// news_data.relate = news_data.relate.slice(0, 2);
			} 
		}

		news_data.relate = news_data.relate.slice(0, limit);
		
		callback(null, redisCluster, news_data);
	});
}

function getRelateColumn(redisCluster, mysql_connection, news_data, callback) {

	var id = news_data["id"];
	var relate = news_data["relate"];
	var query = "SELECT `ss_news_relate`.order, `ss_news_relate`.news_id as relate_id, ";
	query = query + " `ss_column`.title, ss_column.icon_vdo, concat(`ss_picture`.`folder`,'/',`ss_picture`.`file_name`) as picture, ";
	query = query + " ss_picture.folder, ss_picture.file_name, redirect_url, ";
	query = query + " ss_tournament.tournament_id, ss_tournament.tournament_name_th, ss_tournament.tournament_name_en, ss_tournament.url as tournament_url, ss_tournament.dimension as tournament_dimension, ss_tournament.domain as domain, ";
	query = query + " ss_sport.sport_name_th, ss_sport.sport_name_en, ss_sport.url as sport_url, ss_sport.dimension as sport_dimenstion, DATE_FORMAT(ss_column.lastupdate_date, '%d-%m-%Y %H:%m') AS lastupdate_date "; 
	query = query + "FROM `ss_news_relate` ";
	query = query + "JOIN `ss_column` ON `ss_news_relate`.`news_id` = `ss_column`.`column_id2` ";
	query = query + "AND `ss_column`.`status` = 1 AND `ss_column`.`approve` = 1 AND `ss_news_relate`.type = 'column' ";	
	query = query + "LEFT JOIN `ss_picture` ON `ss_column`.`column_id2` = `ss_picture`.`ref_id` AND `ss_picture`.`ref_type` = 2 AND `ss_picture`.`default` = 1 ";
	query = query + "LEFT JOIN ss_tournament ON ss_column.tournament_id = ss_tournament.tournament_id LEFT JOIN ss_sport ON ss_column.sport_id = ss_sport.sport_id ";
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
			log.error( "[500] getRelate Service: " + error.stack );
			//news_data.relate = [];
		} else {

			if( !utils.isEmptyObject(result) && result.length > 0 ) {
				
				for(var i=0; i<result.length; i++) {

					var obj = result[i];
					obj.types = "column";				
					result[i] = obj;
					
					relate.push(obj);

					var data2 = result[i];
					for(var j in data2) {

						var picType = 'news';
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
				news_data.relate = relate;
			} 
		}

		callback(null, redisCluster, mysql_connection, news_data);
	});
}

function getRelate(redisCluster, mysql_connection, news_data, callback) {

	var id = news_data["id"];
	var query = "SELECT `ss_news_relate`.order, `ss_news_relate`.news_id as relate_id, ss_news.news_special_id, ss_ns.name as news_special_name, \
	 `ss_news`.title, ss_news.icon_vdo, concat(`ss_picture`.`folder`,'/',`ss_picture`.`file_name`) as picture, `ss_picture`.`folder`, `ss_picture`.`file_name`,  redirect_url, ss_tournament.tournament_id, ss_tournament.tournament_name_th, ss_tournament.tournament_name_en, ss_tournament.url as tournament_url, ss_tournament.dimension as tournament_dimension, ss_tournament.domain as domain, ss_sport.sport_name_th, ss_sport.sport_name_en, ss_sport.url as sport_url, ss_sport.dimension as sport_dimension, DATE_FORMAT(ss_news.lastupdate_date, '%d-%m-%Y %H:%m') AS lastupdate_date "; 
	query = query + "FROM `ss_news_relate` ";
	query = query + "JOIN `ss_news` ON `ss_news_relate`.`news_id` = `ss_news`.`news_id2` ";
	query = query + "AND (`ss_news`.`status` = 1 AND `ss_news`.`approve` = 1) AND `ss_news_relate`.type = 'news' ";	
	query = query + "LEFT JOIN `ss_picture` ON `ss_news`.`news_id2` = `ss_picture`.`ref_id` AND `ss_picture`.`ref_type` = 1 AND `ss_picture`.`default` = 1 ";
	query = query + "LEFT JOIN ss_tournament ON ss_news.tournament_id = ss_tournament.tournament_id LEFT JOIN ss_sport ON ss_news.sport_id = ss_sport.sport_id ";
	query = query + " LEFT JOIN ss_news_special ss_ns ON ss_news.news_special_id = ss_ns.news_special_id ";
	query = query + "WHERE `ss_news_relate`.ref_id = ? ";
	query = query + "ORDER BY `ss_news_relate`.`order` ASC ";
	query = query + "LIMIT 4";

	var data_for_query = [];
	data_for_query.push( id );

	mysql_connection.query({
		sql : query, 
		timeout : 2000, //2 Sec.
		values : data_for_query
	}, function(error, result) {

		if (error) {
			log.error( "[500] getRelate Service: " + error.stack );
			news_data.relate = [];
		} else {

			if( !utils.isEmptyObject(result) && result.length > 0 ) {
				
				for(var i=0; i<result.length; i++) {

					var obj = result[i];
					obj.types = "news";		
					result[i] = obj;

					var data2 = result[i];
					for(var j in data2) {

						var picType = 'news';
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

		callback(null, redisCluster, mysql_connection, news_data);
	});
}

function prepareWaterfall(res, redisCluster, param) {

	var mysql_connection = config.getMySQLConnection();
	mysql_connection.connect(function(err) {

		if (err) {
			mysql_connection.end();

			if (redisCluster != null) {
	            redisCluster.disconnect();
	            redisCluster = null;
	        }

			utils.printJSON(res, utils.getJSONObject(500, err.stack, null));

		} else {

			async.waterfall([
				async.apply(getRelate, redisCluster, mysql_connection, param),
				getRelateColumn,
				getRelateClip,
				setData2RedisCluster,
			], function (err, result) {

				mysql_connection.end();
				
			    if(err) {
			    	
			    	var output = [];
			    	output[0] = result;

			    	if(err == 200) {
						utils.printJSON(res, utils.getJSONObject(200, "Success", output));
			    	} else {

			    		if (redisCluster != null) {
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

		try {
			redisCluster.exists(key, function (err, reply) {

				if (err) {

					if(redisCluster != null) {
						redisCluster.disconnect();	
						redisCluster = null;
					}

					utils.printJSON(res, utils.getJSONObject(500, err.stack, null));
				} else {

					if(reply == true){

						if(clear_cache == true) {

							redisCluster.del( key, function(err) {

								if (redisCluster != null) {
						            redisCluster.disconnect();
						            redisCluster = null;
						        }
							});

							utils.printJSON(res, utils.getJSONObject(200, "Delete : " + key, null));

						} else {

							redisCluster.get( key, function (error, reply) {
								
								if(error) {
									prepareWaterfall(res, redisCluster, param);
								} else {

									if(reply != "" && reply != undefined) {

										var json = [];
										json[0] = JSON.parse(reply);
										if (redisCluster != null) {
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

					} else {
						prepareWaterfall(res, redisCluster, param);
					}	
				}
			});

		} catch(err) {

			if (redisCluster != null) {
	            redisCluster.disconnect();
	            redisCluster = null;
	        }

			prepareWaterfall(res, redisCluster, param);
		}
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
		param.types = "news";
		param.key = cache_key + param.types + "_" + id;
		param.cache = false;
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
		param.types = "news";
		param.key = cache_key + param.types + "_" + id;
		param.limit = req.query.limit;
		
		if(clear_cache == "clear"){
			param.cache = true;	
		}else{
			param.cache = false;
		}

	 	getDataFromRedisCluster(res, param); 

	 } else {

		utils.printJSON(res, utils.getJSONObject(507, "ILLEGAL_CHARACTERS ", null));	
	 }	
});

module.exports = router;