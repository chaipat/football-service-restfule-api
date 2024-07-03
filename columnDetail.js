// *** Create 22/12/2016. ta ***

var express = require('express');
var config = require('../config/index')
var utils = require('../utils/index');
var log = require('../logging/index');
var async = require("async");

var router = express.Router();
// var redis_key = config.getKeyPrefix() + config.getKeyProjectName() + 'detail-column-getDetail-' + column_id;
var redis_key = config.getKeyType() + config.getKeyPrefix() + config.getKeyProjectName() + 'detail-column-getDetail-' ;
var cache_timeout = 60; // 1 minute

function setData2Redis(mysql_connection, param, data, key, callback) {
    var value = JSON.stringify(data);

    if (redisCluster != null) {
        redisCluster.set(key, value);
        redisCluster.expire(key, cache_timeout);
    }

    callback(null, data);
}

function getDetail(mysql_connection, param, key, callback) {
	var query_data = param.column_id;

	var query_string = " SELECT a.`column_id`, a.`column_id2`, a.`match_id`, a.`profile_id`, a.`sport_id`, "; 
    query_string += " a.`tournament_id`, a.`micro_id`, a.`columnist_id`, a.`icon_pic`, a.`icon_vdo`, ";
    query_string += " a.`lang`, a.`title`, a.`description`, a.`detail`, a.`embed_script`, a.`keyword`, ";
    query_string += " a.`shorturl`, a.`redirect_url`, a.`can_comment`, a.`start_date`, a.`expire_date`, ";
    query_string += " a.`rate18_flag`, a.`countview`, a.`share_fb`, a.`comment_fb`, a.`like_fb`, ";
    query_string += " a.`create_date`, a.`lastupdate_date`, picture.`folder`, picture.`file_name` ";
    query_string += " FROM `ss_column` AS a LEFT JOIN `ss_picture` AS picture ";
    query_string += " ON a.`column_id2` = picture.`ref_id` and picture.ref_type = 2 and picture.default = 1 ";
    query_string += " WHERE a.`column_id2` = ? AND a.`status` = 1 AND a.`lang` = 'th' ";

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
					callback(null, mysql_connection, param, result, key);
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
            log.error("[500] detail/column/getDetail Service[getDataFromMySQL]: " + connectError.stack);
            utils.printJSON(res, utils.getJSONObject(500, connectError.stack, null));
    	} else {
    		async.waterfall([
    			async.apply(getDetail, mysql_connection, param, key),
                setData2Redis,
    			], function(error, result) {
    				
    				mysql_connection.end();

    				if (redisCluster != null) {
    					redisCluster.disconnect();
    					redisCluster = null;
    				}

    				if (error) {
    					if (error == 200) {
    						utils.printJSON(res, utils.getJSONObject(200, "Success", result));
    					} else {
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
    var key = redis_key + param.column_id;
    redisCluster = config.getRedisCluster();
    redisCluster.once('connect', function() {
        redisCluster.exists(key, function(err, reply) {
            if (err) {
                utils.printJSON(res, utils.getJSONObject(500, err.stack, null));
            } else {

                if (reply == true) {
                    if (param.clear_cache == true) {
                        redisCluster.del(key);
                        utils.printJSON(res, utils.getJSONObject(200, "Delete: " + key, null));
                    } else {
                        redisCluster.get(key, function(error, reply) {
                            if (error) {
                                log.error("[500] detail/news/getDetail Service[redisCluster.get]: " + error.stack);
                                getDataFromMySQL(res, redisCluster, param, key);
                            } else {
                                if (reply != "" && reply != undefined) {
                                    redisCluster.disconnect();
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

router.get('/:column_id', function(req, res, next) {
    var param = {};
    param.column_id = req.params.column_id;
    param.clear_cache = false;
    if (req.params.column_id != "") {
        getDataFromRedis(res, param);
    } else {
        utils.printJSON(res, utils.getJSONObject(501, "Invalid parameter.", null));
    }
});

router.get('/:column_id/:clear_cache', function(req, res, next) {
    var param = {};
    param.column_id = req.params.column_id;

    if (req.params.clear_cache == 'true') {
        param.clear_cache = true;
    } else {
        param.clear_cache = false;
    }

    getDataFromRedis(res, param);
});

module.exports = router;
