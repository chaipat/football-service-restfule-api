// *** Create 22/12/2016. ta ***

var express = require('express');
var config = require('../config/index')
var utils = require('../utils/index');
var log = require('../logging/index');
var async = require("async");
var router = express.Router();
var redis_key = config.getKeyType() + config.getKeyPrefix() + config.getKeyProjectName() + 'viewshare-all-social-';
var cache_timeout = 0; // 1 minute
var static_image_url = config.getStaticImageURL();
var tournament_id = 0;
var conf_types = ["news", "column", "video", "gallery"];


function clearGarbageCollection() {
    
    if (utils.clearGarbageCollection() == false) {
        log.error("Garbage collection unavailable.  Pass --expose-gc when launching node to enable forced garbage collection.");
    }
}

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

function updateShare(mysql_connection, param, data, key, redisCluster, callback) {
    
    var display_data = data;
    var query_update = [];
    var page = param.page;

    query_update.push(display_data["countshare"]);
    query_update.push(param.article_id);

    if (page == "news") {
        var query_string = " UPDATE ss_news SET share = ? ";
        query_string += " WHERE news_id2 = ? ";
    } else if (page == "column") {
        var query_string = " UPDATE ss_column SET share = ? ";
        query_string += " WHERE column_id2 = ? ";
    } else if (page == "gallery") {
        var query_string = " UPDATE ss_gallery SET share = ? ";
        query_string += " WHERE gallery_id2 = ? ";
    } else {
        var query_string = " UPDATE ss_video SET share = ? ";
        query_string += " WHERE video_id2 = ? ";
    }

    mysql_connection.query({
        sql: query_string,
        timeout: 10000,
        values: query_update
    }, function(errorUpdate, resultUpdate) {

        if (errorUpdate) {

            log.error(query_string);
            log.error(query_update);
            log.error("[500] viewShareAll Service[updateShare]: " + errorUpdate.stack);
            callback(500, errorUpdate.stack);

        } else {
            
            callback(null, mysql_connection, param, display_data, key, redisCluster);
        }
    });
}

