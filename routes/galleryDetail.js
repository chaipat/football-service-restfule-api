// *** Create 22/12/2016. ta ***

var express = require('express');
var config = require('../config/index')
var utils = require('../utils/index');
var log = require('../logging/index');
var async = require("async");
var router = express.Router();
var redis_key = config.getKeyType() + config.getKeyPrefix() + config.getKeyProjectName() + 'detail-gallery-getDetail-' ;
var cache_timeout = 60; // 1 minute
var static_image_url = config.getStaticImageURL();

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

function getGallery(mysql_connection, param, jsonData, key, redisCluster, callback) {
    var id = jsonData["gallery_id"];
    var id_for_query = [];

    id_for_query.push(id);

    var query = " SELECT `picture_id`, `ref_id`, `ref_type`, `source_id`, `folder`, ";
    query += " `file_name`, `file_path`, `elvis_path`, `caption`, `reporter_name`, `default`, ";
    query += " `order`, `credit_id`, `copyright`, `creator`, `status` ";
    query += " FROM `ss_picture` WHERE `ref_type` = 3 AND ref_id = ? AND `default` = 0 ";

    mysql_connection.query({
        sql: query,
        timeout: 2000,
        values: id_for_query
    }, function(error, result) {
        
        if (error) {
            log.error("[500] detail/gallery/getDetail Service[getGallery]: " + error.stack);
            callback(500, error.stack);
            jsonData.gallery = [];
        } else {
            if (!utils.isEmptyObject(result) && result.length > 0) {
                jsonData.gallery = result;
            } else {
                jsonData.gallery = [];
            }
            callback(null, mysql_connection, param, jsonData, key, redisCluster);
        }
    });  
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
    
    var id = jsonData["gallery_id"];
    var id_for_query = [];

    id_for_query.push(id);

    var query = "SELECT `ss_tag_pair_gallery`.tag_id, tag_text "; 
    query = query + "FROM `ss_tag_pair_gallery` ";
    query = query + "LEFT JOIN `ss_tag` on `ss_tag`.tag_id = `ss_tag_pair_gallery`.tag_id ";
    query = query + "WHERE `ss_tag_pair_gallery`.ref_id = ? " ;        
    query = query + "ORDER BY `ss_tag_pair_gallery`.`create_date` DESC";

    mysql_connection.query({
        sql: query,
        timeout: 2000,
        values: id_for_query
    }, function (error, result) {

        if (error) {
            log.error("[500] detail/gallery/getDetail Service[getTag]:" + error.stack);
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
	var query_data = param.gallery_id;

	var query_string = " SELECT gallery.`gallery_id2` AS gallery_id, gallery.`gallery_type_id`, ";
    query_string += " gallery.`player_id`, gallery.`lang`, gallery.`shorturl`, gallery.credit_id, gallery.`title`, ";
    query_string += " gallery.`detail`, gallery.`can_comment`, gallery.`credit_id`, gallery.`order_by`, ";
    query_string += " gallery.`countview`, DATE_FORMAT(gallery.`create_date`, '%d-%m-%Y %H:%m') AS create_date, gallery.`create_by`, ";
    query_string += " DATE_FORMAT(gallery.`lastupdate_date`, '%d-%m-%Y %H:%m') AS lastupdate_date, gallery.`lastupdate_by`, gallery.`approve_date`, ";
    query_string += " gallery.`approve_by`, gallery.`status`, gallery.`approve`, ";
    query_string += " picture.`folder`, picture.`file_name` ";
    query_string += " FROM `ss_gallery` AS gallery LEFT JOIN `ss_picture` AS picture ";
    query_string += " ON gallery.`gallery_id2`= picture.`ref_id` ";
    query_string += " AND picture.ref_type = 3 AND picture.default = 1 ";
    query_string += " WHERE gallery.`gallery_id2` = ? AND gallery.`status` = 1 ";
    query_string += " AND gallery.`approve` = 1 ";

	try{
		mysql_connection.query({
			sql: query_string,
			timeout: 2000,
			values: query_data
		}, function(error, result) {

			if (error) {
				log.error("[500] detail/gallery/getDetail Service[getDetail]: " + error.stack);
				callback(500, error.stack);
			} else {
				if (!utils.isEmptyObject(result) && result.length > 0) {
                    var data = result[0];

                    if (data.credit_id != null || data.credit_id != undefined) {
                        var arr = data.credit_id.replace('[', '').replace(']', '');
                        data.credit_id = arr;
                    }

                    if (data.detail != null){ 
                        data.detail = data.detail.replace(/\/uploads/g, static_image_url);    
                    }

                    var data2 = result;
                    for(var i in data2){
                        var picType = 'gallery';
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
	} catch (err){
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

            log.error("[500] detail/gallery/getDetail Service[getDataFromMySQL]: " + connectError.stack);
            utils.printJSON(res, utils.getJSONObject(500, connectError.stack, null));
    	} else {
    		async.waterfall([
    			async.apply(getDetail, mysql_connection, param, key, redisCluster),
                getCreditName,
                getTag,
                getGallery,
                setData2Redis,
    			], function(error, result) {
    				
    				mysql_connection.end();

    				if (error) {
    					if (error == 200) {
                            var output = [];
                            output[0] = result;
    						utils.printJSON(res, utils.getJSONObject(200, "Success", output));
    					} else {
    						utils.printJSON(res, utils.getJSONObject(error, output, null));
    					}
    				} else {
                        var output = [];
                        output[0] = result;
    					utils.printJSON(res, utils.getJSONObject(200, "Success", output));
    				}
				});
    	}
    });
}

function getDataFromRedis(res, param) {
    var key = redis_key + param.gallery_id;
    var redisCluster = config.getRedisCluster();
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
                                    var json = [];
                                    json[0] = JSON.parse(reply);
                                    
                                    if (redisCluster != null) {
                                        redisCluster.disconnect();
                                        redisCluster = null;
                                    }

                                    utils.printJSON(res, utils.getJSONObject(200, "Redis", json));
                                } else {
                                    // utils.printJSON(res, utils.getJSONObject(200, "Redis", json));
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

router.get('/:gallery_id', function(req, res, next) {
    var param = {};
    param.gallery_id = req.params.gallery_id;
    param.clear_cache = false;
    if (req.params.gallery_id != "") {
        getDataFromRedis(res, param);
    } else {
        utils.printJSON(res, utils.getJSONObject(501, "Invalid parameter.", null));
    }
});

router.get('/:gallery_id/:clear_cache', function(req, res, next) {
    var param = {};
    param.gallery_id = req.params.gallery_id;

    if (req.params.clear_cache == 'true') {
        param.clear_cache = true;
    } else {
        param.clear_cache = false;
    }
    getDataFromRedis(res, param);
});

module.exports = router;