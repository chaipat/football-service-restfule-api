// *** Create 22/12/2016. ta ***

var express = require('express');
var config = require('../config/index')
var utils = require('../utils/index');
var log = require('../logging/index');
var async = require("async");
var router = express.Router();
var redis_key = config.getKeyType() + config.getKeyPrefix() + config.getKeyProjectName() + 'detail-video-getDetail-';
var cache_timeout = 60; // 1 minute
var static_image_url = config.getStaticImageURL();

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

function getCreditName(mysql_connection, param, jsonData, key, redisCluster, callback) {

    var query = "SELECT credit_name FROM ss_credit WHERE credit_id IN (" + jsonData.credit_id + ") ";
    mysql_connection.query({
        sql: query,
        timeout: 2000,

    }, function(error, result) {

        if (error) {
            log.error("[500] detail/video/getDetail Service[getCreditName]: " + error.stack);
            callback(500, error.stack);
            jsonData.credit_name = [];
        } else {

            var arrData = [];
            if (!utils.isEmptyObject(result) && result.length > 0) {

                for (var i = 0; i < result.length; i++) {
                    arrData.push(result[i].credit_name);
                }

                jsonData.credit_name = arrData;
                callback(null, mysql_connection, param, jsonData, key, redisCluster);
            } else {
                jsonData.credit_name = [];
                callback(null, mysql_connection, param, jsonData, key, redisCluster);
            }
        }
    });
}

function getTag(mysql_connection, param, jsonData, key, redisCluster, callback) {
    var id = jsonData["video_id"];
    var id_for_query = [];

    id_for_query.push(id);

    var query = "SELECT `ss_tag_pair_clip`.tag_id, tag_text ";
    query = query + "FROM `ss_tag_pair_clip` ";
    query = query + "LEFT JOIN `ss_tag` on `ss_tag`.tag_id = `ss_tag_pair_clip`.tag_id ";
    query = query + "WHERE `ss_tag_pair_clip`.ref_id = ? ";
    query = query + "ORDER BY `ss_tag_pair_clip`.`create_date` DESC";

    mysql_connection.query({
        sql: query,
        timeout: 2000,
        values: id_for_query
    }, function(error, result) {

        if (error) {
            log.error("[500] detail/video/getDetail Service[getTag]:" + error.stack);
            callback(500, error.stack);
            jsonData.tag = [];
        } else {
            if (!utils.isEmptyObject(result) && result.length > 0) {
                jsonData.tag = result;
            } else {
                jsonData.tag = [];
            }

            callback(null, mysql_connection, param, jsonData, key, redisCluster);
        }
    });
}

