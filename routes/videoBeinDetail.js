var express = require('express');
var config = require('../config/index')
var utils = require('../utils/index');
var log = require('../logging/index');
var async = require("async");
var router = express.Router();
var redis_key = config.getKeyType() + config.getKeyPrefix() + config.getKeyProjectName() + 'detail-video-bein-getDetail-';
var cache_timeout = 60; // 1 minute
var request = require('request');


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

function getDetailFromPhp(mysql_connection, param, key, redisCluster, callback) {
    
    var id = param.video_id;
    
    request('http://sstv.siamsport.co.th/rss/getdetail_bein.php?id='+id, function(error, response, body) {
        if (!error && response.statusCode == 200) {

            var objectBody = {};

            objectBody = JSON.parse(body);
            callback(null, mysql_connection, param, objectBody, key, redisCluster);
        } else {
            objectBody = {};
            callback(501, 'No data.');
        }
    });
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

            log.error("[500] videoBeinDetail Service[getDataFromMySQL]: " + connectError.stack);
            utils.printJSON(res, utils.getJSONObject(500, connectError.stack, null));
        } else {
            async.waterfall([
                async.apply(getDetailFromPhp, mysql_connection, param, key, redisCluster),
                setData2Redis,
            ], function(error, result) {

                mysql_connection.end();

                if (error) {
                    if (error == 200) {
                        var output = [];
                        output[0] = result;
                        utils.printJSON(res, result);
                    } else {
                        utils.printJSON(res, result);
                    }
                } else {
                    var output = [];
                    output[0] = result;
                    utils.printJSON(res, result);
                }
            });
        }

    });
}

function getDataFromRedis(res, param) {
    var key = redis_key + param.video_id;
    redisCluster = config.getRedisCluster();
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
                                log.error("[500] videoBeinDetail Service[redisCluster.get]: " + error.stack);
                                getDataFromMySQL(res, redisCluster, param, key);
                            } else {
                                if (reply != "" && reply != undefined) {

                                    if (redisCluster != null) {
                                        redisCluster.disconnect();
                                        redisCluster = null;
                                    }

                                    utils.printJSON(res, JSON.parse(reply));
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

router.get('/:video_id', function(req, res, next) {
    var param = {};
    param.video_id = req.params.video_id;
    if (req.params.video_id != "") {
        getDataFromRedis(res, param);
    } else {
        utils.printJSON(res, utils.getJSONObject(501, "Invalid parameter.", null));
    }
});


router.get('/:video_id/:clear_cache', function(req, res, next) {
    var param = {};
    param.video_id = req.params.video_id;

    if (req.params.clear_cache == 'true') {
        param.clear_cache = true;
    } else {
        param.clear_cache = false;
    }

    getDataFromRedis(res, param);
});



module.exports = router;
