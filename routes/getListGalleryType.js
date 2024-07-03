// *** Create 26/12/2016. ta ***

var express = require('express');
var config = require('../config/index')
var utils = require('../utils/index');
var log = require('../logging/index');
var async = require("async");
var router = express.Router();
var redis_key = config.getKeyType() + config.getKeyPrefix() + config.getKeyProjectName() + 'list-gallery-type-';
var cache_timeout = 60; // 1 minute

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

function getList(mysql_connection, param, key, redisCluster, callback) {
    
    var query = "SELECT count(gallery_id2) as row FROM ss_gallery WHERE (status=1 AND approve=1 AND lang='th') AND gallery_type_id = " + param.gallery_type_id;//fix approve=0
    mysql_connection.query({
        sql: query,
        timeout: 2000, //2 Sec.
    }, function(error, results) {

        if (error) {
            log.error("[500] list/gallery/getList/getListGalleryType[getList]: " + error.stack);
            callback(500, error.stack);
            throw new Error(error.stack);
        } else {

            var resultObject = results[0];
            var row = resultObject["row"];

            var page_total = Math.ceil(row / param.limit);
            if (param.page >= page_total)
                param.page = page_total;

            var offset = (param.page == 0) ? param.page : (param.page - 1) * param.limit;
            query = "SELECT gallery.`gallery_id2` as id, gallery.`player_id`, gallery.`lang`, ";
            query += " gallery.`gallery_type_id`, gt.gallery_type_name, gallery.`shorturl`, ";
            query += " gallery.`title`, gallery.`can_comment`, gallery.`credit_id`, gallery.`order_by`, ";
            query += " gallery.`countview`, gallery.share, DATE_FORMAT(gallery.`create_date`, '%d-%m-%Y %H:%m') AS create_date, ";
            query += " DATE_FORMAT(gallery.`lastupdate_date`, '%d-%m-%Y %H:%m') AS lastupdate_date, ";
            query += " gallery.`status`, gallery.`approve`, picture.ref_type as picture_type, ";
            query += " picture.folder, picture.file_name FROM `ss_gallery` gallery ";
            query += " LEFT JOIN ss_picture picture ON gallery.gallery_id2 = picture.ref_id ";
            query += " AND (picture.ref_type = 3 AND picture.default = 1) ";
            query += " LEFT JOIN ss_gallery_type as gt ON gallery.gallery_type_id = gt.gallery_type_id ";
            query += " WHERE gallery.gallery_type_id = " + param.gallery_type_id + " AND gallery.lang = 'th' ";
            query += " AND gallery.status = 1 AND gallery.approve = 1 ORDER BY gallery.`order_by` ASC, gallery.`lastupdate_date` DESC ";
            query += " LIMIT " + offset + ", " + param.limit;

            mysql_connection.query({
                sql: query,
                timeout: 2000, //2 Sec.
            }, function(error, results) {

                if (error) {
                    log.error("[500] list/gallery/getList/getListGalleryType[getList]: " + error.stack);
                    callback(500, error.stack);
                    throw new Error(error.stack);
                } else {

                    ///// OUTPUT /////
                    if (utils.isEmptyObject(results)) {
                        callback(501, "Data not found.");

                    } else { // Have Data;      
                        //gallery_type_name
                        var resultObject2 = results[0];
                        var gallery_type_name = resultObject2["gallery_type_name"];

                        var jsonObj = utils.getJSONPaginationCustomObject(200, "success", results, param.page, page_total, row, null, null, null, null, null, gallery_type_name, "appListVideoType");
                        var jsonStr = JSON.stringify(jsonObj);

                        for (var i = 0; i < results.length; i++) {
                            var obj = results[i];
                            obj.thumbnail = obj.folder + "/" + obj.file_name;
                            results[i] = obj;

                            var data2 = results[i];
                            for(var j in data2){
                                var picType = 'gallery';
                                  var picture_size = {
                                    'fullsize': picType + '/' + data2['folder'] + '/' + data2['file_name'],
                                    'size128': 'size128/' + data2['folder'] + '/' + data2['file_name'],
                                    'size224': 'size224/' + data2['folder'] + '/' + data2['file_name'],
                                    'size304': 'size304/' + data2['folder'] + '/' + data2['file_name'],
                                    'size640': 'size640/' + data2['folder'] + '/' + data2['file_name']
                                  };
                                  results[i].picture_size = picture_size;
                            }
                        }
                        var jsonObj = utils.getJSONPaginationCustomObject(200, "Success", results, param.page, page_total, row, null, null, null, null, null, gallery_type_name);

                        callback(null,mysql_connection, param, key, jsonObj, redisCluster);
                    }
                    //////END OUTPUT/////////// 
                }
            });
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

            log.error("[500] list/gallery/getList/getListGalleryType Service[getDataFromMySQL]: " + connectionError.stack);
            utils.printJSON(res, utils.getJSONObject(500, connectionError.stack, null));
        } else {
            async.waterfall([
                async.apply(getList, mysql_connection, param, key, redisCluster),
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

    var key = redis_key + param.gallery_type_id + "-" + param.limit + "-" + param.page;
    var redisCluster = config.getRedisCluster();
    redisCluster.once('connect', function() {
        redisCluster.exists(key, function(error, reply) {

            if (error) {
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
                                log.error("[500] list/gallery/getList/getListGalleryType Service[redisCluster.get]: " + err.stack);
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

router.get('/:gallery_type_id/:item/:page', function(req, res, next) {
    var param = {};
    param.gallery_type_id = req.params.gallery_type_id;
    param.limit = req.params.item;
    param.page = req.params.page;
    param.clear_cache = false;

    getDataFromRedis(res, param);

});

router.get('/:gallery_type_id/:item/:page/:clear_cache', function(req, res, next) {
    var param = {};
    param.gallery_type_id = req.params.gallery_type_id;
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