function getDetail(mysql_connection, param, key, redisCluster, callback) {
    
    var query_data = param.url;
    var query_string = " SELECT SUM(countview) AS countshare FROM `ss_social` WHERE url = ? ";

    try {
        mysql_connection.query({
            sql: query_string,
            timeout: 2000,
            values: query_data
        }, function(error, result) {

            if (error) {

                log.error(query_string);
                log.error(query_data);
                log.error("[500] viewShareAll Service[getDetail]: " + error.stack);
                callback(500, error.stack);

            } else {

                if (param.opt == "update") { // have data and update
                    
                    // do update data.
                    var data_update = [];
                    data_update.push(param.url);
                    data_update.push(param.social);

                    var query_update = " UPDATE ss_social SET countview = countview + 1 ";
                    query_update += " WHERE url = ? AND social_group = ? ";

                    mysql_connection.query({
                        sql: query_update,
                        timeout: 2000,
                        values: data_update
                    }, function(error3, reuslt3) {

                        if(error3) {

                            log.error(query_update);
                            log.error(data_update);
                            log.error("[500] viewShareAll Service[getDetail]: " + error3.stack);
                            callback(500, error3.stack);
                        } else {

                            if (reuslt3["changedRows"] > 0) {
                                //get countshare2show.
                                var query_get_data = param.url;
                                var query_string_get_data = " SELECT SUM(countview) AS countshare FROM `ss_social` WHERE url = ? ";

                                mysql_connection.query({
                                    sql: query_string_get_data,
                                    timeout: 2000,
                                    values: query_get_data
                                }, function(error4, result4) {

                                    if (error4) {

                                        log.error(query_string_get_data);
                                        log.error(query_get_data);
                                        log.error("[500] viewShareAll Service[getDetail]: " + error4.stack);
                                        callback(500, error4.stack);

                                    } else {

                                        if (!utils.isEmptyObject(result4) && result4.length > 0) {
                                            callback(null, mysql_connection, param, result4[0], key, redisCluster);
                                        } else {
                                            callback(404, "Data not found.");
                                        }
                                    }
                                });

                            } else {

                                var insert_data = [];
                                insert_data.push(key);
                                insert_data.push(param.social);
                                insert_data.push(param.url);
                                insert_data.push(tournament_id);
                                insert_data.push(param.article_id);

                                var query_insert = " INSERT INTO `ss_social` ";
                                query_insert += " (`id`, `social_name`, `social_group`, `countview`, `url`, `tournament_id`, `ref_id`) ";
                                query_insert += " VALUES (NULL, ?, ?, 1, ?, ?, ?) ";

                                mysql_connection.query({
                                    sql: query_insert,
                                    timeout: 2000,
                                    values: insert_data
                                }, function(error2, result2) {

                                    if (error2) {

                                        log.error(query_insert);
                                        log.error(insert_data);
                                        log.error("[500] viewShareAll Service[Insert data]: " + error2.stack);
                                        callback(500, error2.stack);

                                    } else {
                                        //get countshare2show.
                                        var query_get_data = param.url;
                                        var query_string_get_data = " SELECT SUM(countview) AS countshare FROM `ss_social` WHERE url = ? ";

                                        mysql_connection.query({
                                            sql: query_string_get_data,
                                            timeout: 2000,
                                            values: query_get_data
                                        }, function(error4, result4) {
                                            if (error4) {
                                                
                                                log.error(query_string_get_data);
                                                log.error(query_get_data);
                                                log.error("[500] viewShareAll Service[Insert data]: " + error4.stack);
                                                callback(500, error4.stack);

                                            } else {
                                                
                                                if (!utils.isEmptyObject(result4) && result4.length > 0) {
                                                    callback(null, mysql_connection, param, result4[0], key, redisCluster);
                                                } else {
                                                    callback(404, "Data not found.");
                                                }
                                            }
                                        });
                                    }
                                });
                            }
                        }
                    });

                } else { // not require update data

                    if (!utils.isEmptyObject(result) && result.length > 0) {
                        // var json_data;
                        var data = result[0];

                        if (data.countshare == null) { //data is null
                            var previewData = { countshare: 0 };
                            callback(null, mysql_connection, param, previewData, key, redisCluster);
                        } else {
                            // get data.
                            callback(null, mysql_connection, param, data, key, redisCluster);
                        }

                    } else {
                        callback(404, "Data not found.")
                    }
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
                redisCluster = null;
            }

            log.error("[500] viewShareAll Service[getDataFromMySQL]: " + connectError.stack);
            utils.printJSON(res, utils.getJSONObject(500, connectError.stack, null));

        } else {
            
            async.waterfall([
                async.apply(getDetail, mysql_connection, param, key, redisCluster),
                updateShare,
                setData2Redis,
            ], function(error, result) {

                mysql_connection.end();

                if (error) {
                    if (error == 200) {
                        var output = [];
                        output[0] = result;
                        utils.printJSON(res, utils.getJSONObject(200, "Success", output));
                    } else {

                        if (redisCluster != null) {
                            redisCluster.disconnect();
                            redisCluster = null;
                        }
                        utils.printJSON(res, utils.getJSONObject(error, output, null));
                    }
                } else {
                    var output = [];
                    output[0] = result;
                    utils.printJSON(res, utils.getJSONObject(200, "Success", output));
                }

                clearGarbageCollection();
            });
        }
    });
}

function getDataFromRedis(res, param) {

    var key = redis_key + param.url;
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

                if (reply == 1) {

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
                                getDataFromMySQL(res, redisCluster, param, key);
                            } else {

                                if (reply != "" && reply != undefined) {

                                    var json = [];
                                    json[0] = JSON.parse(reply);

                                    if (redisCluster != null) {
                                        redisCluster.disconnect();
                                        redisCluster = null;
                                    }

                                    utils.printJSON(res, utils.getJSONObject(200, "Redis", json));
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

router.get('/', function(req, res, next) {

    var cache = req.query.cache;
    var opt = req.query.type;
    var social_group = req.query.social;
    
    var param = {};

    param.opt = "get";
    param.url = req.query.url;
    param.social = social_group;

    if (req.query.page === undefined) {
        param.page = null;
    } else {
        param.page = req.query.page;    
    }

    var article_id = param.url.substr(param.url.lastIndexOf('/') + 1);

    if (article_id != ""){
        param.article_id = article_id;
    } else if ( isNaN(article_id) ) {
        param.article_id = 0;
    }

    if (opt == 'update')
        param.opt = "update";

    if (cache == 'clear') {
        param.clear_cache = true;
    } else {
        param.clear_cache = false;
    }

    if (param.url != "") {
        getDataFromRedis(res, param);
    } else {
        utils.printJSON(res, utils.getJSONObject(501, "Invalid parameter.", null));
    }
});

module.exports = router;