function getDetail(mysql_connection, param, key, redisCluster, callback) {
    var query_data = param.video_id;

    var query_string = " SELECT vdo.video_id2 AS video_id, vdo.brightcove_id, vdo.embed_video, vdo.credit_id, vdo.rate18_flag, ";
    query_string += " vdo.title, vdo.caption, vdo.detail, vdo.countview, vdo.order_by, DATE_FORMAT(vdo.create_date, '%d-%m-%Y %H:%m') AS create_date , ";
    query_string += " DATE_FORMAT(vdo.lastupdate_date, '%d-%m-%Y %H:%m') AS lastupdate_date, vdo.file_name, vdo.file_path, picture.folder, picture.file_name as thumbnail, ";
    query_string += " ss_tournament.tournament_name_th, ss_tournament.tournament_name_en, ss_tournament.url as tournament_url, ss_tournament.dimension as tournament_dimension, ";
    query_string += " ss_sport.sport_name_th, ss_sport.sport_name_en, ss_sport.url as sport_url, ss_sport.dimension as sport_dimension ";
    query_string += " FROM `ss_video` AS vdo LEFT JOIN `ss_picture` AS picture ";
    query_string += " ON vdo.video_id2 = picture.ref_id AND picture.ref_type = 4 AND picture.default = 1 ";
    query_string += " LEFT JOIN ss_tournament ON vdo.tournament_id = ss_tournament.tournament_id ";
    query_string += " LEFT JOIN ss_sport ON vdo.sport_id = ss_sport.sport_id ";
    query_string += " WHERE (vdo.`status` = 1 AND vdo.`approve` = 1) AND vdo.`lang` = 'th' AND vdo.`video_id2` = ? ";

    try {
        mysql_connection.query({
            sql: query_string,
            timeout: 2000,
            values: query_data
        }, function(error, result) {

            if (error) {
                log.error("[500] detail/video/getDetail Service[getDetail]: " + error.stack);
                callback(500, error.stack);
            } else {
                if (!utils.isEmptyObject(result) && result.length > 0) {
                    var data = result[0];

                    if (data.credit_id != null || data.credit_id != undefined) {
                        var arr = data.credit_id.replace('[', '').replace(']', '');
                        data.credit_id = arr;
                    }

                    if (data.detail != null) {
                        data.detail = data.detail.replace(/\/uploads/g, static_image_url);
                    }

                    var data2 = result;
                    for (var i in data2) {
                        var picType = 'vdo';
                        var picture_size = {
                            'fullsize': picType + '/' + data2[i]['folder'] + '/' + data2[i]['file_name'],
                            'size128': 'size128/' + data2[i]['folder'] + '/' + data2[i]['file_name'],
                            'size224': 'size224/' + data2[i]['folder'] + '/' + data2[i]['file_name'],
                            'size304': 'size304/' + data2[i]['folder'] + '/' + data2[i]['file_name'],
                            'size640': 'size640/' + data2[i]['folder'] + '/' + data2[i]['file_name']
                        };
                        data.picture_size = picture_size;
                    }

                    callback(null, mysql_connection, param, data, key, redisCluster);
                } else {
                    callback(501, "Data not found.")
                }
            }
        });
    } catch (err) {
        callback(500, err.stack);
    }

}

function getDetailFromPhp(mysql_connection, param, key, redisCluster, callback) {
    
    var id = param.video_id;
    
    request('http://sstv.siamsport.co.th/rss/getdetail.php?id='+id, function(error, response, body) {
        if (!error && response.statusCode == 200) {

            var objectBody = {};

            objectBody = JSON.parse(body);
            callback(null, mysql_connection, param, objectBody, key, redisCluster);
            // utils.printJSON(res, objectBody, null);
        } else {
            objectBody = {};
            callback(501, 'No data.');
        }
    });


    // callback(null, mysql_connection, param, data, key, redisCluster);

    // callback(501, "Data not found.")
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

            log.error("[500] detail/video/getDetail Service[getDataFromMySQL]: " + connectError.stack);
            utils.printJSON(res, utils.getJSONObject(500, connectError.stack, null));
        } else {
            async.waterfall([
                /*
                async.apply(getDetail, mysql_connection, param, key, redisCluster),
                getCreditName,
                getTag,
                */
                async.apply(getDetailFromPhp, mysql_connection, param, key, redisCluster),
                setData2Redis,
            ], function(error, result) {

                mysql_connection.end();

                if (error) {
                    if (error == 200) {
                        var output = [];
                        output[0] = result;
                        // utils.printJSON(res, utils.getJSONObject(200, "Success", output)); //prod
                        utils.printJSON(res, result); //temp
                    } else {
                        // utils.printJSON(res, utils.getJSONObject(error, output, null)); //prod
                        utils.printJSON(res, result); //temp
                    }
                } else {
                    var output = [];
                    output[0] = result;
                    // utils.printJSON(res, utils.getJSONObject(200, "Success", output)); //prod
                    utils.printJSON(res, result); //temp
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
                                log.error("[500] detail/news/getDetail Service[redisCluster.get]: " + error.stack);
                                getDataFromMySQL(res, redisCluster, param, key);
                            } else {
                                if (reply != "" && reply != undefined) {
                                    // var json = [];
                                    // json[0] = JSON.parse(reply);

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
