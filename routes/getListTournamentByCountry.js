// *** Create 22/12/2016. ta ***

var express = require('express');
var config = require('../config/index')
var utils = require('../utils/index');
var log = require('../logging/index');
var async = require("async");
var router = express.Router();
var redis_key = config.getKeyType() + config.getKeyPrefix() + config.getKeyProjectName() + 'list-tournament-country-' ;
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

function getDetail(mysql_connection, param, key, redisCluster, callback) {
	
    var query_data = param.country_id;
	var query_string = "SELECT t.`tournament_id`, t.`livescore_id`, t.`sport_id`, t.`country_id`, c.name, t.`tournament_name_th`, t.`tournament_name_en`, t.`url`, t.`dimension`, t.domain as domain, t.`short_name`, t.`color`, t.`domain`, t.`all_sport`, t.`is_national`, t.`is_cup`, t.`orderby`, t.`status`, DATE_FORMAT(t.`create_date`, '%d-%m-%Y %H:%m') AS create_date, DATE_FORMAT(t.`lastupdate_date`, '%d-%m-%Y %H:%m') as lastupdate_date ";
    query_string += " FROM `ss_tournament` t LEFT JOIN ss_country c ON t.country_id = c.country_id ";
    query_string += " WHERE t.country_id = ? AND status = 1 ";

	try{
		mysql_connection.query({
			sql: query_string,
			timeout: 2000,
			values: query_data
		}, function(error, result) {

			if (error) {
				log.error("[500] list/tournament/country/getDetail Service[getDetail]: " + error.stack);
				callback(500, error.stack);
			} else {
				if (!utils.isEmptyObject(result) && result.length > 0) {
					callback(null, mysql_connection, param, result, key, redisCluster);
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
    mysql_connection.connect(function(connectError) {

    	if (connectError) {
    		mysql_connection.end();
            
            if (redisCluster != null) {
                redisCluster.disconnect();
                redisCluster = null;
            }

            log.error("[500] list/tournament/country/getDetail Service[getDataFromMySQL]: " + connectError.stack);
            utils.printJSON(res, utils.getJSONObject(500, connectError.stack, null));
    	} else {
    		async.waterfall([
    			async.apply(getDetail, mysql_connection, param, key, redisCluster),
                setData2Redis,
			], function(error, result) {
				
				mysql_connection.end();

				if (error) {
					if (error == 200) {
						utils.printJSON(res, utils.getJSONObject(200, "Success", result));
					} else {

                        if (redisCluster != null) {
                            redisCluster.disconnect();
                            redisCluster = null;
                        }
						utils.printJSON(res, utils.getJSONObject(error, result, null));
					}
				} else {
					utils.printJSON(res, utils.getJSONObject(200, "Success", result));
				}
			});
    	}
    });
}

function getDataFromRedis(res, param) {
    
    var key = redis_key + param.country_id;
    var redisCluster = config.getRedisCluster();
    redisCluster.once('connect', function() {
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
                                log.error("[500] list/tournament/country/getDetail Service[redisCluster.get]: " + error.stack);
                                getDataFromMySQL(res, redisCluster, param, key);
                            } else {
                                if (reply != "" && reply != undefined) {
                                    
                                    if (redisCluster != null) {
                                        redisCluster.disconnect();
                                        redisCluster = null;
                                    }

                                    utils.printJSON(res, utils.getJSONObject(200, "Redis", JSON.parse(reply)));
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
    });
}

/* GET users listing. */
router.get('/', function(req, res, next) {
    utils.printJSON(res, utils.getJSONObject(502, "Missing parameter.", null));
});

router.get('/:country_id', function(req, res, next) {
    var param = {};

    var id = parseInt(req.params.country_id);

    param.country_id = req.params.country_id;
    param.clear_cache = false;
    if (req.params.country_id != "") {
        getDataFromRedis(res, param);
    } else {
        utils.printJSON(res, utils.getJSONObject(501, "Invalid parameter.", null));
    }
});

router.get('/:country_id/:clear_cache', function(req, res, next) {
    var param = {};
    param.country_id = req.params.country_id;

    if (req.params.clear_cache == 'clear') {
        param.clear_cache = true;
    } else {
        param.clear_cache = false;
    }
    getDataFromRedis(res, param);
});

module.exports = router;