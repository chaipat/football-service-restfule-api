var express = require("express");
var config = require("../config/index");
var utils = require("../utils/index");
var log = require("../logging/index");
var request = require("request");
var dateFormat = require("dateformat");
var async = require("async");

var redisCluster = config.getRedisCluster();
var mysql_connection = config.getMySQLConnection();
var redisCaching = require("./redisCaching");
var mysqlModule = require("./mysqlModule");
var cacheKeyPrefix =
  config.getKeyType() + config.getKeyPrefix() + config.getKeyProjectName();

var newsModule = newsModule.prototype;

function newsModule() {}

//Gateway Seagame
newsModule.getGatewaySeagame = function(req, res, next) {
  var clearCache = req.query.clearCache;
  var errorCode = 500;
  var cacheKey = cacheKeyPrefix + "gateway-seagame";

  if (clearCache === "" || typeof clearCache === "undefined") {
    clearCache = false;
  }

  if (clearCache) {
    redisCaching.deleteCache(res, cacheKey, function(error, reply) {
      if (error) {
        return utils.printJSON(
          res,
          utils.getJSONObject(errorCode, error.stack, null)
        );
      } else {
        if (reply) {
          return utils.printJSON(
            res,
            utils.getJSONObject(
              200,
              {
                status: "success",
                cache: "cache deleted",
                cache_key: cacheKey
              },
              null
            )
          );
        } else {
          return utils.printJSON(
            res,
            utils.getJSONObject(
              200,
              {
                status: "fail",
                description:
                  "KEY " + cacheKey + " does not exist or already deleted."
              },
              null
            )
          );
        }
      }
    });
  } else {
    redisCaching.cacheExist(res, cacheKey, function(error, reply) {
      if (error) {
        return utils.printJSON(
          res,
          utils.getJSONObject(errorCode, error.stack, null)
        );
      } else {
        if (reply) {
          redisCaching.getCache(res, cacheKey, function(error, result) {
            if (error) {
              return utils.printJSON(
                res,
                utils.getJSONObject(errorCode, error.stack, null)
              );
            } else {
              var json = JSON.parse(result);
              return utils.printJSON(
                res,
                utils.getJSONObject(
                  200,
                  {
                    status: "success",
                    cache: "cached redis",
                    cache_key: cacheKey
                  },
                  json
                )
              );
            }
          });
        } else {
          var data = {};
          var listNews = {};
          var listColumn = {};
          var categoryContents = [];

          async.series(
            [
              function(callback) {
                // get news
                var query =
                  "SELECT `highlight_id`, `news_id`, `order_by`, `title`, `thumbnail`, ";
                query +=
                  " `icon_pic`, `icon_vdo`, `status`, DATE_FORMAT(`create_date`, '%d-%m-%Y %H:%m') as create_date, ";
                query +=
                  " DATE_FORMAT(`lastupdate_date`, '%d-%m-%Y %H:%m') as lastupdate_date ";
                query += " FROM `ss_seagames_home_news` ";
                query += " ORDER BY order_by ASC ";
                query += " LIMIT 3 ";

                mysqlModule.getData(query, function(error, result) {
                  if (error) return callback(error);
                  data = result;

                  for (var i in data) {
                    var picType = "news";
                    var picture_size = {
                      fullsize: picType + "/" + data[i]["thumbnail"],
                      size128: "size128" + "/" + data[i]["thumbnail"],
                      size224: "size224" + "/" + data[i]["thumbnail"],
                      size304: "size304" + "/" + data[i]["thumbnail"],
                      size640: "size640" + "/" + data[i]["thumbnail"]
                    };
                    data[i].picture_size = picture_size;
                    data[i].types = "news";
                  }

                  listNews = data;
                  callback();
                });
              },
              function(callback) {
                redisCaching.saveCache(res, cacheKey, data, function(
                  error,
                  response
                ) {
                  if (error) return callback(error);
                  callback();
                });
              }
            ],
            function(error) {
              if (error) {
                return utils.printJSON(
                  res,
                  utils.getJSONObject(errorCode, error.message, null)
                );
              } else {
                return utils.printJSON(
                  res,
                  utils.getJSONObject(
                    200,
                    {
                      status: "success",
                      cache: "redis",
                      cache_key: cacheKey
                    },
                    data
                  )
                );
              }
            }
          );
        }
      }
    });
  }
};

// PR news
newsModule.getNewsByType = function(req, res, next) {
  var typeId = req.query.id;
  var param_page = req.query.page;
  var clearCache = req.query.clearCache;
  var errorCode = 500;

  if (clearCache === "" || typeof clearCache === "undefined") {
    clearCache = false;
  }

  if (param_page === null || isNaN(param_page)) {
    param_page = 0;
  }

  if (isNaN(typeId)) {
    return utils.printJSON(
      res,
      utils.getJSONObject(400, { status: "wrong parameter" }, null)
    );
  } else {
    var cacheKey =
      cacheKeyPrefix + "category-news-byType-" + typeId + "-" + param_page;
  }

  if (clearCache) {
    redisCaching.deleteCache(res, cacheKey, function(error, reply) {
      if (error) {
        return utils.printJSON(
          res,
          utils.getJSONObject(errorCode, error.stack, null)
        );
      } else {
        if (reply) {
          return utils.printJSON(
            res,
            utils.getJSONObject(
              200,
              {
                status: "success",
                cache: "cache deleted",
                cache_key: cacheKey
              },
              null
            )
          );
        } else {
          return utils.printJSON(
            res,
            utils.getJSONObject(
              200,
              {
                status: "fail",
                description:
                  "KEY " + cacheKey + " does not exist or already deleted."
              },
              null
            )
          );
        }
      }
    });
  } else {
    redisCaching.cacheExist(res, cacheKey, function(error, reply) {
      if (error) {
        return utils.printJSON(
          res,
          utils.getJSONObject(errorCode, error.stack, null)
        );
      } else {
        if (reply) {
          redisCaching.getCache(res, cacheKey, function(error, result) {
            if (error) {
              return utils.printJSON(
                res,
                utils.getJSONObject(errorCode, error.stack, null)
              );
            } else {
              var json = JSON.parse(result);
              return utils.printJSON(
                res,
                utils.getJSONObject(
                  200,
                  {
                    status: "success",
                    cache: "cached redis",
                    cache_key: cacheKey
                  },
                  json
                )
              );
            }
          });
        } else {
          var data = {};
          var listNews = {};
          var listVideo = {};
          var categoryContents = [];
          var offset = 0;
          var offsetVideo = 0;
          var totalNewsPage = 0;
          var totalVideoPage = 0;
          var param_page_limit = 10;

          async.series(
            [
              function(callback) {
                // get page of news
                var query =
                  "SELECT count(news_id) as row \
                FROM ss_news WHERE (status=1 AND approve=1 AND lang='th') \
                AND news_type_id = " +
                  typeId;

                mysqlModule.getData(query, function(error, result) {
                  if (error) return callback(error);
                  var resultObject = result[0];
                  var row = resultObject["row"];

                  var page_total = Math.ceil(row / param_page_limit);
                  totalNewsPage = page_total;
                  if (param_page > page_total) {
                    //errorCode = 400;
                    //error = new Error('News over page limit.')
                    //callback(error);
                    offset = -1;
                    callback();
                  } else {
                    offset =
                      param_page == 0
                        ? param_page
                        : (param_page - 1) * param_page_limit;
                    callback();
                  }
                });
              },
              /*
              function(callback) { // get page of video
                var query = "SELECT count(video_id2) as row \
                FROM ss_video WHERE (status=1 AND approve=1 AND lang='th') \
                AND sport_id = " + sportId

                mysqlModule.getData(query, function(error, result) {
                  if(error) return callback(error);
                  var resultObject = result[0];
                  var row = resultObject["row"];

                  var page_total = Math.ceil(row / param_page_limit);
                  totalVideoPage = page_total;
                  if(param_page > page_total ) {
                    //errorCode = 400;
                    //error = new Error('Video over page limit.')
                    //callback(error);
                    offsetVideo = -1;
                    callback();
                  } else {
                    offsetVideo = (param_page == 0)? param_page : (param_page-1) * param_page_limit;
                    callback();
                  }
                });
              },
              */
              function(callback) {
                // get news
                if (offset === -1) {
                  callback();
                } else {
                  var query =
                    "SELECT ss_n.news_id2 as news_id, ss_n.icon_pic, ss_n.icon_vdo, ss_n.title, \
                  ss_n.lastupdate_date, ss_n.countview, ss_n.share,\
                  ss_p.folder, ss_p.file_name, ss_p.ref_type as picture_type \
                  FROM ss_news ss_n \
                  LEFT JOIN ss_picture ss_p \
                  ON ss_n.news_id2 = ss_p.ref_id \
                  WHERE ss_n.news_type_id = " +
                    typeId +
                    " \
                  AND ss_p.ref_type = 1 \
                  AND ss_p.default = 1 \
                  AND ss_n.status = 1 \
                  AND ss_n.approve = 1 \
                  ORDER BY ss_n.lastupdate_date DESC " +
                    " LIMIT " +
                    offset +
                    ", " +
                    param_page_limit;

                  mysqlModule.getData(query, function(error, result) {
                    if (error) return callback(error);
                    data = result;

                    for (var i in data) {
                      var picType = "news";
                      var picture_size = {
                        fullsize:
                          picType +
                          "/" +
                          data[i]["folder"] +
                          "/" +
                          data[i]["file_name"],
                        size128:
                          "size128/" +
                          data[i]["folder"] +
                          "/" +
                          data[i]["file_name"],
                        size224:
                          "size224/" +
                          data[i]["folder"] +
                          "/" +
                          data[i]["file_name"],
                        size304:
                          "size304/" +
                          data[i]["folder"] +
                          "/" +
                          data[i]["file_name"],
                        size640:
                          "size640/" +
                          data[i]["folder"] +
                          "/" +
                          data[i]["file_name"]
                      };
                      data[i].picture_size = picture_size;
                      data[i].types = "news";
                    }

                    //listNews = data;
                    callback();
                  });
                }
              },
              /*
              function(callback) { // get Video
                if (offsetVideo === -1) {
                  callback();
                } else {
                  var query = 'SELECT sv.video_id2 as news_id, sv.title, sv.lastupdate_date, \
                  sv.countview, sv.share, \
                  ss_t.tournament_id, ss_t.sport_id, ss_t.tournament_name_th, ss_t.tournament_name_en, \
                  ss_s.sport_name_th, ss_s.sport_name_en, \
                  ss_t.url as tournament_url, ss_t.dimension as tournament_dimension, \
                  ss_s.url as sport_url, ss_s.dimension as sport_dimension, \
                  ss_p.folder, ss_p.file_name, ss_p.ref_type as picture_type \
                  FROM ss_video sv \
                  LEFT JOIN ss_tournament ss_t \
                  ON sv.tournament_id = ss_t.tournament_id \
                  LEFT JOIN ss_sport ss_s \
                  ON sv.sport_id = ss_s.sport_id \
                  LEFT JOIN ss_picture ss_p \
                  ON sv.video_id2 = ss_p.ref_id \
                  WHERE sv.sport_id = ' + sportId + ' \
                  AND ss_p.ref_type = 4 \
                  AND ss_p.default = 1 \
                  AND sv.status = 1 \
                  AND sv.approve = 1 \
                  ORDER BY sv.lastupdate_date DESC ' + ' LIMIT ' + offsetVideo + ', ' + param_page_limit;

                  mysqlModule.getData(query, function(error, result) {
                      if(error) return callback(error);
                      data = result;

                      for(var i in data) {
                          var picType = 'vdo';
                          var picture_size = {
                              'fullsize': picType + '/' + data[i]['folder'] + '/' + data[i]['file_name'],
                            'size128': 'size128/' + data[i]['folder'] + '/' + data[i]['file_name'],
                            'size224': 'size224/' + data[i]['folder'] + '/' + data[i]['file_name'],
                            'size304': 'size304/' + data[i]['folder'] + '/' + data[i]['file_name'],
                            'size640': 'size640/' + data[i]['folder'] + '/' + data[i]['file_name']
                          };
                          data[i].picture_size = picture_size;
                          data[i].types = 'vdo';
                      }
                      listVideo = data;
                      callback();
                  });

                }

              },

              function(callback) { // merge 2 object and sort date

                if (offsetVideo !== -1) {
                  listVideo.forEach((item, index) => {categoryContents.push(item)});
                }

                if (offset !== -1) {
                  listNews.forEach((item, index) => {categoryContents.push(item)});
                }

                if (!utils.isEmptyObject(categoryContents)) {
                  data = categoryContents.sort((a, b) => {
                    return new Date(b.lastupdate_date) - new Date(a.lastupdate_date)
                  });
                  callback();
                } else {
                  errorCode = 400;
                  error = new Error('Over page limit');
                  callback(error);
                }

              },
              */
              function(callback) {
                redisCaching.saveCache(res, cacheKey, data, function(
                  error,
                  response
                ) {
                  if (error) return callback(error);
                  callback();
                });
              }
            ],
            function(error) {
              if (error) {
                return utils.printJSON(
                  res,
                  utils.getJSONObject(errorCode, error.message, null)
                );
              } else {
                return utils.printJSON(
                  res,
                  utils.getJSONObject(
                    200,
                    {
                      status: "success",
                      cache: "redis",
                      cache_key: cacheKey,
                      offset: offset,
                      "total news page": totalNewsPage,
                      "total video page": totalVideoPage
                    },
                    data
                  )
                );
              }
            }
          );
        }
      }
    });
  }
};

