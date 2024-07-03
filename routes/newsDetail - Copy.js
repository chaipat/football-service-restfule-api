// *** Create 22/12/2016. ta ***

var express = require('express');
var config = require('../config/index')
var utils = require('../utils/index');
var log = require('../logging/index');
var async = require("async");

var router = express.Router();
// var redis_key = config.getKeyPrefix() + config.getKeyProjectName() + 'detail-news-getDetail-' + news_id;
var redis_key = config.getKeyType() + config.getKeyPrefix() + config.getKeyProjectName() + 'detail-news-getDetail-' ;
var cache_timeout = 60; // 1 minute
var static_image_url = config.getStaticImageURL();


function setData2Redis(mysql_connection, param, data, key, callback) {
    var value = JSON.stringify(data);

    if (redisCluster != null) {
        redisCluster.set(key, value);
        redisCluster.expire(key, cache_timeout);
    }

    callback(null, data);
}

function getTag(mysql_connection, param, jsonData, key, callback) {
    var id = param.news_id;
    var id_for_query = [];

    id_for_query.push(id);

    var query = "SELECT `ss_tag_pair_news`.tag_id, tag_text ";
    query = query + " FROM `ss_tag_pair_news` ";
    query = query + " LEFT JOIN `ss_tag` on `ss_tag`.tag_id = `ss_tag_pair_news`.tag_id ";
    query = query + " WHERE `ss_tag_pair_news`.ref_id = ? " ;
    query = query + " ORDER BY `ss_tag_pair_news`.`create_date` DESC";

    mysql_connection.query({
        sql: query,
        timeout: 2000,
        values: id_for_query
    }, function (error, result) {

        if (error) {
            log.error("[500] detail/news/getDetail Service[getTag]:" + error.stack);
            callback(500, error.stack);
            jsonData.tag = [];
        } else {
            if (!utils.isEmptyObject(result) && result.length > 0) {
                jsonData.tag = result;
            } else {
                jsonData.tag = [];
            }

            callback(null, mysql_connection, param, jsonData, key);
        }
    });
}

function getDetail(mysql_connection, param, key, callback) {
	var query_data = param.news_id;

	var query_string = " SELECT news.news_id2 as news_id, news.icon_pic, news.icon_vdo, news.headline, ";
	 query_string += " news.title, news.description, news.detail, news.embed_script, news.start_date, ";
	 query_string += " news.expire_date, news.countview, news.share_fb, news.comment_fb, news.like_fb, ";
	 query_string += " DATE_FORMAT(news.create_date, '%d-%m-%Y %H:%m') AS create_date, DATE_FORMAT(news.lastupdate_date, '%d-%m-%Y %H:%m') AS lastupdate_date , news.credit_id, picture.folder, picture.file_name, picture.caption ";
	 query_string += " FROM `ss_news` AS news LEFT JOIN `ss_picture` AS picture ";
	 query_string += " ON news.news_id2 = picture.ref_id and picture.ref_type = 1 and picture.default = 1 "
	 query_string += " WHERE news.`status` = 1 AND news.`approve` = 1 AND news.`lang` = 'th' AND news.`news_id2` = ? ";

	try{
		mysql_connection.query({
			sql: query_string,
			timeout: 2000,
			values: query_data
		}, function(error, result) {

			if (error) {
				log.error("[500] detail/news/getDetail Service[getDetail]: " + error.stack);
				callback(500, error.stack);
			} else {
				if (!utils.isEmptyObject(result) && result.length > 0) {
                    var data = result[0];

                    if (data.detail != null){ 
                        data.detail = data.detail.replace(/\/uploads/g, static_image_url);    
                    }
                    
                    

					callback(null, mysql_connection, param, data, key);
				} else {
					callback(501, "Data not found.");
				}
			}
			
		});
	} catch (err){
		callback(500, err.stack);
	}

}

function getDataFromMySQL(res, redisCluster, param, key) {
	// var data = {};
    var mysql_connection = config.getMySQLConnection();

    mysql_connection.connect(function(connectError) {

    	if (connectError) {
    		mysql_connection.end();
            log.error("[500] detail/news/getDetail Service[getDataFromMySQL]: " + connectError.stack);
            utils.printJSON(res, utils.getJSONObject(500, connectError.stack, null));
    	} else {
    		async.waterfall([
    			async.apply(getDetail, mysql_connection, param, key),
                getTag,
                setData2Redis,
    			], function(error, result) {
    				
    				mysql_connection.end();

    				if (redisCluster != null) {
    					redisCluster.disconnect();
    					redisCluster = null;
    				}
    				
                    
    				if (error) {

                        var output = [];
                        output[0] = result;
    					if (error == 200) {
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
    var key = redis_key + param.news_id;
    redisCluster = config.getRedisCluster();
    redisCluster.once('connect', function() {
        redisCluster.exists(key, function(err, reply) {
            if (err) {
                utils.printJSON(res, utils.getJSONObject(500, err.stack, null));
            } else {

                if (reply == true) {
                    if (param.clear_cache == true) {
                        redisCluster.del(key);
                        utils.printJSON(res, utils.getJSONObject(200, "Delete: " + key, null));
                    } else {
                        redisCluster.get(key, function(error, reply) {
                            if (error) {
                                log.error("[500] detail/news/getDetail Service[redisCluster.get]: " + error.stack);
                                getDataFromMySQL(res, redisCluster, param, key);
                            } else{
                                if (reply != "" && reply != undefined) {
                                    var json = [];
                                    json[0] = JSON.parse(reply);
                                    redisCluster.disconnect();
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

/* GET users listing. */
router.get('/', function(req, res, next) {
    utils.printJSON(res, utils.getJSONObject(502, "Missing parameter.", null));
});

router.get('/:news_id', function(req, res, next) {
    var param = {};
    param.news_id = req.params.news_id;
    param.clear_cache = false;
    if (req.params.news_id != "") {
        getDataFromRedis(res, param);
    } else {
        utils.printJSON(res, utils.getJSONObject(501, "Invalid parameter.", null));
    }
});

router.get('/:news_id/:clear_cache', function(req, res, next) {
    var param = {};
    param.news_id = req.params.news_id; 

    if(req.params.clear_cache == 'true') {
        param.clear_cache = true;
    } else {
        param.clear_cache = false;
    }

    getDataFromRedis(res, param);
});

module.exports = router;
