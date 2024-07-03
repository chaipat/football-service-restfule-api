// *** Create 22/12/2016. ta ***

var express = require('express');
var config = require('../config/index')
var utils = require('../utils/index');
var log = require('../logging/index');
var async = require("async");
var router = express.Router();
var redis_key = config.getKeyType() + config.getKeyPrefix() + config.getKeyProjectName() + 'list-90min' ;
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

function getList(mysql_connection, param, key, redisCluster, callback) {

    var query_string = " SELECT `thid` AS id, `order`, `title`, `image_url`, `native_app_url`, \
     `article_url`, `author_name`, `categories`, `tags`, `embed_code`\
      FROM `ss_third_90min` \
      WHERE `order` <> 99 ORDER BY `order` ASC ";

    try{
        mysql_connection.query({
            sql: query_string,
            timeout: 2000,
        }, function(error, result) {

            if (error) {
                log.error("[500] list/90Min/getList Service[getList]: " + error.stack);
                callback(500, error.stack);
            } else {
                if (!utils.isEmptyObject(result) && result.length > 0) {
                    callback(null, mysql_connection, param, result, key, redisCluster);
                } else {
                    callback(501, "Data not found.")
                }
            }
        });
    } catch (err){
        callback(500, err.stack);
    }
}

function getDataFromMySQL(res, redisCluster, param, key) {
    var mysql_connection = config.getMySQLConnection();

    mysql_connection.connect(function(connectError) {

        if (connectError) {
            mysql_connection.end();

            if (redisCluster != null) {
                redisCluster.disconnect();
                redisCluster = null;
            }

            log.error("[500] list/90Min/getList Service[getDataFromMySQL]: " + connectError.stack);
            utils.printJSON(res, utils.getJSONObject(500, connectError.stack, null));
        } else {
            async.waterfall([
                async.apply(getList, mysql_connection, param, key, redisCluster),
                setData2Redis,
                ], function(error, result) {
                    
                    mysql_connection.end();

                    if (error) {
                        if (error == 200) {
                            var output = [];
                            output[0] = result;
                            utils.printJSON(res, utils.getJSONObject(200, "Success", output));
                        } else {
                            utils.printJSON(res, utils.getJSONObject(error, output, null));
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
                                log.error("[500] list/90Min/getList Service[redisCluster.get]: " + error.stack);
                                getDataFromMySQL(res, redisCluster, param, key);
                            } else {
                                if (reply != "" && reply != undefined) {
                                    
                                    if (redisCluster != null) {
                                        redisCluster.disconnect();
                                        redisCluster = null;
                                    }

                                    utils.printJSON(res, utils.getJSONObject(200, "Redis", JSON.parse(reply) ));
                                } else {
                                    getDataFromMySQL(res, redisCluster, param, key);
                                    // redisCluster.disconnect();
                                    // utils.printJSON(res, utils.getJSONObject(200, "Redis", JSON.parse(reply) ));
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
