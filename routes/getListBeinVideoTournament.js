// *** Create 26/12/2016. ta ***

var express = require('express');
var config = require('../config/index')
var utils = require('../utils/index');
var log = require('../logging/index');
var async = require("async");
var router = express.Router();
var redis_key = config.getKeyType() + config.getKeyPrefix() + config.getKeyProjectName() + 'list-video-bein-tournament-';
var cache_timeout = 60; // 1 minute
var request = require('request');


function setData2Redis(mysql_connection, param, key, data, redisCluster, callback) {
	if (redisCluster != null) {
        redisCluster.set(key, JSON.stringify(data), function(err, reply) {
            
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

function getListFromPhp(mysql_connection, param, key, redisCluster, callback) {
    var tournament_id = param.video_tournament_id;
    var page = param.page;

    request('http://sstv.siamsport.co.th/rss/list_bein.php?page=' + page + '&idtss=' + tournament_id, function(error, response, body) {
        if (!error && response.statusCode == 200) {

            var objectBody = {};
            var temp = {};

            objectBody = JSON.parse(body);

            callback(null, mysql_connection, param, key, objectBody, redisCluster);
        } else {
            objectBody = {};
            callback(501, 'No data.');
        }
    });
}

function getDataFromMySQL(res, redisCluster, param, key) {
    
    var mysql_connection = config.getMySQLConnection();
    mysql_connection.connect(function(connectionError) {

        if (connectionError) {
            mysql_connection.end();

            if (redisCluster != null) {
                redisCluster.disconnect();
                redisCluster = null;
            }

            log.error("[500] getListBeinVideoTournament Service[getDataFromMySQL]: " + connectionError.stack);
            utils.printJSON(res, utils.getJSONObject(500, connectionError.stack, null));
        } else {
            async.waterfall([
                async.apply(getListFromPhp, mysql_connection, param, key, redisCluster),
                setData2Redis,
            ], function(error, result) {

                mysql_connection.end();

                if (error) {
                    if (error == 200) {
                        utils.printJSON(res, result);
                    } else {

                        if (redisCluster != null) {
                            redisCluster.disconnect();
                            redisCluster = null;
                        }
                        utils.printJSON(res, utils.getJSONObject(error, result));
                    }
                } else {
                    utils.printJSON(res, result);
                }
            });
        }
    });
}

function getDataFromRedis(res, param) {

    var key = redis_key + param.video_tournament_id + "-" + param.limit + "-" + param.page;
    var redisCluster = config.getRedisCluster();
    redisCluster.once('connect', function() {
        redisCluster.exists(key, function(error, reply) {

            if (error) {

                if (redisCluster != null) {
                    redisCluster.disconnect();
                    redisCluster = null;
                }
                utils.printJSON(res, utils.getJSONObject(500, error.stack, null));
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
                        
                        redisCluster.get(key, function(err, reply) {
                            if (err) {
                                log.error("[500] getListBeinVideoTournament Service[redisCluster.get]: " + err.stack);
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

router.get('/:video_tournament_id/:item/:page', function(req, res, next) {
    var param = {};
    param.video_tournament_id = req.params.video_tournament_id;
    param.limit = req.params.item;
    param.page = req.params.page;
    param.clear_cache = false;

    getDataFromRedis(res, param);

});

router.get('/:video_tournament_id/:item/:page/:clear_cache', function(req, res, next) {
    var param = {};
    param.video_tournament_id = req.params.video_tournament_id;
    param.limit = req.params.item;
    param.page = req.params.page;

    if (req.params.clear_cache == 'true') {
    	param.clear_cache = true;
    } else {
    	param.clear_cache = false;	
    }

    getDataFromRedis(res, param);

});


module.exports = router;