newsModule.getSportNews = function(req, res, next) {
  var sportId = req.query.sportId;
  var param_page = req.query.page;
  var clearCache = req.query.clearCache;
  var errorCode = 500;

  if (clearCache === "" || typeof clearCache === "undefined") {
    clearCache = false;
  }

  if (param_page === null || isNaN(param_page)) {
    param_page = 0;
  }

  if (isNaN(sportId)) {
    return utils.printJSON(
      res,
      utils.getJSONObject(400, { status: "wrong parameter" }, null)
    );
  } else {
    var cacheKey =
      cacheKeyPrefix + "category-news-sport-" + sportId + "-" + param_page;
  }

  if (clearCache) {
    redisCaching.deleteCache(res, cacheKey, function(error, reply) {
      if (error) {
        return utils.printJSON(
          res,
          utils.getJSONObject(errorCode, error.stack, null)
        );
      } else {
        if (reply) {
          return utils.printJSON(
            res,
            utils.getJSONObject(
              200,
              {
                status: "success",
                cache: "cache deleted",
                cache_key: cacheKey
              },
              null
            )
          );
        } else {
          return utils.printJSON(
            res,
            utils.getJSONObject(
              200,
              {
                status: "fail",
                description:
                  "KEY " + cacheKey + " does not exist or already deleted."
              },
              null
            )
          );
        }
      }
    });
  } else {
    redisCaching.cacheExist(res, cacheKey, function(error, reply) {
      if (error) {
        return utils.printJSON(
          res,
          utils.getJSONObject(errorCode, error.stack, null)
        );
      } else {
        if (reply) {
          redisCaching.getCache(res, cacheKey, function(error, result) {
            if (error) {
              return utils.printJSON(
                res,
                utils.getJSONObject(errorCode, error.stack, null)
              );
            } else {
              var json = JSON.parse(result);
              return utils.printJSON(
                res,
                utils.getJSONObject(
                  200,
                  {
                    status: "success",
                    cache: "cached redis",
                    cache_key: cacheKey
                  },
                  json
                )
              );
            }
          });
        } else {
          var data = {};
          var listNews = {};
          var listVideo = {};
          var categoryContents = [];
          var offset = 0;
          var offsetVideo = 0;
          var totalNewsPage = 0;
          var totalVideoPage = 0;
          var param_page_limit = 10;

          async.series(
            [
              function(callback) {
                // get page of news
                var query =
                  "SELECT count(news_id) as row \
                FROM ss_news WHERE (status=1 AND approve=1 AND lang='th') \
                AND sport_id = " +
                  sportId;

                mysqlModule.getData(query, function(error, result) {
                  if (error) return callback(error);
                  var resultObject = result[0];
                  var row = resultObject["row"];

                  var page_total = Math.ceil(row / param_page_limit);
                  totalNewsPage = page_total;
                  if (param_page > page_total) {
                    //errorCode = 400;
                    //error = new Error('News over page limit.')
                    //callback(error);
                    offset = -1;
                    callback();
                  } else {
                    offset =
                      param_page == 0
                        ? param_page
                        : (param_page - 1) * param_page_limit;
                    callback();
                  }
                });
              },
              function(callback) {
                // get page of video
                var query =
                  "SELECT count(video_id2) as row \
                FROM ss_video WHERE (status=1 AND approve=1 AND lang='th') \
                AND sport_id = " +
                  sportId;

                mysqlModule.getData(query, function(error, result) {
                  if (error) return callback(error);
                  var resultObject = result[0];
                  var row = resultObject["row"];

                  var page_total = Math.ceil(row / param_page_limit);
                  totalVideoPage = page_total;
                  if (param_page > page_total) {
                    //errorCode = 400;
                    //error = new Error('Video over page limit.')
                    //callback(error);
                    offsetVideo = -1;
                    callback();
                  } else {
                    offsetVideo =
                      param_page == 0
                        ? param_page
                        : (param_page - 1) * param_page_limit;
                    callback();
                  }
                });
              },
              function(callback) {
                // get news
                if (offset === -1) {
                  callback();
                } else {
                  var query =
                    "SELECT ss_n.news_id2 as news_id, ss_n.icon_pic, ss_n.icon_vdo, ss_n.title, \
                  ss_n.lastupdate_date, ss_n.countview, ss_n.share,\
                  ss_t.tournament_id, ss_t.tournament_name_th, ss_t.tournament_name_en, ss_t.domain, \
                  ss_s.sport_id, ss_s.sport_name_th, ss_s.sport_name_en, \
                  ss_t.url as tournament_url, ss_t.dimension as tournament_dimension, \
                  ss_s.url as sport_url, ss_s.dimension as sport_dimension, \
                  ss_p.folder, ss_p.file_name, ss_p.ref_type as picture_type \
                  FROM ss_news ss_n \
                  LEFT JOIN ss_tournament ss_t \
                  ON ss_n.tournament_id = ss_t.tournament_id \
                  LEFT JOIN ss_sport ss_s \
                  ON ss_n.sport_id = ss_s.sport_id \
                  LEFT JOIN ss_picture ss_p \
                  ON ss_n.news_id2 = ss_p.ref_id \
                  WHERE ss_n.sport_id = " +
                    sportId +
                    " \
                  AND ss_p.ref_type = 1 \
                  AND ss_p.default = 1 \
                  AND ss_n.status = 1 \
                  AND ss_n.approve = 1 \
                  ORDER BY ss_n.lastupdate_date DESC " +
                    " LIMIT " +
                    offset +
                    ", " +
                    param_page_limit;

                  mysqlModule.getData(query, function(error, result) {
                    if (error) return callback(error);
                    data = result;

                    for (var i in data) {
                      var picType = "news";
                      var picture_size = {
                        fullsize:
                          picType +
                          "/" +
                          data[i]["folder"] +
                          "/" +
                          data[i]["file_name"],
                        size128:
                          "size128/" +
                          data[i]["folder"] +
                          "/" +
                          data[i]["file_name"],
                        size224:
                          "size224/" +
                          data[i]["folder"] +
                          "/" +
                          data[i]["file_name"],
                        size304:
                          "size304/" +
                          data[i]["folder"] +
                          "/" +
                          data[i]["file_name"],
                        size640:
                          "size640/" +
                          data[i]["folder"] +
                          "/" +
                          data[i]["file_name"]
                      };
                      data[i].picture_size = picture_size;
                      data[i].types = "news";
                    }

                    listNews = data;
                    callback();
                  });
                }
              },
              function(callback) {
                // get Video
                if (offsetVideo === -1) {
                  callback();
                } else {
                  var query =
                    "SELECT sv.video_id2 as news_id, sv.title, sv.lastupdate_date, \
                  sv.countview, sv.share, \
                  ss_t.tournament_id, ss_t.sport_id, ss_t.tournament_name_th, ss_t.tournament_name_en, \
                  ss_s.sport_name_th, ss_s.sport_name_en, \
                  ss_t.url as tournament_url, ss_t.dimension as tournament_dimension, \
                  ss_s.url as sport_url, ss_s.dimension as sport_dimension, \
                  ss_p.folder, ss_p.file_name, ss_p.ref_type as picture_type \
                  FROM ss_video sv \
                  LEFT JOIN ss_tournament ss_t \
                  ON sv.tournament_id = ss_t.tournament_id \
                  LEFT JOIN ss_sport ss_s \
                  ON sv.sport_id = ss_s.sport_id \
                  LEFT JOIN ss_picture ss_p \
                  ON sv.video_id2 = ss_p.ref_id \
                  WHERE sv.sport_id = " +
                    sportId +
                    " \
                  AND ss_p.ref_type = 4 \
                  AND ss_p.default = 1 \
                  AND sv.status = 1 \
                  AND sv.approve = 1 \
                  ORDER BY sv.lastupdate_date DESC " +
                    " LIMIT " +
                    offsetVideo +
                    ", " +
                    param_page_limit;

                  mysqlModule.getData(query, function(error, result) {
                    if (error) return callback(error);
                    data = result;

                    for (var i in data) {
                      var picType = "vdo";
                      var picture_size = {
                        fullsize:
                          picType +
                          "/" +
                          data[i]["folder"] +
                          "/" +
                          data[i]["file_name"],
                        size128:
                          "size128/" +
                          data[i]["folder"] +
                          "/" +
                          data[i]["file_name"],
                        size224:
                          "size224/" +
                          data[i]["folder"] +
                          "/" +
                          data[i]["file_name"],
                        size304:
                          "size304/" +
                          data[i]["folder"] +
                          "/" +
                          data[i]["file_name"],
                        size640:
                          "size640/" +
                          data[i]["folder"] +
                          "/" +
                          data[i]["file_name"]
                      };
                      data[i].picture_size = picture_size;
                      data[i].types = "vdo";
                    }
                    listVideo = data;
                    callback();
                  });
                }
              },
              function(callback) {
                // merge 2 object and sort date

                if (offsetVideo !== -1) {
                  listVideo.forEach((item, index) => {
                    categoryContents.push(item);
                  });
                }

                if (offset !== -1) {
                  listNews.forEach((item, index) => {
                    categoryContents.push(item);
                  });
                }

                if (!utils.isEmptyObject(categoryContents)) {
                  data = categoryContents.sort((a, b) => {
                    return (
                      new Date(b.lastupdate_date) - new Date(a.lastupdate_date)
                    );
                  });
                  callback();
                } else {
                  errorCode = 400;
                  error = new Error("Over page limit");
                  callback(error);
                }
              },
              function(callback) {
                redisCaching.saveCache(res, cacheKey, data, function(
                  error,
                  response
                ) {
                  if (error) return callback(error);
                  callback();
                });
              }
            ],
            function(error) {
              if (error) {
                return utils.printJSON(
                  res,
                  utils.getJSONObject(errorCode, error.message, null)
                );
              } else {
                return utils.printJSON(
                  res,
                  utils.getJSONObject(
                    200,
                    {
                      status: "success",
                      cache: "redis",
                      cache_key: cacheKey,
                      offset: offset,
                      "total news page": totalNewsPage,
                      "total video page": totalVideoPage
                    },
                    data
                  )
                );
              }
            }
          );
        }
      }
    });
  }
};

