// *** Create 22/12/2016. ta ***

var express = require('express');
var config = require('../config/index')
var utils = require('../utils/index');
var log = require('../logging/index');
var async = require("async");
var router = express.Router();
var redis_key = config.getKeyType() + config.getKeyPrefix() + config.getKeyProjectName() + 'detail-column-getDetail-' ;
var cache_timeout = 60; // 1 minute
var static_image_url = config.getStaticImageURL();

function setData2Redis(mysql_connection, param, data, key, redisCluster, callback) {
    var value = JSON.stringify(data);

    if (redisCluster != null) {
        redisCluster.set(key, value, function(err, reply) {

            if (!err) {
                redisCluster.expire(key, cache_timeout);    
            }
            
            if (redisCluster != null) {
                redisCluster.disconnect();
                redisCluster = null;
            }
        });
        
        callback(null, data);
    } else {
        callback(null, data);    
    }
    
}

function getCreditName(mysql_connection, param, jsonData, key, redisCluster, callback) {
  
    var query = "SELECT credit_name FROM ss_credit WHERE credit_id IN (" + jsonData.credit_id + ") ";
    mysql_connection.query({
        sql: query,
        timeout: 2000,
        
    }, function(error, result) {

        if (error) {
            log.error("[500] detail/column/getDetail Service[getCreditName]: " + error.stack);
            callback(500, error.stack);
            jsonData.credit_name = [];
        } else {

            var arrData = [];
            if (!utils.isEmptyObject(result) && result.length > 0) {

                for (var i = 0; i < result.length; i++) {
                    arrData.push(result[i].credit_name);
                }

                jsonData.credit_name = arrData;
                callback(null, mysql_connection, param, jsonData, key, redisCluster);
            } else {
                jsonData.credit_name = [];
                callback(null, mysql_connection, param, jsonData, key, redisCluster);
            }
        }
    });
}

function getTag(mysql_connection, param, jsonData, key, redisCluster, callback) {
    var id = jsonData["column_id2"];
    var id_for_query = [];

    id_for_query.push(id);

    var query = "SELECT `ss_tag_pair_column`.tag_id, tag_text "; 
    query = query + "FROM `ss_tag_pair_column` ";
    query = query + "LEFT JOIN `ss_tag` on `ss_tag`.tag_id = `ss_tag_pair_column`.tag_id ";
    query = query + "WHERE `ss_tag_pair_column`.ref_id = ? " ;      
    query = query + "ORDER BY `ss_tag_pair_column`.`create_date` DESC";

    mysql_connection.query({
        sql: query,
        timeout: 2000,
        values: id_for_query
    }, function (error, result) {

        if (error) {
            log.error("[500] detail/news/getDetail Service[getTag]:" + error.stack);
            callback(500, error.stack);
            jsonData.tag = [];
        } else {
            if (!utils.isEmptyObject(result) && result.length > 0) {
                jsonData.tag = result;
            } else {
                jsonData.tag = [];
            }
            callback(null, mysql_connection, param, jsonData, key, redisCluster);
        }
    });
}

function getDetail(mysql_connection, param, key, redisCluster, callback) {
	var query_data = param.column_id;

	var query_string = " SELECT a.`column_id`, a.`column_id2`, a.`match_id`, a.`profile_id`, a.`sport_id`, sport.sport_name_th, sport.sport_name_en, a.rate18_flag, "; 
    query_string += " a.`tournament_id`, a.credit_id, tournament.tournament_name_th, tournament.tournament_name_en, tournament.url as tournament_url, tournament.dimension as tournament_dimension, ";
    query_string += " tournament.domain as domain, ";
    query_string += " sport.url as sport_url, sport.dimension as sport_dimension, ";
    query_string += " a.`micro_id`, a.`columnist_id`, columnist.name as columnist_name, columnist.alias as columnist_alias, columnist.avatar as columnist_avatar, a.`icon_pic`, a.`icon_vdo`, ";
    query_string += " a.`lang`, a.`title`, a.`description`, a.`detail`, a.`keyword`, ";
    query_string += " a.`shorturl`, a.`redirect_url`, a.`can_comment`, ";
    query_string += " a.`rate18_flag`, a.`countview`, a.`share`,  ";
    query_string += " DATE_FORMAT(a.`create_date`, '%d-%m-%Y %H:%i') AS create_date, ";
    query_string += " DATE_FORMAT(a.`lastupdate_date`, '%d-%m-%Y %H:%i') AS lastupdate_date, ";
    query_string += " DATE_FORMAT(a.approve_date, '%d-%m-%Y %H:%i') AS approve_date, ";
    query_string += " picture.`folder`, picture.`file_name` ";
    query_string += " FROM `ss_column` AS a LEFT JOIN `ss_picture` AS picture ";
    query_string += " ON a.`column_id2` = picture.`ref_id` and picture.ref_type = 2 and picture.default = 1 ";
    query_string += " LEFT JOIN ss_sport sport ON a.sport_id = sport.sport_id ";
    query_string += " LEFT JOIN ss_tournament tournament ON a.tournament_id = tournament.tournament_id ";
    query_string += " LEFT JOIN ss_columnist as columnist ON a.columnist_id = columnist.columnist_id ";
    if (param.preview) {
        query_string += " WHERE a.`column_id2` = ? AND a.`lang` = 'th' ";
    } else {
        query_string += " WHERE a.`column_id2` = ? AND a.`status` = 1 AND a.`lang` = 'th' ";
    }

	try{
		mysql_connection.query({
			sql: query_string,
			timeout: 2000,
			values: query_data
		}, function(error, result) {

			if (error) {
				log.error("[500] detail/column/getDetail Service[getDetail]: " + error.stack);
				callback(500, error.stack);
			} else {
				if (!utils.isEmptyObject(result) && result.length > 0) {
                    var data = result[0];

                    if (data.credit_id != null || data.credit_id != undefined) {
                        var arr = data.credit_id.replace('[', '').replace(']', '');
                        data.credit_id = arr;
                    }

                    if (data.detail != null){ 
                        data.detail = data.detail.replace(/\/uploads/g, static_image_url);    
                    }

                    var data2 = result;
                    for(var i in data2){
                        var picType = 'column';
                          var picture_size = {
                            'fullsize': picType + '/' + data2[i]['folder'] + '/' + data2[i]['file_name'],
                            'size128': 'size128/' + data2[i]['folder'] + '/' + data2[i]['file_name'],
                            'size224': 'size224/' + data2[i]['folder'] + '/' + data2[i]['file_name'],
                            'size304': 'size304/' + data2[i]['folder'] + '/' + data2[i]['file_name'],
                            'size640': 'size640/' + data2[i]['folder'] + '/' + data2[i]['file_name']
                          };
                          data.picture_size = picture_size;
                    }
					callback(null, mysql_connection, param, data, key, redisCluster);
				} else {
                    callback(501, "Data not found.");
                }
			}
		});
	} catch (err){
		callback(500, err.stack);
	}
}

