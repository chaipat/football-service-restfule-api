var express = require('express');
var config = require('../config/index');
var utils = require('../utils/index');
var log = require('../logging/index');
var router = express.Router();
// var key = config.getKeyPrefix();

function clearCache( res, param ) {
	var key = config.getKeyType() + config.getKeyPrefix() + config.getKeyProjectName();

	var redis_key = "";
	
	if (param.web_cache == true) {
		redis_key = param.web_cache_prefix;
	} else {
		redis_key = key;
	}

	var redisCluster = config.getRedisCluster();
	redisCluster.once('connect', function() {

		try {
			redisCluster.del( redis_key );

			if( redisCluster != null ) {
				redisCluster.disconnect();
				redisCluster = null;
			}
			utils.printJSON(res, utils.getJSONObject(200, "Delete success key name is. " + redis_key, null));

		} catch(err) {
			utils.printJSON(res, utils.getJSONObject(500, err, null));
		}
	});

	redisCluster.once('error', function(err) {

		try {
			if( redisCluster != null ) {
				redisCluster.disconnect();
				redisCluster = null;
			}
			utils.printJSON(res, utils.getJSONObject(500, err, null));

		} catch(error) {
			utils.printJSON(res, utils.getJSONObject(500, error, null));
		}
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