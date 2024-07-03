var express = require('express');
var config = require('../config/index');
var utils = require('../utils/index');
var log = require('../logging/index');
var dateFormat = require('dateformat');
var async = require("async");

var router = express.Router();
var cached = "redis";
var redis_cache_timeout = 60; //1 minute
var logger = "[Relate]-";
var cache_key = config.getKeyType() + config.getKeyPrefix() + config.getKeyProjectName() + 'list-topview-7days';

function setData2RedisCluster(redisCluster, news_data, callback) {

	var key = news_data["key"];
	var value = JSON.stringify(news_data);
	
		if(redisCluster != null) {
			redisCluster.set( key, value, function(err, reply) {

				if (!err) {
					redisCluster.expire( key, redis_cache_timeout );
				}

				if (redisCluster != null) {
	                redisCluster.disconnect();
	                redisCluster = null;
	            }
			});
			
			callback(null, news_data);
		} else {
			callback(null, news_data);
		}
}

function getRelateClip(redisCluster, mysql_connection, news_data, callback) {

	var topview = news_data["topview"];
	var query = " SELECT vdo.video_id2 AS id, vdo.brightcove_id, vdo.tournament_id, ";
	query += " vdo.sport_id, vdo.embed_video, vdo.title, vdo.caption, vdo.countview, vdo.share, ";
	query += " vdo.order_by, DATE_FORMAT(vdo.create_date, '%Y-%m-%d %H:%i') AS create_date, ";
	query += " DATE_FORMAT(vdo.lastupdate_date, '%Y-%m-%d %H:%i') AS lastupdate_date, ";
	query += " picture.ref_type as picture_type, picture.folder, picture.file_name, ";
	query += " tournament.tournament_name_th, tournament.tournament_name_en, tournament.url as tournament_url, tournament.dimension as tournament_dimension, tournament.domain as domain, ";
	query += " sport.sport_name_th, sport.sport_name_en, sport.url as sport_url, sport.dimension as sport_dimension FROM `ss_video` AS vdo ";
	query += " LEFT JOIN `ss_picture` AS picture ON vdo.video_id2 = picture.ref_id ";
	query += " AND picture.ref_type = 4 AND picture.default = 1 ";
	query += " LEFT JOIN ss_tournament tournament ON vdo.tournament_id = tournament.tournament_id ";
	query += " LEFT JOIN ss_sport sport ON vdo.sport_id = sport.sport_id ";
	query += " WHERE vdo.sport_id = 1 AND vdo.lastupdate_date >= DATE_SUB(CURRENT_DATE, INTERVAL 7 DAY) AND vdo.lastupdate_date <= CURRENT_DATE AND vdo.status=1 AND vdo.approve=1 AND vdo.lang='th' ";
	query += " ORDER BY vdo.`countview` DESC, vdo.`lastupdate_date` DESC LIMIT 5 ";

	mysql_connection.query({
		sql : query, 
		timeout : 2000, //2 Sec.
	}, function(error, result) {

		if (error) {
			log.error( "[500] getListTopview7Days Service: [getRelateClip]: " + error.stack );
		} else {

			if( !utils.isEmptyObject(result) && result.length > 0 ) {
				
				for(var i=0; i<result.length; i++) {
					var obj = result[i];
					obj.types = "vdo";				
					result[i] = obj;
					
					topview.push(obj);

					var data2 = result[i];
					for(var j in data2){
						var picType = 'video';
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
				news_data.topview = topview;
			}
		}
				news_data.topview = topview;
				news_data.topview.sort(function(a, b) {
					return b.countview-a.countview;
				})
				news_data.topview = news_data.topview.slice(0, 5);

		callback(null, redisCluster, news_data);
	});
}

function getRelateColumn(redisCluster, mysql_connection, news_data, callback) {

	var topview = news_data["topview"];
	var query = " SELECT a.`column_id2` as id, a.`match_id`, a.`profile_id`, ";
			query += " a.`sport_id`, a.`tournament_id`, a.`micro_id`, a.`columnist_id`, ";
			query += " columnist.name as columnist_name, columnist.avatar as columnist_avatar, ";
			query += " a.`icon_pic`, a.`icon_vdo`, a.`lang`, a.`title`, a.`embed_script`, a.`keyword`, ";
			query += " a.`shorturl`, a.`redirect_url`, a.`can_comment`, a.`order_by`, a.`rate18_flag`, ";
			query += " a.`countview`, a.`share`, DATE_FORMAT(a.`create_date`, '%Y-%m-%d %H:%i') AS create_date, ";
			query += " DATE_FORMAT(a.`lastupdate_date`, '%Y-%m-%d %H:%i') AS lastupdate_date, ";
			query += " picture.ref_type as picture_type , picture.`folder`, picture.`file_name`, ";
			query += " concat(picture.folder,'/', picture.file_name) as thumbnail, ";
			query += " tournament.tournament_name_th, tournament.tournament_name_en, tournament.url as tournament_url, tournament.dimension as tournament_dimension, tournament.domain as domain, ";
			query += " sport.sport_name_th, sport.sport_name_en, sport.url as sport_url, sport.dimension as sport_dimension ";
			query += " FROM `ss_column` AS a LEFT JOIN `ss_picture` AS picture ON a.`column_id2` = picture.`ref_id` ";
			query += " AND picture.ref_type = 2 and picture.default = 1 ";
			query += " LEFT JOIN ss_tournament tournament ON a.tournament_id = tournament.tournament_id ";
			query += " LEFT JOIN ss_sport sport ON a.sport_id = sport.sport_id ";
			query += " LEFT JOIN ss_columnist columnist ON a.columnist_id = columnist.columnist_id ";
			query += " WHERE a.sport_id = 1 AND a.lastupdate_date >= DATE_SUB(CURRENT_DATE, INTERVAL 7 DAY) ";
			query += " AND a.lastupdate_date <= CURRENT_DATE AND a.status = 1 ";
			query += " AND a.approve = 1 AND a.lang = 'th' ORDER BY a.countview DESC, a.`lastupdate_date` DESC LIMIT 5 ";

	mysql_connection.query({
		sql : query, 
		timeout : 2000, //2 Sec.
	}, function(error, result) {

		if (error) {
			log.error( "[500] getListTopview7Days Service: [getRelateColumn]: " + error.stack );
		} else {

			if( !utils.isEmptyObject(result) && result.length > 0 ) {
				
				for(var i=0; i<result.length; i++) {
					var obj = result[i];
					obj.types = "column";
					result[i] = obj;
					
					topview.push(obj);

					var data2 = result[i];
					for(var j in data2){
						var picType = 'column';
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
				news_data.topview = topview;
			} 
		}

		callback(null, redisCluster, mysql_connection, news_data);
	});
}

function getRelate(redisCluster, mysql_connection, news_data, callback) {

	var query = " SELECT news_id2 as id, ss_news.news_special_id, ss_ns.name as news_special_name, ss_news.tournament_id, ss_news.sport_id, ss_news.icon_pic, ";
		query += " icon_vdo, headline, ss_news.title, ss_news.countview, ss_news.share, ";
		query += " DATE_FORMAT(ss_news.create_date, '%Y-%m-%d %H:%i') as create_date, ";
		query += "DATE_FORMAT(ss_news.lastupdate_date, '%Y-%m-%d %H:%i') as lastupdate_date,";
		query += "ss_picture.folder, ss_picture.file_name, ss_picture.ref_type as picture_type, ";
		query += " ss_news.redirect_url, ss_news.order_by, ss_highlight_news_mapping.types, ";
		query += " ss_tournament.tournament_name_th, ss_tournament.tournament_name_en, ss_tournament.url as tournament_url, ss_tournament.dimension as tournament_dimension, ss_tournament.domain as domain, ";
		query += " ss_sport.sport_name_th, ss_sport.sport_name_en, ss_sport.url as sport_url, ss_sport.dimension as sport_dimension ";
		query += " FROM ss_news LEFT JOIN `ss_picture` ON `ss_news`.`news_id2` = `ss_picture`.`ref_id` ";
		query += " AND (`ss_picture`.`ref_type` = 1 AND `ss_picture`.default = 1) ";
		query += " LEFT JOIN ss_tournament ON ss_news.tournament_id = ss_tournament.tournament_id ";
		query += " LEFT JOIN ss_sport ON ss_news.sport_id = ss_sport.sport_id ";
		query += " LEFT JOIN ss_highlight_news_mapping ON ss_news.news_id2 = ss_highlight_news_mapping.news_id ";
		query += " LEFT JOIN ss_news_special ss_ns ON ss_news.news_special_id = ss_ns.news_special_id ";
		query += " WHERE ss_news.sport_id = 1 AND ss_news.lastupdate_date >= DATE_SUB(CURRENT_DATE, INTERVAL 7 DAY) AND ss_news.lastupdate_date <= CURRENT_DATE AND ss_news.status=1 AND ss_news.approve=1 AND ss_news.lang='th' ";
		query += " ORDER BY `ss_news`.`countview` DESC, `ss_news`.`lastupdate_date` DESC LIMIT 5 "; 

	mysql_connection.query({
		sql : query, 
		timeout : 2000, //2 Sec.
	}, function(error, result) {

		if (error) {
			log.error( "[500] getListTopview7Days Service: [getRelate]: " + error.stack );
			news_data.topview = [];
		} else {

			if( !utils.isEmptyObject(result) && result.length > 0 ) {
				
				for(var i=0; i<result.length; i++) {
					var obj = result[i];
					obj.types = "news";			
					result[i] = obj;

					var data2 = result[i];
					for(var j in data2){
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
				news_data.topview = result;
			} else {
				news_data.topview = [];
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
	            redisCluster = null
	        }

			log.error( "[500] getListTopview7Days Service: [prepareWaterfall]: " + err.stack );
			utils.printJSON(res, utils.getJSONObject(500, err, null));
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
				            redisCluster = null
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
				utils.printJSON(res, utils.getJSONObject(500, err.stack, null));
			}else{
				////////// reply  //////////
				if(reply == true){
					////////// clear cache  //////////
					if(clear_cache == true) {
						redisCluster.del( key, function(err) {
							
							if (redisCluster != null) {
				                redisCluster.disconnect();
				                redisCluster = null;
				            }
						});

						utils.printJSON(res, utils.getJSONObject(200, "Delete : " + key, null));
					}else{
						redisCluster.get( key, function (error, reply) {
							if(error) {
								log.error( "[500] getListTopview7Days Service: [RedisCluster.get]: " + error.stack );
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
	
	var param = {};

	param.key = cache_key;
	param.cache = false;	

	getDataFromRedisCluster(res, param);
});

router.get('/:clear_cache', function(req, res, next) {
	
	var param = {};
	var clear_cache = req.params.clear_cache;
		
	param.key = cache_key;
		
	if(clear_cache == "clear"){
		param.cache = true;	
	}else{
		param.cache = false;
	}

	getDataFromRedisCluster(res, param); 
});


module.exports = router;