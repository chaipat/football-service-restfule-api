var express = require("express");
var config = require("../config/index");
var utils = require("../utils/index");
var log = require("../logging/index");
var dateFormat = require("dateformat");
var async = require("async");

var router = express.Router();
var redis_cache_timeout = 600; //Second //10 Minute (5*24*60*60)
var memcached_cache_timeout = 900; //Second //15 Minute (7*24*60*60)
var logger = "[getTag]-";
var cache_key = config.getKeyPrefix() + "tag/";
var tournament_id = 0;
var GKey = null;

//***************************************************************//
function clearGarbageCollection() {
  if (utils.clearGarbageCollection() == false) {
    log.error(
      "Garbage collection unavailable.  Pass --expose-gc when launching node to enable forced garbage collection."
    );
  }
}

function printOut(res, data_list, param_page, param_page_limit) {
  var output = [];
  var icount = 0;
  var row = data_list.length;
  data_list.sort(function(a, b) {
    return a.lastupdate_date < b.lastupdate_date;
  });
  ///////////////////////////////////////////////////
  //console.log("page : " + param_page );
  if (param_page <= 1) {
    param_page = 0;
    page = 1;
  } else {
    page = parseInt(param_page);
    param_page = Math.ceil(param_page * param_page_limit) - param_page_limit;
  }

  for (var i = param_page; i < row; i++) {
    if (icount < param_page_limit) {
      output.push(data_list[i]);
    } else {
      i = row;
    }
    icount += 1;
  }
  var page_total = Math.ceil(row / param_page_limit);
  if (typeof output != "undefined" && output != null && output.length > 0) {
    //utils.printJSON(res, utils.getJSONObject(200, "Success", output));
    var jsonObj = utils.getJSONPaginationObject(
      200,
      "Cache",
      output,
      page,
      page_total,
      row
    );
    var jsonStr = JSON.stringify(jsonObj);

    utils.printJSON(res, jsonObj);
  } else {
    utils.printJSON(res, utils.getJSONObject(400, "Data not found.", null));
  }
  clearGarbageCollection();
}

function setData2RedisCluster(redisCluster, id, team_data, callback) {
  var key = id;
  var value = JSON.stringify(team_data);
  //console.log(value);
  if (redisCluster != null) {
    redisCluster.set(GKey, value);
    redisCluster.expire(GKey, redis_cache_timeout);
    callback(null, team_data);
  } else {
    callback(null, team_data);
  }
}

function setData2Memcached(redisCluster, memcached, id, team_data, callback) {
  if (memcached != null) {
    var key = id;
    var value = JSON.stringify(team_data);
    memcached.set(key, value, memcached_cache_timeout, function(err) {
      if (err) log.error(logger + err);
      callback(null, redisCluster, key, team_data);
    });
  } else {
    callback(null, redisCluster, key, team_data);
  }
}

function setTagClip(
  redisCluster,
  memcached,
  mysql_connection,
  key,
  item,
  data_list,
  callback
) {
  var query = "select ";
  query +=
    "`ss_video`.video_id2 as id, `ss_video`.title, `ss_video`.caption as description, ";
  query +=
    "`ss_picture`.folder, `ss_picture`.file_name, concat(`ss_picture`.folder,'/', `ss_picture`.file_name) as thumbnail, ";
  query +=
    "DATE_FORMAT(`ss_video`.lastupdate_date, '%Y-%m-%d %H:%i:%s') AS`lastupdate_date`, DATE_FORMAT(`ss_video`.create_date, '%Y-%m-%d %H:%i:%s') AS create_date, redirect_url, ";
  query +=
    " ss_tournament.tournament_id, ss_tournament.tournament_name_th, ss_tournament.tournament_name_en, ss_tournament.domain, ss_sport.sport_name_th, ss_sport.sport_name_en ";
  query += " FROM `ss_tag_pair_clip` ";
  query +=
    " LEFt JOIN `ss_tag`ON `ss_tag_pair_clip`.`tag_id` = `ss_tag`.`tag_id` AND `ss_tag`.`status` = 1 ";
  query +=
    " JOIN `ss_video`ON `ss_tag_pair_clip`.`ref_id` = `ss_video`.`video_id2` ";
  query +=
    "LEFT JOIN ss_tournament ON ss_video.tournament_id = ss_tournament.tournament_id LEFT JOIN ss_sport ON ss_video.sport_id = ss_sport.sport_id ";
  //query = query + " AND `ss_video`.tournament_id = " + tournament_id;
  query +=
    " LEFT JOIN `ss_picture` ON `ss_video`.`video_id2` = `ss_picture`.`ref_id` AND `ss_picture`.`ref_type` = 4 ";
  query +=
    " WHERE `ss_tag`.`tag_id` = ? AND (`ss_video`.status=1 AND `ss_video`.approve=1) ";
  query += " ORDER BY `ss_video`.`lastupdate_date` DESC ";
  query += " LIMIT 100 ";

  var data_for_query = [];
  var id = item["tag_id"];

  data_for_query.push(id);

  mysql_connection.query(
    {
      sql: query,
      timeout: 2000, //2 Sec.
      values: data_for_query
    },
    function(error, result) {
      if (error) {
        log.error("[500] GetTagClip Service: " + error);
        callback(500, query);
      } else {
        if (!utils.isEmptyObject(result) && result.length > 0) {
          for (var i = 0; i < result.length; i++) {
            var obj = result[i];
            obj.thumbnail = obj.folder + "/" + obj.file_name;
            obj.icon_pic = 0;
            obj.icon_vdo = 1;
            obj.types = "video";
            obj.relate_id = obj.id;
            obj.picture = obj.thumbnail;
            result[i] = obj;
            data_list.push(obj);
          }
          callback(null, redisCluster, memcached, key, data_list);
        } else {
          callback(null, redisCluster, memcached, key, data_list);
        }
      }
    }
  );
}

