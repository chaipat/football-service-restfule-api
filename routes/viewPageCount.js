var express = require('express');
var config = require('../config/index');
var utils = require('../utils/index');
var log = require('../logging/index');
var async = require("async");
var router = express.Router();

var keys = config.getKeyPrefix() + config.getKeyProjectName() + "page-visitor-";
var redis_cache_timeout = 0; // 1 minute.
var tournament_id = 0;

function clearGarbageCollection() {

    if (utils.clearGarbageCollection() == false) {
        log.error("Garbage collection unavailable.  Pass --expose-gc when launching node to enable forced garbage collection.");
    }
}

function getPreview(res, raw_json, redisCluster) {

    var data = {};
    data.view_count = parseInt(raw_json["view"]);
    data.id = raw_json["rpl_url"];
    data.comment = raw_json["comment"];

    utils.printJSON(res, utils.getJSONObject(200, "success", data));

    if (redisCluster != null) {
        redisCluster.disconnect();
        redisCluster = null;
    }

    clearGarbageCollection();
}

function setData2RedisCluster(res, raw_json, redisCluster) {

    var cache_key = raw_json["cache_key"];
    if (redisCluster != null) {

        redisCluster.set(cache_key, raw_json["view"], function(err) {

            if (!err) {
                redisCluster.expire(cache_key, redis_cache_timeout);
            }

            if (redisCluster != null) {
                redisCluster.disconnect();
                redisCluster = null;
            }
        });

        getPreview(res, raw_json, redisCluster);
    } else {
        getPreview(res, raw_json, redisCluster);
    }
}

function getDataFromMySQL(res, raw_json, redisCluster) {

    var mysql_connection = config.getMySQLConnection();
    var data = [];
    var url = raw_json["url"];
    var rpl_url = raw_json["rpl_url"];
    var tournament_id = raw_json["tournament_id"];
    var cache_key = raw_json["cache_key"];

    mysql_connection.connect(function(err) {

        if (err) {

            mysql_connection.end();

            if (redisCluster != null) {
                redisCluster.disconnect();
                redisCluster = null;
            }

            log.error("[500] viewPageCount Service: " + err.stack);
            utils.printJSON(res, utils.getJSONObject(500, err.stack, null));

        } else {

            if (raw_json["option"] != "update") {

                data.push(rpl_url, tournament_id);

                var query = "SELECT countview ";
                query = query + " from `ss_report_pagecount` ";
                query = query + " WHERE (page_name = ? AND `tournament_id` = ? )";
                query = query + " LIMIT 1";

                mysql_connection.query({
                    sql: query,
                    timeout: 2000, //2 Sec.
                    values: data
                }, function(error, result) {

                    if (error) {

                        if (redisCluster != null) {
                            redisCluster.disconnect();
                            redisCluster = null;
                        }
                        
                        mysql_connection.end();
                        log.error("[500] getDataFromMySQL: " + error.stack);
                        utils.printJSON(res, utils.getJSONObject(500, error.stack, null));

                    } else {

                        if (utils.isEmptyObject(result)) {

                            var query = "INSERT INTO `ss_report_pagecount` ";
                            query = query + "(`page_id`, `page_name`, `tournament_id`, `countview` ) ";
                            query = query + "VALUES (NULL, ?, ?, 2)";
                            mysql_connection.query({
                                sql: query,
                                timeout: 2000, //2 Sec.
                                values: data
                            }, function(error1, result2) {

                                mysql_connection.end();

                                if (error1) {
                                    log.error("[500] InsertgetDataFromMySQL:" + error1.stack);
                                    utils.printJSON(res, utils.getJSONObject(500, error1.stack, null));
                                } else {
                                    raw_json["view"] = 1;
                                    getPreview(res, raw_json, redisCluster);
                                }
                            });

                        } else {

                            var rs = result[0];
                            raw_json["view"] = rs["countview"];
                            setData2RedisCluster(res, raw_json, redisCluster);
                        }
                    }
                });

            } else {

                data.push(raw_json["view"], rpl_url, tournament_id);

                var query = "UPDATE `ss_report_pagecount` ";
                query = query + "SET `countview` = ? ";
                query = query + "WHERE `page_name` = ? AND `tournament_id` = ? ";

                mysql_connection.query({
                    sql: query,
                    timeout: 2000, //2 Sec.
                    values: data
                }, function(error, result) {

                    if (result["changedRows"] > 0) {
                        mysql_connection.end();
                        getPreview(res, raw_json, redisCluster);
                    } else {
                        var query = "INSERT INTO `ss_report_pagecount` ";
                        query = query + "(`page_id`, `countview`, `page_name`, `tournament_id` ) ";
                        query = query + "VALUES (NULL, ?, ?, ?)";
                        mysql_connection.query({
                            sql: query,
                            timeout: 2000, //2 Sec.
                            values: data
                        }, function(error1, result2) {
                            mysql_connection.end();
                            if (error1) {

                                log.error("[500] InsertgetDataFromMySQL:" + error1.stack);

                            } else {

                                getPreview(res, raw_json, redisCluster);

                            }
                        });
                    }
                });
            }
        }
    });
}

function getKeyData(res, url) {

    var redisCluster = config.getRedisCluster();
    var rpl_url = url;
    var cache_key = keys + rpl_url;
    var rand = Math.floor(Math.random() * 100) + 1;
    var raw_json = [];

    raw_json["url"] = url;
    raw_json["rpl_url"] = rpl_url;
    raw_json["cache_key"] = cache_key;
    raw_json["option"] = "insert";
    raw_json["tournament_id"] = tournament_id;
    raw_json["view"] = 0;
    raw_json["comment"] = "created";

    redisCluster.once('connect', function() {

        try {

            redisCluster.exists(cache_key, function(err, reply) {
                
                if (err) {

                    if (redisCluster != null) {
                        redisCluster.disconnect();
                        redisCluster = null;
                    }
                    utils.printJSON(res, utils.getJSONObject(500, err.stack, null));

                } else {

                    if (reply) {

                        redisCluster.incr(cache_key, function(err, value) {
                            
                            raw_json["view"] = value;

                            if ((value % 10) == 0) {
                                raw_json["option"] = "update";
                                raw_json["comment"] = raw_json["option"];
                                getDataFromMySQL(res, raw_json, redisCluster);
                            } else {
                                raw_json["comment"] = "increase";
                                getPreview(res, raw_json, redisCluster);
                            }

                        });

                    } else {
                        getDataFromMySQL(res, raw_json, redisCluster);
                    }
                }
            });

        } catch (error) {

            if (redisCluster != null) {
                redisCluster.disconnect();
                redisCluster = null;
            }
            getDataFromMySQL(res, raw_json, redisCluster);
        }
    });
}

router.get('/', function(req, res, next) {

    var url = req.query.url;

    if (url != null) {
        getKeyData(res, url);
    } else {
        utils.printJSON(res, utils.getJSONObject(507, "Url not found", str));
    }
});

module.exports = router;