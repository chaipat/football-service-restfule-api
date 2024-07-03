// *** Create 22/12/2016. ta ***

var express = require('express');
var config = require('../config/index')
var utils = require('../utils/index');
var log = require('../logging/index');
var async = require("async");
var router = express.Router();
var redis_key = config.getKeyType() + config.getKeyPrefix() + config.getKeyProjectName() + 'list-column-all-columnist-name' ;
var cache_timeout = 60; // 1 min.

function setData2Redis(mysql_connection, data, key, redisCluster, callback) {
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

        callback(null, data)
    } else {
        callback(null, data);    
    }
}

function getDetail(mysql_connection, key, redisCluster, callback) {

    var query_string = "SELECT DISTINCT cl.columnist_id, cln.name, cln.alias, cln.avatar ";
    query_string += " FROM ss_column cl ";
    query_string += " LEFT JOIN ss_columnist cln ON cl.columnist_id = cln.columnist_id ";
    query_string += " WHERE cl.status = 1 AND cl.approve = 1 ";
    query_string += " ORDER BY cl.lastupdate_date DESC LIMIT 5 ";

	try{
		mysql_connection.query({
			sql: query_string,
			timeout: 2000,
		}, function(error, result) {

			if (error) {
				log.error("[500] list/column/getlist/all/columnist/getListAllColumnistName Service[getDetail]: " + error.stack);
				callback(500, error.stack);
			} else {
				if (!utils.isEmptyObject(result) && result.length > 0) {
					callback(null, mysql_connection, result, key, redisCluster);
				} else {
                    callback(501, "Data not found.")
                }
			}
		});
	} catch (err){
		callback(500, err.stack);
	}
}

function getDataFromMySQL(res, redisCluster, key) {
    var mysql_connection = config.getMySQLConnection();

    mysql_connection.connect(function(connectError) {

    	if (connectError) {
    		mysql_connection.end();

            if (redisCluster != null) {
                redisCluster.disconnect();
                redisCluster = null;
            }

            log.error("[500] list/column/getlist/all/columnist/getListAllColumnistName Service[getDataFromMySQL]: " + connectError.stack);
            utils.printJSON(res, utils.getJSONObject(500, connectError.stack, null));
    	} else {
    		async.waterfall([
    			async.apply(getDetail, mysql_connection, key, redisCluster),
                setData2Redis
    			], function(error, result) {
    				
    				mysql_connection.end();

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
    
    var key = redis_key;
    var redisCluster = config.getRedisCluster();
    redisCluster.once('connect', function() {
        redisCluster.exists(key, function(err, reply) {
            if (err) {
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
                                log.error("[500] list/column/getlist/all/columnist/getListAllColumnistName Service[redisCluster.get]: " + error.stack);
                                getDataFromMySQL(res, redisCluster, key);
                            } else {
                                if (reply != "" && reply != undefined) {
             
                                    if (redisCluster != null) {
                                        redisCluster.disconnect();
                                        redisCluster = null;
                                    }

                                    utils.printJSON(res, utils.getJSONObject(200, "Redis", JSON.parse(reply)));
                                } else {
                                    getDataFromMySQL(res, redisCluster, key);                
                                }
                            }
                        });
                    }
                } else {
                    getDataFromMySQL(res, redisCluster, key);
                }
            }
        });
    });
}

router.get('/', function(req, res, next) {
    var param = {};
    param.clear_cache = false;

    getDataFromRedis(res, param);
});

router.get('/:clear_cache', function(req, res, next) {
    var param = {};

     if (req.params.clear_cache == 'true') {
        param.clear_cache = true;
    } else {
        param.clear_cache = false;  
    }

    getDataFromRedis(res, param);
});

module.exports = router;