function setTagColumn(
  redisCluster,
  memcached,
  mysql_connection,
  key,
  item,
  data_list,
  callback
) {
  var query =
    "SELECT `ss_tag_pair_column`.`ref_id` as id, `ss_column`.icon_pic, `ss_column`.icon_vdo, `ss_column`.title,  ";
  query +=
    " DATE_FORMAT(`ss_column`.lastupdate_date, '%Y-%m-%d %H:%i:%s') AS lastupdate_date, DATE_FORMAT(`ss_column`.create_date, '%Y-%m-%d %H:%i:%s') AS create_date, `ss_picture`.folder, `ss_picture`.file_name , redirect_url, ";
  query +=
    " ss_tournament.tournament_id, ss_tournament.tournament_name_th, ss_tournament.tournament_name_en, ss_tournament.domain, ";
  query += " ss_sport.sport_name_th, ss_sport.sport_name_en ";
  query +=
    " FROM `ss_tag_pair_column` JOIN `ss_column` ON `ss_tag_pair_column`.`ref_id` = `ss_column`.`column_id2` AND `ss_column`.`status` = 1 AND `ss_column`.`approve` = 1 ";
  //query = query + " AND `ss_column`.tournament_id = " + tournament_id;
  query +=
    " LEFT JOIN `ss_picture` ON `ss_column`.`column_id2` = `ss_picture`.`ref_id`  AND (`ss_picture`.`ref_type` = 2 AND `ss_picture`.default = 1) ";
  query +=
    "LEFT JOIN ss_tournament ON ss_column.tournament_id = ss_tournament.tournament_id LEFT JOIN ss_sport ON ss_column.sport_id = ss_sport.sport_id ";
  query += " WHERE tag_id = ? ";
  query += " ORDER BY `ss_tag_pair_column`.create_date DESC ";
  query += " LIMIT 100 ";

  var data_for_query = [];
  var id = item["tag_id"];

  data_for_query.push(id);

  mysql_connection.query(
    {
      sql: query,
      timeout: 2000, //2 Sec.
      values: data_for_query
    },
    function(error, result) {
      if (error) {
        log.error("[500] GetTagColumn Service: " + error);
        callback(500, error);
      } else {
        if (!utils.isEmptyObject(result) && result.length > 0) {
          for (var i = 0; i < result.length; i++) {
            var obj = result[i];
            obj.thumbnail = obj.folder + "/" + obj.file_name;
            obj.types = "column";
            obj.relate_id = obj.id;
            obj.picture = obj.thumbnail;
            result[i] = obj;
            data_list.push(obj);
          }
          callback(
            null,
            redisCluster,
            memcached,
            mysql_connection,
            key,
            item,
            data_list
          );
        } else {
          callback(
            null,
            redisCluster,
            memcached,
            mysql_connection,
            key,
            item,
            data_list
          );
        }
      }
    }
  );
}