newsModule.getTournamentNews = function(req, res, next) {
  var tournamentId = req.query.tournamentId;
  var param_page = req.query.page;
  var clearCache = req.query.clearCache;
  var errorCode = 500;

  if (clearCache === "" || typeof clearCache === "undefined") {
    clearCache = false;
  }

  if (param_page === null || isNaN(param_page)) {
    param_page = 0;
  }

  if (isNaN(tournamentId)) {
    return utils.printJSON(
      res,
      utils.getJSONObject(400, { status: "wrong parameter" }, null)
    );
  } else {
    var cacheKey =
      cacheKeyPrefix +
      "category-news-tournament-" +
      tournamentId +
      "-" +
      param_page;
  }

  if (clearCache) {
    redisCaching.deleteCache(res, cacheKey, function(error, reply) {
      if (error) {
        return utils.printJSON(
          res,
          utils.getJSONObject(errorCode, error.stack, null)
        );
      } else {
        if (reply) {
          return utils.printJSON(
            res,
            utils.getJSONObject(
              200,
              {
                status: "success",
                cache: "cache deleted",
                cache_key: cacheKey
              },
              null
            )
          );
        } else {
          return utils.printJSON(
            res,
            utils.getJSONObject(
              200,
              {
                status: "fail",
                description:
                  "KEY " + cacheKey + " does not exist or already deleted."
              },
              null
            )
          );
        }
      }
    });
  } else {
    redisCaching.cacheExist(res, cacheKey, function(error, reply) {
      if (error) {
        return utils.printJSON(
          res,
          utils.getJSONObject(errorCode, error.stack, null)
        );
      } else {
        if (reply) {
          redisCaching.getCache(res, cacheKey, function(error, result) {
            if (error) {
              return utils.printJSON(
                res,
                utils.getJSONObject(errorCode, error.stack, null)
              );
            } else {
              var json = JSON.parse(result);
              return utils.printJSON(
                res,
                utils.getJSONObject(
                  200,
                  {
                    status: "success",
                    cache: "cached redis",
                    cache_key: cacheKey
                  },
                  json
                )
              );
            }
          });
        } else {
          var data = {};
          var listNews = {};
          var listVideo = {};
          var categoryContents = [];
          var offset = 0;
          var offsetVideo = 0;
          var totalNewsPage = 0;
          var totalVideoPage = 0;
          var param_page_limit = 10;

          async.series(
            [
              function(callback) {
                // get page of news
                var query =
                  "SELECT count(news_id) as row \
                FROM ss_news WHERE (status=1 AND approve=1 AND lang='th') \
                AND tournament_id = " +
                  tournamentId;

                mysqlModule.getData(query, function(error, result) {
                  if (error) return callback(error);
                  var resultObject = result[0];
                  var row = resultObject["row"];

                  var page_total = Math.ceil(row / param_page_limit);
                  totalNewsPage = page_total;
                  if (param_page > page_total) {
                    //errorCode = 400;
                    //error = new Error('News over page limit.')
                    //callback(error);
                    offset = -1;
                    callback();
                  } else {
                    offset =
                      param_page == 0
                        ? param_page
                        : (param_page - 1) * param_page_limit;
                    callback();
                  }
                });
              },
              function(callback) {
                // get page of video
                var query =
                  "SELECT count(video_id2) as row \
                FROM ss_video WHERE (status=1 AND approve=1 AND lang='th') \
                AND tournament_id = " +
                  tournamentId;

                mysqlModule.getData(query, function(error, result) {
                  if (error) return callback(error);
                  var resultObject = result[0];
                  var row = resultObject["row"];

                  var page_total = Math.ceil(row / param_page_limit);
                  totalVideoPage = page_total;
                  if (param_page > page_total) {
                    //errorCode = 400;
                    //error = new Error('Video over page limit.')
                    //callback(error);
                    offsetVideo = -1;
                    callback();
                  } else {
                    offsetVideo =
                      param_page == 0
                        ? param_page
                        : (param_page - 1) * param_page_limit;
                    callback();
                  }
                });
              },
              function(callback) {
                // get news
                if (offset === -1) {
                  callback();
                } else {
                  var query =
                    "SELECT ss_n.news_id2 as news_id,ss_n.news_special_id, ss_n.icon_pic, ss_n.icon_vdo, ss_n.title, \
                  ss_n.create_date, ss_n.lastupdate_date, ss_n.proof_date, ss_n.approve_date, ss_n.countview, ss_n.share,\
                  ss_t.tournament_id, ss_t.sport_id, ss_t.tournament_name_th, ss_t.tournament_name_en, \
                  ss_s.sport_name_th, ss_s.sport_name_en, \
                  ss_t.url as tournament_url, ss_t.dimension as tournament_dimension, \
                  ss_s.url as sport_url, ss_s.dimension as sport_dimension, \
                  ss_p.folder, ss_p.file_name, ss_p.ref_type as picture_type \
                  FROM ss_news ss_n \
                  LEFT JOIN ss_tournament ss_t \
                  ON ss_n.tournament_id = ss_t.tournament_id \
                  LEFT JOIN ss_sport ss_s \
                  ON ss_n.sport_id = ss_s.sport_id \
                  LEFT JOIN ss_picture ss_p \
                  ON ss_n.news_id2 = ss_p.ref_id \
                  WHERE ss_n.tournament_id = " +
                    tournamentId +
                    " \
                  AND ss_p.ref_type = 1 \
                  AND ss_p.default = 1 \
                  AND ss_n.status = 1 \
                  AND ss_n.approve = 1 \
                  ORDER BY ss_n.approve_date DESC " +
                    " LIMIT " +
                    offset +
                    ", " +
                    param_page_limit;

                  mysqlModule.getData(query, function(error, result) {
                    if (error) return callback(error);
                    data = result;

                    for (var i in data) {
                      var picType = "news";
                      var picture_size = {
                        fullsize:
                          picType +
                          "/" +
                          data[i]["folder"] +
                          "/" +
                          data[i]["file_name"],
                        size128:
                          "size128/" +
                          data[i]["folder"] +
                          "/" +
                          data[i]["file_name"],
                        size224:
                          "size224/" +
                          data[i]["folder"] +
                          "/" +
                          data[i]["file_name"],
                        size304:
                          "size304/" +
                          data[i]["folder"] +
                          "/" +
                          data[i]["file_name"],
                        size640:
                          "size640/" +
                          data[i]["folder"] +
                          "/" +
                          data[i]["file_name"]
                      };
                      data[i].picture_size = picture_size;
                      data[i].types = "news";
                    }

                    listNews = data;
                    callback();
                  });
                }
              },
              function(callback) {
                // get Video
                if (offsetVideo === -1) {
                  callback();
                } else {
                  var query =
                    "SELECT sv.video_id2 as news_id, sv.title, sv.lastupdate_date, sv.lastupdate_date as approve_date, \
                  sv.countview, sv.share, \
                  ss_t.tournament_id, ss_t.sport_id, ss_t.tournament_name_th, ss_t.tournament_name_en, \
                  ss_s.sport_name_th, ss_s.sport_name_en, \
                  ss_t.url as tournament_url, ss_t.dimension as tournament_dimension, \
                  ss_s.url as sport_url, ss_s.dimension as sport_dimension, \
                  ss_p.folder, ss_p.file_name, ss_p.ref_type as picture_type \
                  FROM ss_video sv \
                  LEFT JOIN ss_tournament ss_t \
                  ON sv.tournament_id = ss_t.tournament_id \
                  LEFT JOIN ss_sport ss_s \
                  ON sv.sport_id = ss_s.sport_id \
                  LEFT JOIN ss_picture ss_p \
                  ON sv.video_id2 = ss_p.ref_id \
                  WHERE sv.tournament_id = " +
                    tournamentId +
                    " \
                  AND ss_p.ref_type = 4 \
                  AND ss_p.default = 1 \
                  AND sv.status = 1 \
                  AND sv.approve = 1 \
                  ORDER BY sv.lastupdate_date DESC " +
                    " LIMIT " +
                    offsetVideo +
                    ", " +
                    param_page_limit;

                  mysqlModule.getData(query, function(error, result) {
                    if (error) return callback(error);
                    data = result;

                    for (var i in data) {
                      var picType = "vdo";
                      var picture_size = {
                        fullsize:
                          picType +
                          "/" +
                          data[i]["folder"] +
                          "/" +
                          data[i]["file_name"],
                        size128:
                          "size128/" +
                          data[i]["folder"] +
                          "/" +
                          data[i]["file_name"],
                        size224:
                          "size224/" +
                          data[i]["folder"] +
                          "/" +
                          data[i]["file_name"],
                        size304:
                          "size304/" +
                          data[i]["folder"] +
                          "/" +
                          data[i]["file_name"],
                        size640:
                          "size640/" +
                          data[i]["folder"] +
                          "/" +
                          data[i]["file_name"]
                      };
                      data[i].picture_size = picture_size;
                      data[i].types = "vdo";
                    }
                    listVideo = data;
                    callback();
                  });
                }
              },
              function(callback) {
                // merge 2 object and sort date

                if (offsetVideo !== -1) {
                  listVideo.forEach((item, index) => {
                    categoryContents.push(item);
                  });
                }

                if (offset !== -1) {
                  listNews.forEach((item, index) => {
                    categoryContents.push(item);
                  });
                }

                if (!utils.isEmptyObject(categoryContents)) {
                  data = categoryContents.sort((a, b) => {
                    //return new Date(b.lastupdate_date) - new Date(a.lastupdate_date)
                    return new Date(b.approve_date) - new Date(a.approve_date);
                  });
                  callback();
                } else {
                  errorCode = 400;
                  error = new Error("Over page limit");
                  callback(error);
                }
              },
              function(callback) {
                redisCaching.saveCache(res, cacheKey, data, function(
                  error,
                  response
                ) {
                  if (error) return callback(error);
                  callback();
                });
              }
            ],
            function(error) {
              if (error) {
                return utils.printJSON(
                  res,
                  utils.getJSONObject(errorCode, error.message, null)
                );
              } else {
                return utils.printJSON(
                  res,
                  utils.getJSONObject(
                    200,
                    {
                      status: "success",
                      cache: "redis",
                      cache_key: cacheKey,
                      offset: offset,
                      "total news page": totalNewsPage,
                      "total video page": totalVideoPage
                    },
                    data
                  )
                );
              }
            }
          );
        }
      }
    });
  }
};