function getDataFromMySQL(res, redisCluster, param, key) {
	var data = {};
    var mysql_connection = config.getMySQLConnection();
    var responseStatus = "Success"

    mysql_connection.connect(function(connectError) {

    	if (connectError) {
    		mysql_connection.end();
            
            if (redisCluster != null) {
                redisCluster.disconnect();
                redisCluster = null;
            }

            log.error("[500] detail/column/getDetail Service[getDataFromMySQL]: " + connectError.stack);
            utils.printJSON(res, utils.getJSONObject(500, connectError.stack, null));
    	} else {

            if (param.preview) {
                redisCluster.disconnect();
                redisCluster = null;
                responseStatus = 'Preview';
            }

    		async.waterfall([
    			async.apply(getDetail, mysql_connection, param, key, redisCluster),
                getCreditName,
                getTag,
                setData2Redis,
    			], function(error, result) {
    				
    				mysql_connection.end();

    				if (error) {
                        var output = [];
                        output[0] = result;
    					if (error == 200) {
    						utils.printJSON(res, utils.getJSONObject(200, responseStatus, output));
    					} else {
    						utils.printJSON(res, utils.getJSONObject(error, output, null));
    					}
    				} else {
                        var output = [];
                        output[0] = result;
    					utils.printJSON(res, utils.getJSONObject(200, responseStatus, output));
    				}
				});
    	}
    });
}

function getDataFromRedis(res, param) {
    var key = redis_key + param.column_id;
    redisCluster = config.getRedisCluster();
    redisCluster.once('connect', function() {


        if ( param.preview) {
            
            getDataFromMySQL(res, redisCluster, param, key);

        } else {

            redisCluster.exists(key, function(err, reply) {
                if (err) {
                    
                    if (redisCluster != null) {
                        redisCluster.disconnect();
                        redisCluster = null;
                    }
                    utils.printJSON(res, utils.getJSONObject(500, err.stack, null));
                } else {
    
                    if (reply == true) {
                        if (param.clear_cache == true) {
                            redisCluster.del(key, function(err) {
                                
                                if (redisCluster != null) {
                                    redisCluster.disconnect();
                                    redisCluster = null;
                                }
    
                            });
    
                            utils.printJSON(res, utils.getJSONObject(200, "Delete: " + key, null));
                        } else {
                            redisCluster.get(key, function(error, reply) {
                                if (error) {
                                    log.error("[500] detail/news/getDetail Service[redisCluster.get]: " + error.stack);
                                    getDataFromMySQL(res, redisCluster, param, key);
                                } else {
                                    if (reply != "" && reply != undefined) {
                                        var json = [];
                                        json[0] = JSON.parse(reply);
                                        
                                        if (redisCluster != null) {
                                            redisCluster.disconnect();
                                            redisCluster = null;
                                        }
    
                                        utils.printJSON(res, utils.getJSONObject(200, "Redis", json));
                                    } else {
                                        getDataFromMySQL(res, redisCluster, param, key);
                                    }
                                }
                            });
                        }
                    } else {
                        getDataFromMySQL(res, redisCluster, param, key);
                    }
                }
            });

        } // end preview
 
    });
}

/* GET users listing. */
router.get('/', function(req, res, next) {
    utils.printJSON(res, utils.getJSONObject(502, "Missing parameter.", null));
});

router.get('/:column_id/:clear_cache', function(req, res, next) {
    var param = {};
    param.column_id = req.params.column_id;
    param.preview = false;

    if (req.params.clear_cache === 'true') {
        param.clear_cache = true;
    } else if (req.params.clear_cache === 'preview') {
        param.preview = true;
        param.clear_cache = false;
    } else {
        param.clear_cache = false;
    }

    getDataFromRedis(res, param);

});

router.get('/:column_id', function(req, res, next) {
    var param = {};

    var id = parseInt(req.params.column_id);

    param.column_id = req.params.column_id;
    param.clear_cache = false;
    if (req.params.column_id != "") {
        getDataFromRedis(res, param);
    } else {
        utils.printJSON(res, utils.getJSONObject(501, "Invalid parameter.", null));
    }
});

module.exports = router;