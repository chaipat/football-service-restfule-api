var express = require('express');
var config = require('../config/index');
var utils = require('../utils/index');
var log = require('../logging/index');
var async = require("async");
var request = require('request');
var router = express.Router();

var cachePrefix = config.getKeyType() + config.getKeyPrefix() + config.getKeyProjectName();


function setData2Redis(redisCluster, cacheKey, data, callback) {

    var value = JSON.stringify(data);

    if (redisCluster != null) {
        redisCluster.set(cacheKey, value, function(err, reply) {

            if (!err) {
                redisCluster.expire(cacheKey, 60);
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

function getEuropaList(redisCluster, cacheKey, bodyHeadline, headline, callback) {
    request('http://sstv.siamsport.co.th/rss/list_bein.php?page=1&idtss=13',
        function(err, response, body) {
            var objectBody = {};
            var info = JSON.parse(body);

            if (!err && response.statusCode == 200) {

                if (JSON.stringify(info.header) == "{}") {
                    headline.europa = [];
                    bodyHeadline.push(headline);

                    callback(null, redisCluster, cacheKey, bodyHeadline);
                } else {
                    objectBody = info.body;
                    objectBody = objectBody.slice(0, 2);

                    headline.europa = objectBody;
                    bodyHeadline.push(headline);

                    callback(null, redisCluster, cacheKey, bodyHeadline);
                }
            } else {
                headline.europa = [];
                bodyHeadline.push(headline);

                callback(null, redisCluster, cacheKey, bodyHeadline);
            }
        });
}

function getUefaList(redisCluster, cacheKey, bodyHeadline, headline, callback) {
    request('http://sstv.siamsport.co.th/rss/list_bein.php?page=1&idtss=12',
        function(err, response, body) {
            var objectBody = {};
            var info = JSON.parse(body);

            if (!err && response.statusCode == 200) {

                if (JSON.stringify(info.header) == "{}") {
                    headline.uefa = [];

                    callback(null, redisCluster, cacheKey, bodyHeadline, headline);
                } else {
                    objectBody = info.body;
                    objectBody = objectBody.slice(0, 2);

                    headline.uefa = objectBody;
                    callback(null, redisCluster, cacheKey, bodyHeadline, headline);
                }
            } else {
                headline.uefa = [];
                callback(null, redisCluster, cacheKey, bodyHeadline, headline);
            }
        });
}

function getLigue1List(redisCluster, cacheKey, bodyHeadline, headline, callback) {
    request('http://sstv.siamsport.co.th/rss/list_bein.php?page=1&idtss=6',
        function(err, response, body) {
            var objectBody = {};
            var info = JSON.parse(body);

            if (!err && response.statusCode == 200) {

                if (JSON.stringify(info.header) == "{}") {
                    headline.ligue1 = [];

                    callback(null, redisCluster, cacheKey, bodyHeadline, headline);
                } else {
                    objectBody = info.body;
                    objectBody = objectBody.slice(0, 4);

                    headline.ligue1 = objectBody;
                    callback(null, redisCluster, cacheKey, bodyHeadline, headline);
                }
            } else {
                headline.ligue1 = [];
                callback(null, redisCluster, cacheKey, bodyHeadline, headline);
            }
        });
}

function getCalcioList(redisCluster, cacheKey, bodyHeadline, headline, callback) {
    request('http://sstv.siamsport.co.th/rss/list_bein.php?page=1&idtss=3',
        function(err, response, body) {
            var objectBody = {};
            var info = JSON.parse(body);

            if (!err && response.statusCode == 200) {

                if (JSON.stringify(info.header) == "{}") {
                    headline.calcio = [];

                    callback(null, redisCluster, cacheKey, bodyHeadline, headline);
                } else {
                    objectBody = info.body;
                    objectBody = objectBody.slice(0, 4);

                    headline.calcio = objectBody;
                    callback(null, redisCluster, cacheKey, bodyHeadline, headline);
                }
            } else {
                headline.calcio = [];
                callback(null, redisCluster, cacheKey, bodyHeadline, headline);
            }
        });
}

function getLaligaList(redisCluster, cacheKey, bodyHeadline, headline, callback) {
    request('http://sstv.siamsport.co.th/rss/list_bein.php?page=1&idtss=5',
        function(err, response, body) {
            var objectBody = {};
            var info = JSON.parse(body);

            if (!err && response.statusCode == 200) {

                if (JSON.stringify(info.header) == "{}") {
                    headline.laliga = [];

                    callback(null, redisCluster, cacheKey, bodyHeadline, headline);
                } else {
                    objectBody = info.body;
                    objectBody = objectBody.slice(0, 4);

                    headline.laliga = objectBody;
                    callback(null, redisCluster, cacheKey, bodyHeadline, headline);
                }
            } else {
                headline.laliga = [];
                callback(null, redisCluster, cacheKey, bodyHeadline, headline);
            }
        });
}

function getPremierList(redisCluster, cacheKey, bodyHeadline, headline, callback) {
    request('http://sstv.siamsport.co.th/rss/list_bein.php?page=1&idtss=1',
        function(err, response, body) {
            var objectBody = {};
            var info = JSON.parse(body);

            if (!err && response.statusCode == 200) {

                if (JSON.stringify(info.header) == "{}") {
                    headline.premier = [];

                    callback(null, redisCluster, cacheKey, bodyHeadline, headline);
                } else {
                    objectBody = info.body;
                    objectBody = objectBody.slice(0, 8);

                    headline.premier = objectBody;
                    callback(null, redisCluster, cacheKey, bodyHeadline, headline);
                }
            } else {
                headline.premier = [];
                callback(null, redisCluster, cacheKey, bodyHeadline, headline);
            }
        });
}

function getMainList(redisCluster, cacheKey, bodyHeadline, headline, callback) {
    request('http://sstv.siamsport.co.th/rss/list_bein.php?page=1&action=main',
        function(err, response, body) {
            var objectBody = {};
            var info = JSON.parse(body);

            if (!err && response.statusCode == 200) {

                if (JSON.stringify(info.header) == "{}") {
                    headline.main = [];
                    
                    callback(null, redisCluster, cacheKey, bodyHeadline, headline);
                } else {
                    objectBody = info.body;
                    objectBody = objectBody.slice(0, 6);

                    headline.main = objectBody;
                    callback(null, redisCluster, cacheKey, bodyHeadline, headline);
                }
            } else {
                headline.main = [];
                callback(null, redisCluster, cacheKey, bodyHeadline, headline);
            }
        });
}

function getDataFromPhp(res, redisCluster, cacheKey) {
    var bodyHeadline = [];
    var headline = {};

    async.waterfall([
        async.apply(getMainList, redisCluster, cacheKey, bodyHeadline, headline),
        getPremierList,
        getLaligaList,
        getCalcioList,
        getLigue1List,
        getUefaList,
        getEuropaList,
        setData2Redis
    ], function(err, result) {

        if (err) {
            if (err == 200) {
                utils.printJSON(res, utils.getJSONPaginationObject(200, "Success", result, null, null, null, cacheKey));
            } else {

                if (redisCluster != null) {
                    redisCluster.disconnect();
                    redisCluster = null;
                }
                utils.printJSON(res, utils.getJSONObject(err, result, null));
            }
        } else {
            utils.printJSON(res, utils.getJSONPaginationObject(200, "Success", result, null, null, null, cacheKey));
        }
    });
}

function getDataFromRedisCluster(res, clear_cache) {
    var cacheKey = cachePrefix + 'main-bein';
    var clearCache = clear_cache;
    var redisCluster = config.getRedisCluster();

    redisCluster.once('connect', function() {
        redisCluster.exists(cacheKey, function(err, reply) {

            if (err) {
                utils.printJSON(res, utils.getJSONObject(500, err.stack, null));
            } else {
                if (reply == true) {

                    if (clearCache == true) {
                        redisCluster.del(cacheKey, function(err) {

                            if (redisCluster != null) {
                                redisCluster.disconnect();
                                redisCluster = null;
                            }
                        });
                        utils.printJSON(res, utils.getJSONObject(200, "Delete : " + cacheKey, null));
                    } else {
                        redisCluster.get(cacheKey, function(err, reply) {

                            if (err) {
                                log.error("[500] indexBein Service [redisCluster.get]: " + err.stack);
                            } else {

                                if (reply != "" && reply != undefined) {
                                    // var json = [];
                                    // json[0] = JSON.parse(reply);

                                    if (redisCluster != null) {
                                        redisCluster.disconnect();
                                        redisCluster = null;
                                    }
                                    // utils.printJSON(res, utils.getJSONObject(200, "Redis", json));
                                    // utils.printJSON(res, JSON.parse(reply) );
                                    utils.printJSON(res, utils.getJSONPaginationObject(200, "Success", JSON.parse(reply), null, null, null, cacheKey));
                                } else {
                                    getDataFromPhp(res, redisCluster, cacheKey);
                                }
                            }
                        });
                    }
                } else {
                    getDataFromPhp(res, redisCluster, cacheKey);
                }
            }
        })
    });

    redisCluster.once('error', function(err) {
        if (redisCluster != null) {
            redisCluster.disconnect();
            redisCluster = null;
        }
        getDataFromPhp(res, redisCluster, cacheKey);
    });
}

/* GET users listing. */
router.get('/', function(req, res, next) {

    getDataFromRedisCluster(res, false);
});

router.get('/:clear_cache', function(req, res, next) {

    if (req.params.clear_cache == 'clear') {
        getDataFromRedisCluster(res, true);
    } else {
        getDataFromRedisCluster(res, false);
    }
});

module.exports = router;