newsModule.getTournamentHilight = function(req, res, next) {
  var tournamentId = req.query.tournamentId;
  var clearCache = req.query.clearCache;
  var errorCode = 500;

  if (clearCache === "" || typeof clearCache === "undefined") {
    clearCache = false;
  }

  if (isNaN(tournamentId)) {
    return utils.printJSON(
      res,
      utils.getJSONObject(400, { status: "wrong parameter" }, null)
    );
  } else {
    var cacheKey =
      cacheKeyPrefix + "category-news-tournament-hilight-" + tournamentId;
  }

  if (clearCache) {
    redisCaching.deleteCache(res, cacheKey, function(error, reply) {
      if (error) {
        return utils.printJSON(
          res,
          utils.getJSONObject(errorCode, error.stack, null)
        );
      } else {
        if (reply) {
          return utils.printJSON(
            res,
            utils.getJSONObject(
              200,
              {
                status: "success",
                cache: "cache deleted",
                cache_key: cacheKey
              },
              null
            )
          );
        } else {
          return utils.printJSON(
            res,
            utils.getJSONObject(
              200,
              {
                status: "fail",
                description:
                  "KEY " + cacheKey + " does not exist or already deleted."
              },
              null
            )
          );
        }
      }
    });
  } else {
    redisCaching.cacheExist(res, cacheKey, function(error, reply) {
      if (error) {
        return utils.printJSON(
          res,
          utils.getJSONObject(errorCode, error.stack, null)
        );
      } else {
        if (reply) {
          redisCaching.getCache(res, cacheKey, function(error, result) {
            if (error) {
              return utils.printJSON(
                res,
                utils.getJSONObject(errorCode, error.stack, null)
              );
            } else {
              var json = JSON.parse(result);
              return utils.printJSON(
                res,
                utils.getJSONObject(
                  200,
                  {
                    status: "success",
                    cache: "cached redis",
                    cache_key: cacheKey
                  },
                  json
                )
              );
            }
          });
        } else {
          var data = {};
          var listNews = {};
          var listVideo = {};

          async.series(
            [
              function(callback) {
                // get news
                var query =
                  "SELECT ss_n.news_id2 as news_id, ss_n.icon_pic, ss_n.icon_vdo, ss_n.title, \
                ss_n.lastupdate_date, ss_n.countview, ss_n.share, \
                ss_t.tournament_id, ss_t.sport_id, ss_t.tournament_name_th, ss_t.tournament_name_en, \
                ss_s.sport_name_th, ss_s.sport_name_en, \
                ss_t.url as tournament_url, ss_t.dimension as tournament_dimension, \
                ss_s.url as sport_url, ss_s.dimension as sport_dimension, \
                ss_p.folder, ss_p.file_name, ss_p.ref_type as picture_type \
                FROM ss_news ss_n \
                LEFT JOIN ss_tournament ss_t \
                ON ss_n.tournament_id = ss_t.tournament_id \
                LEFT JOIN ss_sport ss_s \
                ON ss_n.sport_id = ss_s.sport_id \
                LEFT JOIN ss_picture ss_p \
                ON ss_n.news_id2 = ss_p.ref_id \
                WHERE ss_n.tournament_id = " +
                  tournamentId +
                  " \
                AND ss_p.ref_type = 1 \
                AND ss_n.status = 1 \
                AND ss_n.approve = 1 \
                ORDER BY ss_n.lastupdate_date DESC " +
                  " LIMIT 10";

                mysqlModule.getData(query, function(error, result) {
                  if (error) return callback(error);
                  data = result;

                  for (var i in data) {
                    var picType = "news";
                    var picture_size = {
                      fullsize:
                        picType +
                        "/" +
                        data[i]["folder"] +
                        "/" +
                        data[i]["file_name"],
                      size128:
                        "size128/" +
                        data[i]["folder"] +
                        "/" +
                        data[i]["file_name"],
                      size224:
                        "size224/" +
                        data[i]["folder"] +
                        "/" +
                        data[i]["file_name"],
                      size304:
                        "size304/" +
                        data[i]["folder"] +
                        "/" +
                        data[i]["file_name"],
                      size640:
                        "size640/" +
                        data[i]["folder"] +
                        "/" +
                        data[i]["file_name"]
                    };
                    data[i].picture_size = picture_size;
                    data[i].types = "news";
                  }
                  listNews = data;
                  callback();
                });
              },
              function(callback) {
                // get Video
                var query =
                  "SELECT sv.video_id2 as news_id, sv.title, sv.lastupdate_date, \
                sv.countview, sv.share, \
                ss_t.tournament_id, ss_t.sport_id, ss_t.tournament_name_th, ss_t.tournament_name_en, \
                ss_s.sport_name_th, ss_s.sport_name_en, \
                ss_t.url as tournament_url, ss_t.dimension as tournament_dimension, \
                ss_s.url as sport_url, ss_s.dimension as sport_dimension, \
                ss_p.folder, ss_p.file_name, ss_p.ref_type as picture_type \
                FROM ss_video sv \
                LEFT JOIN ss_tournament ss_t \
                ON sv.tournament_id = ss_t.tournament_id \
                LEFT JOIN ss_sport ss_s \
                ON sv.sport_id = ss_s.sport_id \
                LEFT JOIN ss_picture ss_p \
                ON sv.video_id2 = ss_p.ref_id \
                WHERE sv.tournament_id = " +
                  tournamentId +
                  " \
                AND ss_p.ref_type = 1 \
                AND sv.status = 1 \
                AND sv.approve = 1 \
                ORDER BY sv.lastupdate_date DESC " +
                  " LIMIT 5";

                mysqlModule.getData(query, function(error, result) {
                  if (error) return callback(error);
                  data = result;

                  for (var i in data) {
                    var picType = "vdo";
                    var picture_size = {
                      fullsize:
                        picType +
                        "/" +
                        data[i]["folder"] +
                        "/" +
                        data[i]["file_name"],
                      size128:
                        "size128/" +
                        data[i]["folder"] +
                        "/" +
                        data[i]["file_name"],
                      size224:
                        "size224/" +
                        data[i]["folder"] +
                        "/" +
                        data[i]["file_name"],
                      size304:
                        "size304/" +
                        data[i]["folder"] +
                        "/" +
                        data[i]["file_name"],
                      size640:
                        "size640/" +
                        data[i]["folder"] +
                        "/" +
                        data[i]["file_name"]
                    };
                    data[i].picture_size = picture_size;
                    data[i].types = "vdo";
                  }
                  listVideo = data;
                  callback();
                });
              },
              function(callback) {
                // merge 2 object and sort date
                listVideo.forEach((item, index) => {
                  listNews.push(item);
                });
                data = listNews.sort((a, b) => {
                  return (
                    new Date(b.lastupdate_date) - new Date(a.lastupdate_date)
                  );
                });
                callback();
              },
              function(callback) {
                redisCaching.saveCache(res, cacheKey, data, function(
                  error,
                  response
                ) {
                  if (error) return callback(error);
                  callback();
                });
              }
            ],
            function(error) {
              if (error) {
                return utils.printJSON(
                  res,
                  utils.getJSONObject(errorCode, error.stack, null)
                );
              } else {
                return utils.printJSON(
                  res,
                  utils.getJSONObject(
                    200,
                    { status: "success", cache: "redis", cache_key: cacheKey },
                    data
                  )
                );
              }
            }
          );
        }
      }
    });
  }
};