function setTagNews(
  redisCluster,
  memcached,
  mysql_connection,
  key,
  item,
  callback
) {
  var query =
    "SELECT `ss_tag_pair_news`.`ref_id` as id, `ss_news`.icon_pic, `ss_news`.icon_vdo, `ss_news`.title,  `ss_news`.countview, `ss_news`.share, ";
  query +=
    " DATE_FORMAT(`ss_news`.lastupdate_date, '%Y-%m-%d %H:%i:%s') AS lastupdate_date, ";
  query +=
    " DATE_FORMAT(`ss_news`.create_date, '%Y-%m-%d %H:%i:%s') AS create_date, `ss_picture`.folder, `ss_picture`.file_name, `ss_news`.redirect_url, ";
  query +=
    " ss_tournament.tournament_id, ss_tournament.tournament_name_th, ss_tournament.tournament_name_en, ss_tournament.domain, ";
  query += " ss_sport.sport_name_th, ss_sport.sport_name_en ";
  query +=
    " FROM `ss_tag_pair_news` JOIN `ss_news` ON `ss_tag_pair_news`.`ref_id` = `ss_news`.`news_id2` AND `ss_news`.`status` = 1 AND `ss_news`.`approve` = 1 ";
  //query = query + " AND `ss_news`.tournament_id = " + tournament_id;
  query +=
    " LEFT JOIN `ss_picture` ON `ss_news`.`news_id2` = `ss_picture`.`ref_id`  AND (`ss_picture`.`ref_type` = 1 AND `ss_picture`.default = 1) ";
  query +=
    "LEFT JOIN ss_tournament ON ss_news.tournament_id = ss_tournament.tournament_id LEFT JOIN ss_sport ON ss_news.sport_id = ss_sport.sport_id ";
  query += " WHERE tag_id = ? ";
  query += " ORDER BY `ss_news`.create_date DESC ";
  query += " LIMIT 100 ";

  var data_for_query = [];
  var data_list = [];
  var id = item["tag_id"];

  data_for_query.push(id);

  mysql_connection.query(
    {
      sql: query,
      timeout: 2000, //2 Sec.
      values: data_for_query
    },
    function(error, result) {
      if (error) {
        log.error("[500] GetTagNews Service: " + error);
        callback(500, error);
      } else {
        if (!utils.isEmptyObject(result) && result.length > 0) {
          for (var i = 0; i < result.length; i++) {
            var obj = result[i];
            obj.thumbnail = obj.folder + "/" + obj.file_name;
            obj.types = "news";
            obj.relate_id = obj.id;
            obj.picture = obj.thumbnail;
            result[i] = obj;
            data_list.push(obj);
          }
          callback(
            null,
            redisCluster,
            memcached,
            mysql_connection,
            key,
            item,
            data_list
          );
        } else {
          callback(
            null,
            redisCluster,
            memcached,
            mysql_connection,
            key,
            item,
            data_list
          );
        }
      }
    }
  );
}

function getTag(
  redisCluster,
  memcached,
  mysql_connection,
  key,
  keyword,
  callback
) {
  var query = "SELECT tag_id, tag_text ";
  query = query + " FROM `ss_tag` ";
  query = query + " WHERE `ss_tag`.tag_text = ? AND `ss_tag`.status = 1 ";
  query = query + " LIMIT 1 ";

  var data_for_query = [];
  data_for_query.push(keyword);

  mysql_connection.query(
    {
      sql: query,
      timeout: 2000, //2 Sec.
      values: data_for_query
    },
    function(error, result) {
      if (error) {
        log.error("[500] GetTag Service: " + error);
        callback(500, error);
      } else {
        if (!utils.isEmptyObject(result) && result.length > 0) {
          callback(
            null,
            redisCluster,
            memcached,
            mysql_connection,
            key,
            result[0]
          );
        } else {
          callback(404, "Data not found.");
        }
      }
    }
  );
}

