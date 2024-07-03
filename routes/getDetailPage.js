// *** Create 22/12/2016. ta ***

var express = require('express');
var config = require('../config/index')
var utils = require('../utils/index');
var log = require('../logging/index');
var async = require("async");
var router = express.Router();
var redis_key = config.getKeyType() + config.getKeyPrefix() + config.getKeyProjectName() + 'detail-page-id-';
var cache_timeout = 60; // 1 minute


function setData2Redis(mysql_connection, param, data, key, redisCluster, callback) {

    var value = JSON.stringify(data);
    if (redisCluster != null) {

        redisCluster.set(key, value, function(error, reply) {

            if (!error) {
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

    var query_data = [];
    query_data.push(param.page_id, param.lang);

    var query = "";
    query = "SELECT `page_id2`, `title`, `picture`, `lang`, `url`, `new_window`, `detail`, ";
    query += " `description`, `keyword`, `category_id`, `subcategory_id`, `recommend`, ";
    query += " `is_menu`, `embed_script`, `order_by`, `share`, `countview`, ";
    query += " DATE_FORMAT(`create_date`, '%d-%m-%Y %H:%m') AS create_date, ";
    query += " DATE_FORMAT(`lastupdate_date`, '%d-%m-%Y %H:%m') as lastupdate_date, `status` ";
    query += " FROM `ss_page` WHERE page_id2 = ? AND lang = ? ";

    try {
        mysql_connection.query({
            sql: query,
            timeout: 2000,
            values: query_data
        }, function(error, result) {

            if (error) {

                log.error("[500] getDetailPage Service[getDetail]: " + error.stack);
                callback(500, error.stack);

            } else {

                if (!utils.isEmptyObject(result) && result.length > 0) {

                    var data = result;

                    callback(null, mysql_connection, param, data, key, redisCluster);

                } else {
                    callback(501, "Data not found.");
                }
            }
        });
    } catch (err) {
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
                redisCluster = null
            }

            log.error("[500] getDetailPage Service[getDataFromMySQL]: " + connectError.stack);
            utils.printJSON(res, utils.getJSONObject(500, connectError.stack, null));

        } else {

            async.waterfall([
                async.apply(getDetail, mysql_connection, param, key, redisCluster),
                setData2Redis,
            ], function(error, result) {

                mysql_connection.end();

                if (error) {

                    var output = [];
                    output[0] = result;
                    if (error == 200) {
                        utils.printJSON(res, utils.getJSONObject(200, "Success", result));
                    } else {
                        utils.printJSON(res, utils.getJSONObject(error, result, null));
                    }

                } else {

                    var output = [];
                    output[0] = result;
                    utils.printJSON(res, utils.getJSONObject(200, "Success", result));
                }
            });
        }
    });
}

function getDataFromRedis(res, param) {

    var key = redis_key + param.page_id;
    var redisCluster = config.getRedisCluster();
    redisCluster.once('connect', function() {

        try {

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
                                    redisCluster = null
                                }
                            });

                            utils.printJSON(res, utils.getJSONObject(200, "Delete: " + key, null));

                        } else {

                            redisCluster.get(key, function(error, reply) {

                                if (error) {

                                    log.error("[500] getDetailPage Service[redisCluster.get]: " + error.stack);
                                    getDataFromMySQL(res, redisCluster, param, key);

                                } else {

                                    if (reply != "" && reply != undefined) {

                                        var json = [];
                                        json[0] = JSON.parse(reply);

                                        if (redisCluster != null) {
                                            redisCluster.disconnect();
                                            redisCluster = null
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

        } catch (error) {
            if (redisCluster != null) {
                redisCluster.disconnect();
                redisCluster = null;
            }
            getDataFromMySQL(res, redisCluster, param, key);
        }

    });

    redisCluster.once('error', function(err) {

        try {
            if (redisCluster != null) {
                redisCluster.disconnect();
                redisCluster = null;
            }
        } catch (error) {}

        getDataFromMySQL(res, redisCluster, pageId, lang, key);
    });
}

// router.get('/', function(req, res, next) {

//     utils.printJSON(res, utils.getJSONObject(502, 'invalid parameters.', null));
// });


router.get('/', function(req, res, newxt) {
    var page_id = req.query.id;
    var lang = req.query.lang;
    var clearCache = req.query.clearCache;

    var param = {};

    if (clearCache === '' || typeof clearCache === 'undefined') {
        clearCache = false;
    } else {
        clearCache = true;
    }

    if (lang === '' || typeof lang === 'undefined') {
        lang = 'th';
    } else {
        lang = 'en';
    }

    if (page_id === '' || typeof page_id === 'undefined') {
        utils.printJSON(res, utils.getJSONObject(502, 'invalid parameters.', null));
    }

    param.clear_cache = clearCache;
    param.lang = lang;
    param.page_id = page_id;


    getDataFromRedis(res, param);
});

module.exports = router;