newsModule.getHilightHeadlineHistory = function(req, res, next) {
  var param_page = req.query.page;
  var clearCache = req.query.clearCache;

  if (clearCache === "" || typeof clearCache === "undefined") {
    clearCache = false;
  }

  if (param_page === null || isNaN(param_page)) {
    param_page = 1;
  }

  var cacheKey =
    cacheKeyPrefix + "main-news-getHilight-headlinehistory-" + param_page;

  if (clearCache) {
    redisCaching.deleteCache(res, cacheKey, function(error, reply) {
      if (error) {
        return utils.printJSON(
          res,
          utils.getJSONObject(500, error.stack, null)
        );
      } else {
        if (reply) {
          return utils.printJSON(
            res,
            utils.getJSONObject(
              200,
              {
                status: "success",
                cache: "cache deleted",
                cache_key: cacheKey
              },
              null
            )
          );
        } else {
          return utils.printJSON(
            res,
            utils.getJSONObject(
              200,
              {
                status: "fail",
                description:
                  "KEY " + cacheKey + " does not exist or already deleted."
              },
              null
            )
          );
        }
      }
    });
  } else {
    redisCaching.cacheExist(res, cacheKey, function(error, reply) {
      if (error) {
        return utils.printJSON(
          res,
          utils.getJSONObject(500, error.stack, null)
        );
      } else {
        if (reply) {
          redisCaching.getCache(res, cacheKey, function(error, result) {
            if (error) {
              return utils.printJSON(
                res,
                utils.getJSONObject(500, error.stack, null)
              );
            } else {
              var json = JSON.parse(result);
              return utils.printJSON(
                res,
                utils.getJSONObject(
                  200,
                  {
                    status: "success",
                    cache: "cached redis",
                    cache_key: cacheKey
                  },
                  json
                )
              );
            }
          });
        } else {
          // get data from mysql;
          var page_offset = 0;
          if (param_page > 1) {
            page_offset = (param_page - 1) * 10;
          }

          var query =
            "SELECT 'news' as types, sn.news_id2 as news_id, sn.news_special_id, \
            ss_ns.name as news_special_name, ss_ns.url as news_special_url, \
            sn.headline, sn.title, sn.countview, sn.share as countshare, \
            CONCAT(sp.folder, '/', sp.file_name) as thumbnail, \
            sn.lastupdate_date, \
            st.tournament_id, st.tournament_name_th, st.tournament_name_en, \
            st.url as tournament_url, st.dimension as tournament_dimension, \
            st.domain as domain, \
            ss.url as sport_url, ss.dimension as sport_dimension, \
            ss.sport_id, ss.sport_name_th, ss.sport_name_en \
            FROM ss_news sn \
            LEFT JOIN ss_picture sp \
            ON sn.news_id2 = sp.ref_id AND sp.ref_type = 1 \
            LEFT JOIN ss_tournament st \
            ON sn.tournament_id = st.tournament_id \
            LEFT JOIN ss_sport ss \
            ON sn.sport_id = ss.sport_id \
            LEFT JOIN ss_news_special ss_ns \
            ON sn.news_special_id = ss_ns.news_special_id \
            WHERE sn.headline = 1 \
            union \
            SELECT 'column' as types, sc.column_id2 as news_id, '0' as news_special_id, \
            '' as news_special_name, '' as news_special_url, \
            sc.headline, sc.title, sc.countview, sc.share as countshare, \
            CONCAT(sp.folder, '/', sp.file_name) as thumbnail, \
            sc.lastupdate_date, \
            st.tournament_id, st.tournament_name_th, st.tournament_name_en, \
            st.url as tournament_url, st.dimension as tournament_dimension, \
            st.domain as domain, \
            ss.url as sport_url, ss.dimension as sport_dimension, \
            ss.sport_id, ss.sport_name_th, ss.sport_name_en \
            FROM ss_column sc \
            LEFT JOIN ss_picture sp \
            ON sc.column_id2 = sp.ref_id AND sp.ref_type = 2 \
            LEFT JOIN ss_tournament st \
            ON sc.tournament_id = st.tournament_id \
            LEFT JOIN ss_sport ss \
            ON sc.sport_id = ss.sport_id \
            WHERE sc.headline = 1 \
            ORDER BY lastupdate_date DESC \
			      LIMIT 10 OFFSET " +
            page_offset +
            "";

          var data = {};

          async.series(
            [
              function(callback) {
                mysqlModule.getData(query, function(error, result) {
                  if (error) return callback(error);
                  data = result;
                  callback();
                });
              },
              function(callback) {
                async.each(
                  data,
                  function(item, cb) {
                    var ref_type = 1;

                    if (item.types === "vdo") {
                      ref_type = 4;
                    } else if (item.types === "column") {
                      ref_type = 2;
                    }

                    var query =
                      "SELECT folder, file_name \
                    FROM ss_picture hp\
                    WHERE hp.ref_id = " +
                      item.news_id +
                      " \
                    AND hp.ref_type = " +
                      ref_type;

                    mysqlModule.getData(query, function(error, result) {
                      var picture_size = {
                        fullsize:
                          item.types +
                          "/" +
                          result[0]["folder"] +
                          "/" +
                          result[0]["file_name"],
                        size128:
                          "size128/" +
                          result[0]["folder"] +
                          "/" +
                          result[0]["file_name"],
                        size224:
                          "size224/" +
                          result[0]["folder"] +
                          "/" +
                          result[0]["file_name"],
                        size304:
                          "size304/" +
                          result[0]["folder"] +
                          "/" +
                          result[0]["file_name"],
                        size640:
                          "size640/" +
                          result[0]["folder"] +
                          "/" +
                          result[0]["file_name"]
                      };

                      item.picture_size = picture_size;
                      cb();
                    });
                  },
                  function(err) {
                    if (err) {
                      return callback(err);
                    } else {
                      callback();
                    }
                  }
                );
              },
              function(callback) {
                redisCaching.saveCache(res, cacheKey, data, function(
                  error,
                  response
                ) {
                  if (error) return callback(error);
                  callback();
                });
              }
            ],
            function(error) {
              if (error) {
                return utils.printJSON(
                  res,
                  utils.getJSONObject(500, error.stack, null)
                );
              } else {
                return utils.printJSON(
                  res,
                  utils.getJSONObject(
                    200,
                    { status: "success", cache: "redis", cache_key: cacheKey },
                    data
                  )
                );
              }
            }
          );
        }
      }
    });
  }
};

newsModule.getHilightHeadline = function(req, res, next) {
  var clearCache = req.query.clearCache;

  if (clearCache === "" || typeof clearCache === "undefined") {
    clearCache = false;
  }

  var cacheKey = cacheKeyPrefix + "main-news-getHilight-headline";

  if (clearCache) {
    redisCaching.deleteCache(res, cacheKey, function(error, reply) {
      if (error) {
        return utils.printJSON(
          res,
          utils.getJSONObject(500, error.stack, null)
        );
      } else {
        if (reply) {
          return utils.printJSON(
            res,
            utils.getJSONObject(
              200,
              {
                status: "success",
                cache: "cache deleted",
                cache_key: cacheKey
              },
              null
            )
          );
        } else {
          return utils.printJSON(
            res,
            utils.getJSONObject(
              200,
              {
                status: "fail",
                description:
                  "KEY " + cacheKey + " does not exist or already deleted."
              },
              null
            )
          );
        }
      }
    });
  } else {
    redisCaching.cacheExist(res, cacheKey, function(error, reply) {
      if (error) {
        return utils.printJSON(
          res,
          utils.getJSONObject(500, error.stack, null)
        );
      } else {
        if (reply) {
          redisCaching.getCache(res, cacheKey, function(error, result) {
            if (error) {
              return utils.printJSON(
                res,
                utils.getJSONObject(500, error.stack, null)
              );
            } else {
              var json = JSON.parse(result);
              return utils.printJSON(
                res,
                utils.getJSONObject(
                  200,
                  {
                    status: "success",
                    cache: "cached redis",
                    cache_key: cacheKey
                  },
                  json
                )
              );
            }
          });
        } else {
          // get data from mysql;
          var query =
            "SELECT hn.news_id, sn.news_special_id, ss_ns.name as news_special_name, ss_ns.url as news_special_url, \
            hn.redirect_url, hn.types, hn.title, hn.thumbnail, sn.lastupdate_date as lastupdate_date_news, hn.lastupdate_date, \
            hc.name as category_name, \
            st.tournament_id, st.tournament_name_th, st.tournament_name_en, \
            st.url as tournament_url, st.dimension as tournament_dimension, \
            st.domain as domain, \
            ss.url as sport_url, ss.dimension as sport_dimension, \
            ss.sport_id, ss.sport_name_th, ss.sport_name_en \
            FROM ss_highlight_news_mapping hn \
            LEFT JOIN ss_highlight_category hc \
            ON hn.highlight_category_id = hc.highlight_category_id \
            LEFT JOIN ss_news sn \
            ON hn.news_id = sn.news_id2 \
            LEFT JOIN ss_tournament st \
            ON sn.tournament_id = st.tournament_id \
            LEFT JOIN ss_sport ss \
            ON sn.sport_id = ss.sport_id \
            LEFT JOIN ss_news_special ss_ns ON sn.news_special_id = ss_ns.news_special_id \
            WHERE hn.highlight_category_id = 1 \
            AND hn.status = 1 \
            ORDER BY hn.order_by, hn.lastupdate_date DESC \
            LIMIT 13";

          var data = {};

          async.series(
            [
              function(callback) {
                mysqlModule.getData(query, function(error, result) {
                  if (error) return callback(error);
                  data = result;
                  callback();
                });
              },
              function(callback) {
                async.each(
                  data,
                  function(item, cb) {
                    var ref_type = 1;

                    if (item.types === "vdo") {
                      ref_type = 4;
                    } else if (item.types === "column") {
                      ref_type = 2;
                    }

                    var query =
                      "SELECT folder, file_name \
                    FROM ss_picture hp\
                    WHERE hp.ref_id = " +
                      item.news_id +
                      " \
                    AND hp.ref_type = " +
                      ref_type;

                    mysqlModule.getData(query, function(error, result) {

                      if (result.length !== 0) {
                        var picture_size = {
                          fullsize:
                            item.types +
                            "/" +
                            result[0]["folder"] +
                            "/" +
                            result[0]["file_name"],
                          size128:
                            "size128/" +
                            result[0]["folder"] +
                            "/" +
                            result[0]["file_name"],
                          size224:
                            "size224/" +
                            result[0]["folder"] +
                            "/" +
                            result[0]["file_name"],
                          size304:
                            "size304/" +
                            result[0]["folder"] +
                            "/" +
                            result[0]["file_name"],
                          size640:
                            "size640/" +
                            result[0]["folder"] +
                            "/" +
                            result[0]["file_name"]
                        };

                        item.picture_size = picture_size;
                      }
                      cb();
                    });
                  },
                  function(err) {
                    if (err) {
                      return callback(err);
                    } else {
                      callback();
                    }
                  }
                );
              },
              function(callback) {
                redisCaching.saveCache(res, cacheKey, data, function(
                  error,
                  response
                ) {
                  if (error) return callback(error);
                  callback();
                });
              }
            ],
            function(error) {
              if (error) {
                return utils.printJSON(
                  res,
                  utils.getJSONObject(500, error.stack, null)
                );
              } else {
                return utils.printJSON(
                  res,
                  utils.getJSONObject(
                    200,
                    {
                      status: "success",
                      cache: "save to redis",
                      cache_key: cacheKey
                    },
                    data
                  )
                );
              }
            }
          );
        }
      }
    });
  }
};