function prepareWaterfall(
  res,
  redisCluster,
  memcached,
  key,
  keyword,
  page,
  page_limit,
  cache
) {
  var mysql_connection = config.getMySQLConnection();
  mysql_connection.connect(function(err) {
    if (err) {
      mysql_connection.end();
      log.error("[500] GetTag Service - prepareWaterfall: " + err);
      utils.printJSON(res, utils.getJSONObject(500, err, null));
    } else {
      var method_arr = [];
      method_arr.push(
        async.apply(
          getTag,
          redisCluster,
          memcached,
          mysql_connection,
          key,
          keyword
        )
      );
      method_arr.push(setTagNews);
      method_arr.push(setTagColumn);
      method_arr.push(setTagClip);
      method_arr.push(setData2Memcached);
      method_arr.push(setData2RedisCluster);
      async.waterfall(method_arr, function(err, result) {
        mysql_connection.end();
        mysql_connection = null;
        if (redisCluster != null) {
          redisCluster.disconnect();
          redisCluster = null;
        }
        if (memcached != null) {
          memcached.end();
          memcached = null;
        }
        if (err) {
          if (err == 200) {
            utils.printJSON(res, utils.getJSONObject(200, "Success", result));
          } else {
            utils.printJSON(res, utils.getJSONObject(err, result, null));
          }
        } else {
          //utils.printJSON(res, utils.getJSONObject(200, "Success", result));
          var output = [];
          var icount = 0;
          var paging = 0;
          var row = 0;
          if (result != null) {
            row = result.length;
          }
          if (row > 0) {
            result.sort(function(a, b) {
              return a.create_date < b.create_date;
            });
          }
          if (page <= 1) {
            page = 0;
            paging = 1;
          } else {
            paging = parseInt(page);
            page = Math.ceil(page * page_limit) - page_limit;
          }
          for (var i = page; i < row; i++) {
            if (icount < page_limit) {
              output.push(result[i]);
            } else {
              i = row;
            }
            icount += 1;
          }
          var page_total = Math.ceil(row / page_limit);
          if (
            typeof output != "undefined" &&
            output != null &&
            output.length > 0
          ) {
            //utils.printJSON(res, utils.getJSONObject(200, "Success", output));
            var jsonObj = utils.getJSONPaginationObject(
              200,
              "Success",
              output,
              paging,
              page_total,
              row
            );
            var jsonStr = JSON.stringify(jsonObj);
            utils.printJSON(res, jsonObj);
          } else {
            utils.printJSON(
              res,
              utils.getJSONObject(400, "Data not found.", [])
            );
          }
          clearGarbageCollection();
        }
      });
    }
  });
}

function getDataFromRedisCluster(res, keyword, page, page_limit, clear_cache) {
  var key = cache_key + keyword;
  GKey = key;
  var redisCluster = config.getRedisCluster();
  redisCluster.once("connect", function() {
    redisCluster.exists(key, function(err, reply) {
      if (err) {
        redisCluster.disconnect();
        utils.printJSON(res, utils.getJSONObject(500, err.stack, null));
        throw new Error(err.stack);
      } else {
        if (reply == true) {
          if (clear_cache == true) {
            redisCluster.del(key);
            prepareWaterfall(
              res,
              redisCluster,
              null,
              key,
              keyword,
              page,
              page_limit,
              clear_cache
            );
          } else {
            redisCluster.get(key, function(error, reply) {
              if (error) {
                log.error("[500] GetTag Service: " + error);
                prepareWaterfall(
                  res,
                  redisCluster,
                  null,
                  key,
                  keyword,
                  page,
                  page_limit,
                  clear_cache
                );
              } else {
                if (reply != "" && reply != undefined) {
                  var json = JSON.parse(reply);
                  redisCluster.disconnect();
                  //console.log("redis : " + key);
                  printOut(res, json, page, page_limit);
                  //utils.printJSON(res, utils.getJSONObject(200, "Success", json));
                } else {
                  prepareWaterfall(
                    res,
                    redisCluster,
                    null,
                    key,
                    keyword,
                    page,
                    page_limit,
                    clear_cache
                  );
                }
              }
            });
          }
        } else {
          prepareWaterfall(
            res,
            redisCluster,
            null,
            key,
            keyword,
            page,
            page_limit,
            clear_cache
          );
        }
      }
    });
  });

  redisCluster.once("error", function(err) {
    log.error(logger + err);
    redisCluster.disconnect();
    redisCluster = null;
    prepareWaterfall(
      res,
      redisCluster,
      null,
      key,
      keyword,
      page,
      page_limit,
      clear_cache
    );
  });
}

router.get("/", function(req, res, next) {
  utils.printJSON(res, utils.getJSONObject(404, "Not Found Function ", null));
});

router.get("/:keyword", function(req, res, next) {
  //getDataFromRedisCluster(res, req.params.keyword, 1, 11, false);
  prepareWaterfall(res, null, null, null, req.params.keyword, 1, 11, false);
});

router.get("/:keyword/:clear", function(req, res, next) {
  var cache = false;
  if (req.params.clear == "clear") {
    cache = true;
  }
  //getDataFromRedisCluster(res, req.params.keyword, 1, 11, cache);
  prepareWaterfall(res, null, null, null, req.params.keyword, 1, 11, false);
});

router.get("/:keyword/:page_limit/:page", function(req, res, next) {
  //getDataFromRedisCluster(res, req.params.keyword, req.params.page, req.params.page_limit, false);
  prepareWaterfall(
    res,
    null,
    null,
    null,
    req.params.keyword,
    req.params.page,
    req.params.page_limit,
    false
  );
});

module.exports = router;
