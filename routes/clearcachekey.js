var express = require('express');
var config = require('../config/index');
var utils = require('../utils/index');
var log = require('../logging/index');
var router = express.Router();
var Redis = require('ioredis');
// var key = config.getKeyPrefix();



function clearCache(res, param) {
    var key = config.getKeyType() + config.getKeyPrefix() + config.getKeyProjectName() + ".*";
    var key_web = param.web_cache_prefix;

    var redis_key = "";

    if (param.web_cache == true) {
        redis_key = key_web;
    } else {
        redis_key = key;
    }

    var redisCluster = config.getRedisCluster();

    redisCluster.once('connect', function() {

        redisCluster.exists(redis_key, function(err, reply) {

            if (err) {

                redisCluster.disconnect();
                redisCluster = null;
                log.error( "[500] ClearCacheKey Service[clearCache]: " + err.stack );
                utils.printJSON(res, utils.getJSONObject(500, err.stack, null));

            } else {

                if(reply == 1) {

                    redisCluster.del( redis_key, function(error, reply) {

                        if(error) {
                            utils.printJSON(res, utils.getJSONObject(500, error.stack, null));
                        } else {
                            utils.printJSON(res, utils.getJSONObject(200, "Success.", null));
                        }
                    });

                } else {
                    utils.printJSON(res, utils.getJSONObject(507, "Data not found.", null));
                }
            }
        });
    });

    redisCluster.once('error', function(err) {

        if(redisCluster != null) {
            redisCluster.disconnect();
            redisCluster = null;    
        }
        
        log.error( "[500] GetMatch Service[getDataFromRedis]: " + err.stack );
        utils.printJSON(res, utils.getJSONObject(500, err.stack, null));
    });
}

router.get('/', function(req, res, next) {
    var param = {};
    var web_cache = req.query.title;

    if (web_cache != "" && web_cache != undefined) {
        param.web_cache = true;
        param.web_cache_prefix = web_cache;
    } else {
        param.web_cache = false;
    }

    clearCache(res, param);
});



module.exports = router;