newsModule.getHilightNews = function(req, res, next) {
  var orderby = req.query.orderby;
  var limit = req.query.limit;
  var clearCache = req.query.clearCache;

  if (orderby === "" || typeof orderby === "undefined") {
    orderby = "lastupdate";
  }

  if (limit === "" || typeof limit === "undefined" || isNaN(limit)) {
    limit = 8;
  } else {
    limit = parseInt(limit);
  }

  if (clearCache === "" || typeof clearCache === "undefined") {
    clearCache = false;
  }

  var cacheKey =
    cacheKeyPrefix +
    "main-news-getHilight-hilightNews-" +
    orderby +
    "-" +
    limit;

  if (clearCache) {
    redisCaching.deleteCache(res, cacheKey, function(error, reply) {
      if (error) {
        return utils.printJSON(
          res,
          utils.getJSONObject(500, error.stack, null)
        );
      } else {
        if (reply) {
          return utils.printJSON(
            res,
            utils.getJSONObject(
              200,
              {
                status: "success",
                cache: "cache deleted",
                cache_key: cacheKey
              },
              null
            )
          );
        } else {
          return utils.printJSON(
            res,
            utils.getJSONObject(
              200,
              {
                status: "fail",
                description:
                  "KEY " + cacheKey + " does not exist or already deleted."
              },
              null
            )
          );
        }
      }
    });
  } else {
    redisCaching.cacheExist(res, cacheKey, function(error, reply) {
      if (error) {
        return utils.printJSON(
          res,
          utils.getJSONObject(500, error.stack, null)
        );
      } else {
        if (reply) {
          redisCaching.getCache(res, cacheKey, function(error, result) {
            if (error) {
              return utils.printJSON(
                res,
                utils.getJSONObject(500, error.stack, null)
              );
            } else {
              var json = JSON.parse(result);
              return utils.printJSON(
                res,
                utils.getJSONObject(
                  200,
                  {
                    status: "success",
                    cache: "cached redis",
                    cache_key: cacheKey
                  },
                  json
                )
              );
            }
          });
        } else {
          // get data from mysql;
          if (
            orderby === "lastupdate" ||
            orderby === "" ||
            typeof orderby === "undefined"
          ) {
            orderby = "ss_n.create_date DESC";
          }

          var query =
            "SELECT ss_n.news_id2 as news_id, ss_n.news_special_id, ss_ns.name as news_special_name, ss_n.icon_pic, ss_n.icon_vdo, ss_n.title, \
            ss_n.lastupdate_date, \
            ss_n.sport_id, ss_s.sport_name_th, ss_s.sport_name_en, ss_s.icon, \
            ss_n.tournament_id, ss_t.tournament_name_th, ss_t.tournament_name_en, \
            ss_t.url as tournament_url, ss_t.dimension as tournament_dimension, \
            ss_t.domain as tournament_domain, \
            ss_s.url as sport_url, ss_s.dimension as sport_dimension, \
            ss_p.folder, ss_p.file_name, ss_p.ref_type as picture_type \
            FROM ss_news ss_n \
            LEFT JOIN ss_sport ss_s \
            ON ss_n.sport_id = ss_s.sport_id \
            LEFT JOIN ss_tournament ss_t \
            ON ss_n.tournament_id = ss_t.tournament_id \
            LEFT JOIN ss_picture ss_p \
            ON ss_n.news_id2 = ss_p.ref_id \
            AND ss_p.ref_type = 1 \
            AND ss_n.status = 1 \
            AND ss_n.approve = 1 \
            LEFT JOIN ss_news_special ss_ns \
            ON ss_n.news_special_id = ss_ns.news_special_id \
            ORDER BY " +
            orderby +
            " LIMIT " +
            limit;

          mysqlModule.getData(query, function(error, result) {
            if (error) {
              return utils.printJSON(
                res,
                utils.getJSONObject(500, error.stack, null)
              );
            } else {
              var data = result;

              for (var i in data) {
                var picType = "news";
                var picture_size = {
                  fullsize:
                    picType +
                    "/" +
                    data[i]["folder"] +
                    "/" +
                    data[i]["file_name"],
                  size150:
                    "size150/" + data[i]["folder"] + "/" + data[i]["file_name"],
                  size192:
                    "size192/" + data[i]["folder"] + "/" + data[i]["file_name"],
                  size318:
                    "size318/" + data[i]["folder"] + "/" + data[i]["file_name"],
                  size540:
                    "size540/" + data[i]["folder"] + "/" + data[i]["file_name"],
                  size640:
                    "size640/" + data[i]["folder"] + "/" + data[i]["file_name"]
                };
                data[i].picture_size = picture_size;
              }

              redisCaching.saveCache(res, cacheKey, data, function(
                error,
                response
              ) {
                if (error) {
                  return utils.printJSON(
                    res,
                    utils.getJSONObject(
                      200,
                      {
                        status: "success",
                        cache: "no cache - " + error.message,
                        cache_key: cacheKey
                      },
                      data
                    )
                  );
                } else {
                  return utils.printJSON(
                    res,
                    utils.getJSONObject(
                      200,
                      {
                        status: "success",
                        cache: "redis",
                        cache_key: cacheKey
                      },
                      data
                    )
                  );
                }
              });
            }
          });
        }
      }
    });
  }
};

newsModule.getHilightFootballThai = function(req, res, next) {
  var clearCache = req.query.clearCache;

  if (clearCache === "" || typeof clearCache === "undefined") {
    clearCache = false;
  }

  var cacheKey = cacheKeyPrefix + "main-news-getHilight-footballThai";

  if (clearCache) {
    redisCaching.deleteCache(res, cacheKey, function(error, reply) {
      if (error) {
        return utils.printJSON(
          res,
          utils.getJSONObject(500, error.stack, null)
        );
      } else {
        if (reply) {
          return utils.printJSON(
            res,
            utils.getJSONObject(
              200,
              {
                status: "success",
                cache: "cache deleted",
                cache_key: cacheKey
              },
              null
            )
          );
        } else {
          return utils.printJSON(
            res,
            utils.getJSONObject(
              200,
              {
                status: "fail",
                description:
                  "KEY " + cacheKey + " does not exist or already deleted."
              },
              null
            )
          );
        }
      }
    });
  } else {
    redisCaching.cacheExist(res, cacheKey, function(error, reply) {
      if (error) {
        return utils.printJSON(
          res,
          utils.getJSONObject(500, error.stack, null)
        );
      } else {
        if (reply) {
          redisCaching.getCache(res, cacheKey, function(error, result) {
            if (error) {
              return utils.printJSON(
                res,
                utils.getJSONObject(500, error.stack, null)
              );
            } else {
              var json = JSON.parse(result);
              return utils.printJSON(
                res,
                utils.getJSONObject(
                  200,
                  {
                    status: "success",
                    cache: "cached redis",
                    cache_key: cacheKey
                  },
                  json
                )
              );
            }
          });
        } else {
          // get data from mysql;
          var query =
            "SELECT hn.news_id, sn.news_special_id, ss_ns.name as news_special_name, hn.types, hn.title, hn.thumbnail, sn.lastupdate_date, \
            st.tournament_name_th as category_name, \
            st.tournament_id, st.tournament_name_th, st.tournament_name_en, \
            st.url as tournament_url, st.dimension as tournament_dimension, \
            st.domain as domain, \
            ss.url as sport_url, ss.dimension as sport_dimension, \
            ss.sport_id, ss.sport_name_th, ss.sport_name_en \
            FROM ss_highlight_news_mapping hn\
            LEFT JOIN ss_highlight_category hc\
            ON hn.highlight_category_id = hc.highlight_category_id \
            LEFT JOIN ss_news sn \
            ON hn.news_id = sn.news_id2 \
            LEFT JOIN ss_tournament st\
            ON sn.tournament_id = st.tournament_id \
            LEFT JOIN ss_sport ss\
            ON sn.sport_id = ss.sport_id \
            LEFT JOIN ss_news_special ss_ns \
            ON sn.news_special_id = ss_ns.news_special_id \
            WHERE hn.highlight_category_id = 3 \
            AND hn.status = 1 \
            ORDER BY hn.order_by, hn.lastupdate_date DESC \
            LIMIT 9";

          var data = {};

          async.series(
            [
              function(callback) {
                mysqlModule.getData(query, function(error, result) {
                  if (error) return callback(error);
                  data = result;
                  callback();
                });
              },
              function(callback) {
                async.each(
                  data,
                  function(item, cb) {
                    var ref_type = 1;

                    if (item.types === "vdo") {
                      ref_type = 4;
                    } else if (item.types === "column") {
                      ref_type = 2;
                    }

                    var query =
                      "SELECT folder, file_name \
                    FROM ss_picture hp\
                    WHERE hp.ref_id = " +
                      item.news_id +
                      " \
                    AND hp.ref_type = " +
                      ref_type;

                    mysqlModule.getData(query, function(error, result) {
                      var picture_size = {
                        fullsize:
                          item.types +
                          "/" +
                          result[0]["folder"] +
                          "/" +
                          result[0]["file_name"],
                        size128:
                          "size128/" +
                          result[0]["folder"] +
                          "/" +
                          result[0]["file_name"],
                        size224:
                          "size224/" +
                          result[0]["folder"] +
                          "/" +
                          result[0]["file_name"],
                        size304:
                          "size304/" +
                          result[0]["folder"] +
                          "/" +
                          result[0]["file_name"],
                        size640:
                          "size640/" +
                          result[0]["folder"] +
                          "/" +
                          result[0]["file_name"]
                      };

                      item.picture_size = picture_size;
                      cb();
                    });
                  },
                  function(err) {
                    if (err) {
                      return callback(err);
                    } else {
                      callback();
                    }
                  }
                );
              },
              function(callback) {
                redisCaching.saveCache(res, cacheKey, data, function(
                  error,
                  response
                ) {
                  if (error) return callback(error);
                  callback();
                });
              }
            ],
            function(error) {
              if (error) {
                return utils.printJSON(
                  res,
                  utils.getJSONObject(500, error.stack, null)
                );
              } else {
                return utils.printJSON(
                  res,
                  utils.getJSONObject(
                    200,
                    { status: "success", cache: "redis", cache_key: cacheKey },
                    data
                  )
                );
              }
            }
          );
        }
      }
    });
  }
};

newsModule.getHilightFootballInter = function(req, res, next) {
  var clearCache = req.query.clearCache;

  if (clearCache === "" || typeof clearCache === "undefined") {
    clearCache = false;
  }

  var cacheKey = cacheKeyPrefix + "main-news-getHilight-footballInter";

  if (clearCache) {
    redisCaching.deleteCache(res, cacheKey, function(error, reply) {
      if (error) {
        return utils.printJSON(
          res,
          utils.getJSONObject(500, error.stack, null)
        );
      } else {
        if (reply) {
          return utils.printJSON(
            res,
            utils.getJSONObject(
              200,
              {
                status: "success",
                cache: "cache deleted",
                cache_key: cacheKey
              },
              null
            )
          );
        } else {
          return utils.printJSON(
            res,
            utils.getJSONObject(
              200,
              {
                status: "fail",
                description:
                  "KEY " + cacheKey + " does not exist or already deleted."
              },
              null
            )
          );
        }
      }
    });
  } else {
    redisCaching.cacheExist(res, cacheKey, function(error, reply) {
      if (error) {
        return utils.printJSON(
          res,
          utils.getJSONObject(500, error.stack, null)
        );
      } else {
        if (reply) {
          redisCaching.getCache(res, cacheKey, function(error, result) {
            if (error) {
              return utils.printJSON(
                res,
                utils.getJSONObject(500, error.stack, null)
              );
            } else {
              var json = JSON.parse(result);
              return utils.printJSON(
                res,
                utils.getJSONObject(
                  200,
                  {
                    status: "success",
                    cache: "cached redis",
                    cache_key: cacheKey
                  },
                  json
                )
              );
            }
          });
        } else {
          // get data from mysql;
          var query =
            "SELECT hn.news_id, sn.news_special_id, ss_ns.name as news_special_name, hn.types, hn.title, hn.thumbnail, sn.lastupdate_date, \
            st.tournament_name_th as category_name, \
            st.tournament_id, st.tournament_name_th, st.tournament_name_en, \
            st.url as tournament_url, st.dimension as tournament_dimension, \
            ss.url as sport_url, ss.dimension as sport_dimension, \
            ss.sport_id, ss.sport_name_th, ss.sport_name_en \
            FROM ss_highlight_news_mapping hn\
            LEFT JOIN ss_highlight_category hc\
            ON hn.highlight_category_id = hc.highlight_category_id \
            LEFT JOIN ss_news sn \
            ON hn.news_id = sn.news_id2 \
            LEFT JOIN ss_tournament st\
            ON sn.tournament_id = st.tournament_id \
            LEFT JOIN ss_sport ss\
            ON sn.sport_id = ss.sport_id \
            LEFT JOIN ss_news_special ss_ns \
            ON sn.news_special_id = ss_ns.news_special_id \
            WHERE hn.highlight_category_id = 4 \
            AND hn.status = 1 \
            ORDER BY hn.order_by, hn.lastupdate_date DESC \
            LIMIT 5";

          var data = {};

          async.series(
            [
              function(callback) {
                mysqlModule.getData(query, function(error, result) {
                  if (error) return callback(error);
                  data = result;
                  callback();
                });
              },
              function(callback) {
                async.each(
                  data,
                  function(item, cb) {
                    var ref_type = 1;

                    if (item.types === "vdo") {
                      ref_type = 4;
                    } else if (item.types === "column") {
                      ref_type = 2;
                    }

                    var query =
                      "SELECT folder, file_name \
                    FROM ss_picture hp\
                    WHERE hp.ref_id = " +
                      item.news_id +
                      " \
                    AND hp.ref_type = " +
                      ref_type;

                    mysqlModule.getData(query, function(error, result) {
                      var picture_size = {
                        fullsize:
                          item.types +
                          "/" +
                          result[0]["folder"] +
                          "/" +
                          result[0]["file_name"],
                        size128:
                          "size128/" +
                          result[0]["folder"] +
                          "/" +
                          result[0]["file_name"],
                        size224:
                          "size224/" +
                          result[0]["folder"] +
                          "/" +
                          result[0]["file_name"],
                        size304:
                          "size304/" +
                          result[0]["folder"] +
                          "/" +
                          result[0]["file_name"],
                        size640:
                          "size640/" +
                          result[0]["folder"] +
                          "/" +
                          result[0]["file_name"]
                      };

                      item.picture_size = picture_size;
                      cb();
                    });
                  },
                  function(err) {
                    if (err) {
                      return callback(err);
                    } else {
                      callback();
                    }
                  }
                );
              },
              function(callback) {
                redisCaching.saveCache(res, cacheKey, data, function(
                  error,
                  response
                ) {
                  if (error) return callback(error);
                  callback();
                });
              }
            ],
            function(error) {
              if (error) {
                return utils.printJSON(
                  res,
                  utils.getJSONObject(500, error.stack, null)
                );
              } else {
                return utils.printJSON(
                  res,
                  utils.getJSONObject(
                    200,
                    { status: "success", cache: "redis", cache_key: cacheKey },
                    data
                  )
                );
              }
            }
          );
        }
      }
    });
  }
};

newsModule.getHilightMuaySiam = function(req, res, next) {
  var clearCache = req.query.clearCache;

  if (clearCache === "" || typeof clearCache === "undefined") {
    clearCache = false;
  }

  var cacheKey = cacheKeyPrefix + "main-news-getHilight-muaySiam";

  if (clearCache) {
    redisCaching.deleteCache(res, cacheKey, function(error, reply) {
      if (error) {
        return utils.printJSON(
          res,
          utils.getJSONObject(500, error.stack, null)
        );
      } else {
        if (reply) {
          return utils.printJSON(
            res,
            utils.getJSONObject(
              200,
              {
                status: "success",
                cache: "cache deleted",
                cache_key: cacheKey
              },
              null
            )
          );
        } else {
          return utils.printJSON(
            res,
            utils.getJSONObject(
              200,
              {
                status: "fail",
                description:
                  "KEY " + cacheKey + " does not exist or already deleted."
              },
              null
            )
          );
        }
      }
    });
  } else {
    redisCaching.cacheExist(res, cacheKey, function(error, reply) {
      if (error) {
        return utils.printJSON(
          res,
          utils.getJSONObject(500, error.stack, null)
        );
      } else {
        if (reply) {
          redisCaching.getCache(res, cacheKey, function(error, result) {
            if (error) {
              return utils.printJSON(
                res,
                utils.getJSONObject(500, error.stack, null)
              );
            } else {
              var json = JSON.parse(result);
              return utils.printJSON(
                res,
                utils.getJSONObject(
                  200,
                  {
                    status: "success",
                    cache: "cached redis",
                    cache_key: cacheKey
                  },
                  json
                )
              );
            }
          });
        } else {
          // get data from mysql;
          var query =
            "SELECT hn.news_id, hn.types, hn.title, hn.thumbnail, sn.lastupdate_date, \
            hc.name as category_name, \
            st.tournament_id, st.tournament_name_th, st.tournament_name_en, st.domain, \
            st.url as tournament_url, st.dimension as tournament_dimension, \
            ss.url as sport_url, ss.dimension as sport_dimension, \
            ss.sport_id, ss.sport_name_th, ss.sport_name_en \
            FROM ss_highlight_news_mapping hn\
            LEFT JOIN ss_highlight_category hc\
            ON hn.highlight_category_id = hc.highlight_category_id \
            LEFT JOIN ss_news sn \
            ON hn.news_id = sn.news_id2 \
            LEFT JOIN ss_tournament st\
            ON sn.tournament_id = st.tournament_id \
            LEFT JOIN ss_sport ss\
            ON sn.sport_id = ss.sport_id \
            WHERE hn.highlight_category_id = 9 \
            AND hn.status = 1 \
            ORDER BY hn.order_by, hn.lastupdate_date DESC \
            LIMIT 5";

          var data = {};
          var programs = {};

          async.series(
            [
              function(callback) {
                mysqlModule.getData(query, function(error, result) {
                  if (error) return callback(error);
                  data = result;
                  callback();
                });
              },
              function(callback) {
                async.each(
                  data,
                  function(item, cb) {
                    var ref_type = 1;

                    if (item.types === "vdo") {
                      ref_type = 4;
                    } else if (item.types === "column") {
                      ref_type = 2;
                    }

                    var query =
                      "SELECT folder, file_name \
                  FROM ss_picture hp\
                  WHERE hp.ref_id = " +
                      item.news_id +
                      " \
                  AND hp.ref_type = " +
                      ref_type;

                    mysqlModule.getData(query, function(error, result) {
                      var picture_size = {
                        fullsize:
                          item.types +
                          "/" +
                          result[0]["folder"] +
                          "/" +
                          result[0]["file_name"],
                        size128:
                          "size128/" +
                          result[0]["folder"] +
                          "/" +
                          result[0]["file_name"],
                        size224:
                          "size224/" +
                          result[0]["folder"] +
                          "/" +
                          result[0]["file_name"],
                        size304:
                          "size304/" +
                          result[0]["folder"] +
                          "/" +
                          result[0]["file_name"],
                        size640:
                          "size640/" +
                          result[0]["folder"] +
                          "/" +
                          result[0]["file_name"]
                      };

                      item.picture_size = picture_size;
                      cb();
                    });
                  },
                  function(err) {
                    if (err) {
                      return callback(err);
                    } else {
                      callback();
                    }
                  }
                );
              },
              function(callback) {
                var query =
                  "SELECT match_id, home_team, away_team, match_date, result\
                FROM ss_match  \
                WHERE sport_id = 7 \
                AND status = 1";

                mysqlModule.getData(query, function(error, result) {
                  if (error) return callback(error);
                  programs = result;
                  callback();
                });
              },
              function(callback) {
                data.push(programs);
                callback();
              },
              function(callback) {
                redisCaching.saveCache(res, cacheKey, data, function(
                  error,
                  response
                ) {
                  if (error) return callback(error);
                  callback();
                });
              }
            ],
            function(error) {
              if (error) {
                return utils.printJSON(
                  res,
                  utils.getJSONObject(500, error.stack, null)
                );
              } else {
                return utils.printJSON(
                  res,
                  utils.getJSONObject(
                    200,
                    { status: "success", cache: "redis", cache_key: cacheKey },
                    data
                  )
                );
              }
            }
          );
        }
      }
    });
  }
};

newsModule.getHilightSports = function(req, res, next) {
  var clearCache = req.query.clearCache;

  if (clearCache === "" || typeof clearCache === "undefined") {
    clearCache = false;
  }

  var cacheKey = cacheKeyPrefix + "main-news-getHilight-sports";

  if (clearCache) {
    redisCaching.deleteCache(res, cacheKey, function(error, reply) {
      if (error) {
        return utils.printJSON(
          res,
          utils.getJSONObject(500, error.stack, null)
        );
      } else {
        if (reply) {
          return utils.printJSON(
            res,
            utils.getJSONObject(
              200,
              {
                status: "success",
                cache: "cache deleted",
                cache_key: cacheKey
              },
              null
            )
          );
        } else {
          return utils.printJSON(
            res,
            utils.getJSONObject(
              200,
              {
                status: "fail",
                description:
                  "KEY " + cacheKey + " does not exist or already deleted."
              },
              null
            )
          );
        }
      }
    });
  } else {
    redisCaching.cacheExist(res, cacheKey, function(error, reply) {
      if (error) {
        return utils.printJSON(
          res,
          utils.getJSONObject(500, error.stack, null)
        );
      } else {
        if (reply) {
          redisCaching.getCache(res, cacheKey, function(error, result) {
            if (error) {
              return utils.printJSON(
                res,
                utils.getJSONObject(500, error.stack, null)
              );
            } else {
              var json = JSON.parse(result);
              return utils.printJSON(
                res,
                utils.getJSONObject(
                  200,
                  {
                    status: "success",
                    cache: "cached redis",
                    cache_key: cacheKey
                  },
                  json
                )
              );
            }
          });
        } else {
          // get data from mysql;
          var query =
            "SELECT hn.news_id, sn.news_special_id, ss_ns.name as news_special_name, hn.types, hn.title, hn.thumbnail, sn.lastupdate_date, \
            st.tournament_name_th as category_name,\
            st.tournament_id, st.tournament_name_th, st.tournament_name_en, \
            st.url as tournament_url, st.dimension as tournament_dimension, \
            st.domain as domain, \
            ss.url as sport_url, ss.dimension as sport_dimension, \
            ss.sport_id, ss.sport_name_th, ss.sport_name_en \
            FROM ss_highlight_news_mapping hn\
            LEFT JOIN ss_highlight_category hc\
            ON hn.highlight_category_id = hc.highlight_category_id \
            LEFT JOIN ss_news sn \
            ON hn.news_id = sn.news_id2 \
            LEFT JOIN ss_tournament st\
            ON sn.tournament_id = st.tournament_id \
            LEFT JOIN ss_sport ss\
            ON sn.sport_id = ss.sport_id \
            LEFT JOIN ss_news_special ss_ns \
            ON sn.news_type_id = ss_ns.news_special_id \
            WHERE hn.highlight_category_id = 10 \
            AND hn.status = 1 \
            ORDER BY hn.order_by, hn.lastupdate_date DESC \
            LIMIT 9";

          var data = {};

          async.series(
            [
              function(callback) {
                mysqlModule.getData(query, function(error, result) {
                  if (error) return callback(error);
                  data = result;
                  callback();
                });
              },
              function(callback) {
                async.each(
                  data,
                  function(item, cb) {
                    var ref_type = 1;

                    if (item.types === "vdo") {
                      ref_type = 4;
                    } else if (item.types === "column") {
                      ref_type = 2;
                    }

                    var query =
                      "SELECT folder, file_name \
                    FROM ss_picture hp\
                    WHERE hp.ref_id = " +
                      item.news_id +
                      " \
                    AND hp.ref_type = " +
                      ref_type;

                    mysqlModule.getData(query, function(error, result) {
                      var picture_size = {
                        fullsize:
                          item.types +
                          "/" +
                          result[0]["folder"] +
                          "/" +
                          result[0]["file_name"],
                        size128:
                          "size128/" +
                          result[0]["folder"] +
                          "/" +
                          result[0]["file_name"],
                        size224:
                          "size224/" +
                          result[0]["folder"] +
                          "/" +
                          result[0]["file_name"],
                        size304:
                          "size304/" +
                          result[0]["folder"] +
                          "/" +
                          result[0]["file_name"],
                        size640:
                          "size640/" +
                          result[0]["folder"] +
                          "/" +
                          result[0]["file_name"]
                      };

                      item.picture_size = picture_size;
                      cb();
                    });
                  },
                  function(err) {
                    if (err) {
                      return callback(err);
                    } else {
                      callback();
                    }
                  }
                );
              },
              function(callback) {
                redisCaching.saveCache(res, cacheKey, data, function(
                  error,
                  response
                ) {
                  if (error) return callback(error);
                  callback();
                });
              }
            ],
            function(error) {
              if (error) {
                return utils.printJSON(
                  res,
                  utils.getJSONObject(500, error.stack, null)
                );
              } else {
                return utils.printJSON(
                  res,
                  utils.getJSONObject(
                    200,
                    { status: "success", cache: "redis", cache_key: cacheKey },
                    data
                  )
                );
              }
            }
          );
        }
      }
    });
  }
};

newsModule.getHilightInfo = function(req, res, next) {
  var clearCache = req.query.clearCache;

  if (clearCache === "" || typeof clearCache === "undefined") {
    clearCache = false;
  }

  var cacheKey = cacheKeyPrefix + "main-news-getHilight-info";

  if (clearCache) {
    redisCaching.deleteCache(res, cacheKey, function(error, reply) {
      if (error) {
        return utils.printJSON(
          res,
          utils.getJSONObject(500, error.stack, null)
        );
      } else {
        if (reply) {
          return utils.printJSON(
            res,
            utils.getJSONObject(
              200,
              {
                status: "success",
                cache: "cache deleted",
                cache_key: cacheKey
              },
              null
            )
          );
        } else {
          return utils.printJSON(
            res,
            utils.getJSONObject(
              200,
              {
                status: "fail",
                description:
                  "KEY " + cacheKey + " does not exist or already deleted."
              },
              null
            )
          );
        }
      }
    });
  } else {
    redisCaching.cacheExist(res, cacheKey, function(error, reply) {
      if (error) {
        return utils.printJSON(
          res,
          utils.getJSONObject(500, error.stack, null)
        );
      } else {
        if (reply) {
          redisCaching.getCache(res, cacheKey, function(error, result) {
            if (error) {
              return utils.printJSON(
                res,
                utils.getJSONObject(500, error.stack, null)
              );
            } else {
              var json = JSON.parse(result);
              return utils.printJSON(
                res,
                utils.getJSONObject(
                  200,
                  {
                    status: "success",
                    cache: "cached redis",
                    cache_key: cacheKey
                  },
                  json
                )
              );
            }
          });
        } else {
          // get data from mysql;
          var query =
            "SELECT hn.news_id, hn.types, hn.title, hn.thumbnail, sn.lastupdate_date, \
            hc.name as category_name, sn.redirect_url \
            FROM ss_highlight_news_mapping hn\
            LEFT JOIN ss_highlight_category hc\
            ON hn.highlight_category_id = hc.highlight_category_id \
            LEFT JOIN ss_news sn \
            ON hn.news_id = sn.news_id2 \
            WHERE hn.highlight_category_id = 11 \
            AND hn.status = 1 \
            ORDER BY hn.order_by, hn.lastupdate_date DESC \
            LIMIT 4";

          var data = {};

          async.series(
            [
              function(callback) {
                mysqlModule.getData(query, function(error, result) {
                  if (error) return callback(error);
                  data = result;
                  callback();
                });
              },
              function(callback) {
                async.each(
                  data,
                  function(item, cb) {
                    var ref_type = 1;

                    if (item.types === "vdo") {
                      ref_type = 4;
                    } else if (item.types === "column") {
                      ref_type = 2;
                    }

                    var query =
                      "SELECT folder, file_name \
                    FROM ss_picture hp\
                    WHERE hp.ref_id = " +
                      item.news_id +
                      " \
                    AND hp.ref_type = " +
                      ref_type;

                    mysqlModule.getData(query, function(error, result) {
                      var picture_size = {
                        fullsize:
                          item.types +
                          "/" +
                          result[0]["folder"] +
                          "/" +
                          result[0]["file_name"],
                        size128:
                          "size128/" +
                          result[0]["folder"] +
                          "/" +
                          result[0]["file_name"],
                        size224:
                          "size224/" +
                          result[0]["folder"] +
                          "/" +
                          result[0]["file_name"],
                        size304:
                          "size304/" +
                          result[0]["folder"] +
                          "/" +
                          result[0]["file_name"],
                        size640:
                          "size640/" +
                          result[0]["folder"] +
                          "/" +
                          result[0]["file_name"]
                      };

                      item.picture_size = picture_size;
                      cb();
                    });
                  },
                  function(err) {
                    if (err) {
                      return callback(err);
                    } else {
                      callback();
                    }
                  }
                );
              },
              function(callback) {
                redisCaching.saveCache(res, cacheKey, data, function(
                  error,
                  response
                ) {
                  if (error) return callback(error);
                  callback();
                });
              }
            ],
            function(error) {
              if (error) {
                return utils.printJSON(
                  res,
                  utils.getJSONObject(500, error.stack, null)
                );
              } else {
                return utils.printJSON(
                  res,
                  utils.getJSONObject(
                    200,
                    { status: "success", cache: "redis", cache_key: cacheKey },
                    data
                  )
                );
              }
            }
          );
        }
      }
    });
  }
};

newsModule.getHilightSpecial = function(req, res, next) {
  var specialNewsId = req.query.id;
  var clearCache = req.query.clearCache;
  var limit = req.query.limit;

  if (
    specialNewsId === "" ||
    typeof specialNewsId === "undefined" ||
    isNaN(specialNewsId)
  ) {
    return utils.printJSON(
      res,
      utils.getJSONObject(400, "news id not found", null)
    );
  }

  if (clearCache === "" || typeof clearCache === "undefined") {
    clearCache = false;
  }

  if (limit === "" || typeof limit === "undefined" || isNaN(limit)) {
    limit = 2;
  } else {
    limit = parseInt(limit);
  }

  var cacheKey =
    cacheKeyPrefix +
    "main-news-getHilight-specialNews-" +
    specialNewsId +
    "-" +
    limit;

  if (clearCache) {
    redisCaching.deleteCache(res, cacheKey, function(error, reply) {
      if (error) {
        return utils.printJSON(
          res,
          utils.getJSONObject(500, error.stack, null)
        );
      } else {
        if (reply) {
          return utils.printJSON(
            res,
            utils.getJSONObject(
              200,
              {
                status: "success",
                cache: "cache deleted",
                cache_key: cacheKey
              },
              null
            )
          );
        } else {
          return utils.printJSON(
            res,
            utils.getJSONObject(
              200,
              {
                status: "fail",
                description:
                  "KEY " + cacheKey + " does not exist or already deleted."
              },
              null
            )
          );
        }
      }
    });
  } else {
    redisCaching.cacheExist(res, cacheKey, function(error, reply) {
      if (error) {
        return utils.printJSON(
          res,
          utils.getJSONObject(500, error.stack, null)
        );
      } else {
        if (reply) {
          redisCaching.getCache(res, cacheKey, function(error, result) {
            if (error) {
              return utils.printJSON(
                res,
                utils.getJSONObject(500, error.stack, null)
              );
            } else {
              var json = JSON.parse(result);
              return utils.printJSON(
                res,
                utils.getJSONObject(
                  200,
                  {
                    status: "success",
                    cache: "cached redis",
                    cache_key: cacheKey
                  },
                  json
                )
              );
            }
          });
        } else {
          // get data from mysql;
          var query =
            "SELECT hn.news_id, hn.types, hn.title, hn.thumbnail, sn.lastupdate_date, \
            hc.name as category_name \
            FROM ss_highlight_news_mapping hn\
            LEFT JOIN ss_highlight_category hc\
            ON hn.highlight_category_id = hc.highlight_category_id \
            LEFT JOIN ss_news sn \
            ON hn.news_id = sn.news_id2 \
            WHERE hn.highlight_category_id = " +
            specialNewsId +
            " \
            AND hn.status = 1 \
            ORDER BY hn.order_by, hn.lastupdate_date DESC \
            LIMIT " +
            limit;

          var data = {};

          async.series(
            [
              function(callback) {
                mysqlModule.getData(query, function(error, result) {
                  if (error) return callback(error);
                  data = result;
                  callback();
                });
              },
              function(callback) {
                async.each(
                  data,
                  function(item, cb) {
                    var ref_type = 1;

                    if (item.types === "vdo") {
                      ref_type = 4;
                    } else if (item.types === "column") {
                      ref_type = 2;
                    }

                    var query =
                      "SELECT folder, file_name \
                    FROM ss_picture hp\
                    WHERE hp.ref_id = " +
                      item.news_id +
                      " \
                    AND hp.ref_type = " +
                      ref_type;

                    mysqlModule.getData(query, function(error, result) {
                      var picture_size = {
                        fullsize:
                          item.types +
                          "/" +
                          result[0]["folder"] +
                          "/" +
                          result[0]["file_name"],
                        size128:
                          "size128/" +
                          result[0]["folder"] +
                          "/" +
                          result[0]["file_name"],
                        size224:
                          "size224/" +
                          result[0]["folder"] +
                          "/" +
                          result[0]["file_name"],
                        size304:
                          "size304/" +
                          result[0]["folder"] +
                          "/" +
                          result[0]["file_name"],
                        size640:
                          "size640/" +
                          result[0]["folder"] +
                          "/" +
                          result[0]["file_name"]
                      };

                      item.picture_size = picture_size;
                      cb();
                    });
                  },
                  function(err) {
                    if (err) {
                      return callback(err);
                    } else {
                      callback();
                    }
                  }
                );
              },
              function(callback) {
                redisCaching.saveCache(res, cacheKey, data, function(
                  error,
                  response
                ) {
                  if (error) return callback(error);
                  callback();
                });
              }
            ],
            function(error) {
              if (error) {
                return utils.printJSON(
                  res,
                  utils.getJSONObject(500, error.stack, null)
                );
              } else {
                return utils.printJSON(
                  res,
                  utils.getJSONObject(
                    200,
                    { status: "success", cache: "redis", cache_key: cacheKey },
                    data
                  )
                );
              }
            }
          );
        }
      }
    });
  }
};

module.exports = newsModule;
