var express = require('express');
var config = require('../config/index');
var utils = require('../utils/index');
var log = require('../logging/index');
var request = require('request');
var dateFormat = require('dateformat');
var async = require("async");
var Paginator = require("paginator");


var redisCluster = config.getRedisCluster();
var mysql_connection = config.getMySQLConnection();
var redisCaching = require('./redisCaching');
var mysqlModule = require('./mysqlModule');
var cacheKeyPrefix = config.getKeyType() + config.getKeyPrefix() + config.getKeyProjectName();

var searchModule = searchModule.prototype;

function searchModule() { }

searchModule.getSearch = function (req, res, next) {
    var keyword = req.query.q;
    var param_page = parseInt(req.query.page);
    var dayRange = parseInt(req.query.range);

    var data = {};
    var errorCode = 500;
    var tempData = {};
    var listNews = [];
    var listVideo = [];
    var listColumn = [];
    var recordCouter = 0;
    var page_info = {};
    var total_page = 0;
    var total_records = 0;
    var first_result = 0;
    var last_result = 0;

    if (keyword === '' || typeof keyword === 'undefined') {
        return utils.printJSON(res, utils.getJSONObject(400, { 'status': 'keyword not found' }, null));
    }

    if (param_page === null || isNaN(param_page)) {
        param_page = 1;
    }

    // search news
    async.series([
        function (callback) {

            var query = 'SELECT ss_n.news_id2 as news_id, ss_n.icon_pic, ss_n.icon_vdo, ss_n.title, \
      ss_n.description, ss_n.detail, ss_n.create_date AS lastupdate_date, ss_n.countview, ss_n.share, \
      ss_n.sport_id, ss_s.sport_name_th, ss_s.sport_name_en, ss_s.icon, \
      ss_n.tournament_id, ss_t.tournament_name_th, ss_t.tournament_name_en, ss_t.domain, \
      ss_t.url as tournament_url, ss_t.dimension as tournament_dimension, \
      ss_s.url as sport_url, ss_s.dimension as sport_dimension, \
      ss_p.folder, ss_p.file_name, ss_p.ref_type as picture_type \
      FROM ss_news ss_n \
      LEFT JOIN ss_sport ss_s \
      ON ss_n.sport_id = ss_s.sport_id \
      LEFT JOIN ss_tournament ss_t \
      ON ss_n.tournament_id = ss_t.tournament_id \
      LEFT JOIN ss_picture ss_p \
      ON ss_n.news_id2 = ss_p.ref_id AND ss_p.ref_type = 1 \
      WHERE ss_n.status = 1 \
      AND ss_n.approve = 1 \
      AND (ss_n.title like "%' + keyword + '%" \
      OR ss_n.description like "%' + keyword + '%" \
      OR ss_n.detail like "%' + keyword + '%" ) ';
            /*if (dayRange !== null && !isNaN(dayRange)) {
                query += 'AND ss_n.lastupdate_date BETWEEN CURDATE() - INTERVAL ' + dayRange + ' DAY AND CURDATE() ';
            }*/

            query += 'ORDER BY ss_n.create_date DESC ';
            // AND ss_n.lastupdate_date >= date_add(curdate(),interval - ' + dayRange + ' day) \
            //AND ss_n.lastupdate_date >= date_add(curdate(),interval - 30 day) \

            mysqlModule.getData(query, function (error, result) {
                if (error) return callback(error);

                if (!utils.isEmptyObject(result)) {
                    tempData = result;

                    for (var i in tempData) {
                        var picType = 'news';
                        var picture_size = {
                            'fullsize': picType + '/' + tempData[i]['folder'] + '/' + tempData[i]['file_name'],
                            'size128': 'size128/' + tempData[i]['folder'] + '/' + tempData[i]['file_name'],
                            'size224': 'size224/' + tempData[i]['folder'] + '/' + tempData[i]['file_name'],
                            'size304': 'size304/' + tempData[i]['folder'] + '/' + tempData[i]['file_name'],
                            'size640': 'size640/' + tempData[i]['folder'] + '/' + tempData[i]['file_name']
                        };
                        tempData[i].picture_size = picture_size;
                        tempData[i].types = 'news';
                    }

                    listNews = tempData;
                }

                callback();
            });
        },
        function (callback) { // get Video
            var query = 'SELECT sv.video_id2 as news_id, sv.title, sv.caption, sv.lastupdate_date, \
      sv.countview, sv.share, \
      ss_t.tournament_id, ss_t.sport_id, ss_t.tournament_name_th, ss_t.tournament_name_en, ss_t.domain, \
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
      WHERE sv.status = 1 \
      AND sv.approve = 1 \
      AND ss_p.ref_type = 1 \
      AND (sv.title like "%' + keyword + '%" \
      OR sv.caption like "%' + keyword + '%") ';

            /*if (dayRange !== null && !isNaN(dayRange)) {
                query += 'AND sv.lastupdate_date BETWEEN CURDATE() - INTERVAL ' + dayRange + ' DAY AND CURDATE() ';
            }*/

            query += 'ORDER BY sv.lastupdate_date DESC ';

            //AND sv.lastupdate_date >= date_add(curdate(),interval - 30 day) \

            mysqlModule.getData(query, function (error, result) {
                if (error) return callback(error);

                if (!utils.isEmptyObject(result)) {
                    tempData = result;

                    for (var i in tempData) {
                        var picType = 'video';
                        var picture_size = {
                            'fullsize': picType + '/' + tempData[i]['folder'] + '/' + tempData[i]['file_name'],
                            'size128': 'size128/' + tempData[i]['folder'] + '/' + tempData[i]['file_name'],
                            'size224': 'size224/' + tempData[i]['folder'] + '/' + tempData[i]['file_name'],
                            'size304': 'size304/' + tempData[i]['folder'] + '/' + tempData[i]['file_name'],
                            'size640': 'size640/' + tempData[i]['folder'] + '/' + tempData[i]['file_name']
                        };
                        tempData[i].picture_size = picture_size;
                        tempData[i].types = 'video';
                    }
                    listVideo = tempData;
                }
                callback();
            });
        },
        function (callback) { // get Column
            var query = 'SELECT sc.column_id2 as news_id, sc.title, sc.description, sc.detail, sc.lastupdate_date, \
      sc.countview, sc.share, \
      ss_t.tournament_id, ss_t.sport_id, ss_t.tournament_name_th, ss_t.tournament_name_en, ss_t.domain, \
      ss_s.sport_name_th, ss_s.sport_name_en, \
      ss_t.url as tournament_url, ss_t.dimension as tournament_dimension, \
      ss_s.url as sport_url, ss_s.dimension as sport_dimension, \
      ss_p.folder, ss_p.file_name, ss_p.ref_type as picture_type \
      FROM ss_column sc \
      LEFT JOIN ss_tournament ss_t \
      ON sc.tournament_id = ss_t.tournament_id \
      LEFT JOIN ss_sport ss_s \
      ON sc.sport_id = ss_s.sport_id \
      LEFT JOIN ss_picture ss_p \
      ON ss_p.ref_id = sc.column_id2 AND ss_p.ref_type = 2 \
      WHERE sc.status = 1 \
      AND sc.approve = 1 \
      AND (sc.title like "%' + keyword + '%" \
      OR sc.description like "%' + keyword + '%" \
      OR sc.detail like "%' + keyword + '%" ) ';

            /*if (dayRange !== null && !isNaN(dayRange)) {
                query += 'AND sc.lastupdate_date BETWEEN CURDATE() - INTERVAL ' + dayRange + ' DAY AND CURDATE() ';
            }*/

            query += 'ORDER BY sc.create_date DESC  ';

            //AND sc.lastupdate_date >= date_add(curdate(),interval - 30 day) \

            mysqlModule.getData(query, function (error, result) {
                if (error) return callback(error);

                if (result.length > 0) {
                    tempData = result;

                    for (var i in tempData) {
                        var picType = 'column';
                        var picture_size = {
                            'fullsize': picType + '/' + tempData[i]['folder'] + '/' + tempData[i]['file_name'],
                            'size128': 'size128/' + tempData[i]['folder'] + '/' + tempData[i]['file_name'],
                            'size224': 'size224/' + tempData[i]['folder'] + '/' + tempData[i]['file_name'],
                            'size304': 'size304/' + tempData[i]['folder'] + '/' + tempData[i]['file_name'],
                            'size640': 'size640/' + tempData[i]['folder'] + '/' + tempData[i]['file_name']
                        };
                        tempData[i].picture_size = picture_size;
                        tempData[i].types = 'column';
                    }
                    listColumn = tempData;
                }
                callback();
            });
        },
        function (callback) {
            // merge data object

            // merge data object
            if (utils.isEmptyObject(listNews) && utils.isEmptyObject(listVideo) && utils.isEmptyObject(listColumn)) {
                errorCode = 404;
                error = new Error('Data from this tag not found');
                callback(error);
            } else {
                /*if (utils.isEmptyObject(listNews)) {
                    listNews = []
                }*/

                if (listVideo.length > 0) {
                    listVideo.forEach((item, index) => { listNews.push(item) });
                }

                //listNews = [];

                if (listColumn.length > 0) {
                    listColumn.forEach((item, index) => { listNews.push(item) });
                }

                // order data object by date
                data = listNews.sort((a, b) => {
                    return new Date(b.lastupdate_date) - new Date(a.lastupdate_date)
                });

                // count object data
                for (var k in data) {
                    if (data.hasOwnProperty(k)) {
                        ++recordCouter;
                    }
                }
                total_records = recordCouter;

                // create paginate
                // ref: https://www.npmjs.com/package/paginator
                var paginator = new Paginator(10, 7);
                paginator_info = paginator.build(total_records, param_page);
                total_page = paginator_info.total_pages;
                first_result = paginator_info.first_result;
                last_result = paginator_info.last_result + 1;
                page_info = paginator_info;

                if (param_page > total_page) {
                    errorCode = 400;
                    error = new Error('Over page limit');
                    callback(error);
                } else {
                    // slice data for each page view
                    data = data.slice(first_result, last_result)
                    callback();
                }

            }

        }
    ], function (error) {
        if (error) {
            return utils.printJSON(res, utils.getJSONObject(errorCode, error.message, null));

        } else {
            if (utils.isEmptyObject(data)) {
                return utils.printJSON(res, utils.getJSONObject(404, { "status": "data not found" }, null));
            } else {
                return utils.printJSON(res, utils.getJSONObject(200, {
                    "status": "success",
                    "total_records": total_records,
                    "total_page": total_page,
                    "current_page": param_page,
                    "first_result": first_result,
                    "last_result": last_result
                },
                    data));
            }

        }
    });

}

searchModule.getTag = function (req, res, next) {
    var keyword = req.query.q;
    var param_page = parseInt(req.query.page);

    var errorCode = 500;
    var tagId;
    var refId;
    var data = {};
    var tempData = {};
    var listNews = {};
    var listVideo = {};
    var listColumn = {};
    var recordCouter = 0;
    var page_info = {};
    var total_page = 0;
    var total_records = 0;
    var first_result = 0;
    var last_result = 0;

    if (keyword === '' || typeof keyword === 'undefined') {
        return utils.printJSON(res, utils.getJSONObject(400, { 'status': 'keyword not found' }, null));
    }

    if (param_page === null || isNaN(param_page)) {
        param_page = 1;
    }

    async.series([
        function (callback) { // find tag id
            var query = 'SELECT tag_id \
      FROM ss_tag \
      WHERE tag_text = "' + keyword + '"';

            mysqlModule.getData(query, function (error, result) {

                if (error) {
                    return callback(error);
                } else {

                    if (utils.isEmptyObject(result)) {
                        errorCode = 404;
                        error = new Error('Tag not found');
                        callback(error);
                    } else {
                        tagId = result;
                        callback();
                    }
                }
            });

        },

        function (callback) { // search news
            var query = 'SELECT st.ref_id, ss_n.news_id2 as news_id, ss_n.icon_pic, ss_n.icon_vdo, ss_n.title, \
      ss_n.lastupdate_date, ss_n.countview, ss_n.share,\
      ss_n.sport_id, \
      ss_n.tournament_id, \
      ss_t.tournament_name_th, ss_t.tournament_name_en, ss_t.domain, \
      ss_t.url as tournament_url, ss_t.dimension as tournament_dimension, \
      ss_s.sport_name_th, ss_s.sport_name_en, ss_s.url as sport_url, ss_s.dimension as sport_dimension, ss_s.icon, \
      ss_p.folder, ss_p.file_name, ss_p.ref_type as picture_type \
      FROM ss_tag_pair_news as st \
      LEFT JOIN ss_news ss_n \
      ON st.ref_id = ss_n.news_id2 \
      LEFT JOIN ss_sport ss_s \
      ON ss_n.sport_id = ss_s.sport_id \
      LEFT JOIN ss_tournament ss_t \
      ON ss_n.tournament_id = ss_t.tournament_id \
      LEFT JOIN ss_picture ss_p \
      ON ss_n.news_id2 = ss_p.ref_id \
      WHERE st.tag_id = ' + tagId[0].tag_id + ' \
      AND ss_n.status = 1 \
      AND ss_n.approve = 1 \
      AND ss_p.ref_type = 1 \
      ORDER BY ss_n.lastupdate_date DESC ';

            //AND ss_n.lastupdate_date >= date_add(curdate(),interval - 30 day) \

            mysqlModule.getData(query, function (error, result) {
                if (error) return callback(error);

                if (!utils.isEmptyObject(result)) {
                    tempData = result;

                    for (var i in tempData) {
                        var picType = 'news';
                        var picture_size = {
                            'fullsize': picType + '/' + tempData[i]['folder'] + '/' + tempData[i]['file_name'],
                            'size128': 'size128/' + tempData[i]['folder'] + '/' + tempData[i]['file_name'],
                            'size224': 'size224/' + tempData[i]['folder'] + '/' + tempData[i]['file_name'],
                            'size304': 'size304/' + tempData[i]['folder'] + '/' + tempData[i]['file_name'],
                            'size640': 'size640/' + tempData[i]['folder'] + '/' + tempData[i]['file_name']
                        };
                        tempData[i].picture_size = picture_size;
                        tempData[i].types = 'news';
                    }

                    listNews = tempData;
                }
                callback();
            });
        },

        function (callback) { // get Video
            var query = 'SELECT st.ref_id, sv.video_id2 as news_id, sv.title, sv.lastupdate_date, \
      sv.countview, sv.share, \
      ss_t.tournament_id, ss_t.sport_id, ss_t.tournament_name_th, ss_t.tournament_name_en, ss_t.domain, \
      ss_t.url as tournament_url, ss_t.dimension as tournament_dimension, \
      ss_s.sport_name_th, ss_s.sport_name_en, ss_s.url as sport_url, ss_s.dimension as sport_dimension, \
      ss_p.folder, ss_p.file_name, ss_p.ref_type as picture_type \
      FROM ss_tag_pair_clip as st \
      LEFT JOIN ss_video sv \
      ON st.ref_id = sv.video_id2 \
      LEFT JOIN ss_tournament ss_t \
      ON sv.tournament_id = ss_t.tournament_id \
      LEFT JOIN ss_sport ss_s \
      ON sv.sport_id = ss_s.sport_id \
      LEFT JOIN ss_picture ss_p \
      ON sv.video_id2 = ss_p.ref_id \
      WHERE st.tag_id = ' + tagId[0].tag_id + ' \
      AND sv.status = 1 \
      AND sv.approve = 1 \
      AND ss_p.ref_type = 1 \
      ORDER BY sv.lastupdate_date DESC ';

            //AND sv.lastupdate_date >= date_add(curdate(),interval - 30 day) \

            mysqlModule.getData(query, function (error, result) {

                if (error) return callback(error);

                if (!utils.isEmptyObject(result)) {
                    tempData = result;

                    for (var i in tempData) {
                        var picType = 'news';
                        var picture_size = {
                            'fullsize': picType + '/' + tempData[i]['folder'] + '/' + tempData[i]['file_name'],
                            'size128': 'size128/' + tempData[i]['folder'] + '/' + tempData[i]['file_name'],
                            'size224': 'size224/' + tempData[i]['folder'] + '/' + tempData[i]['file_name'],
                            'size304': 'size304/' + tempData[i]['folder'] + '/' + tempData[i]['file_name'],
                            'size640': 'size640/' + tempData[i]['folder'] + '/' + tempData[i]['file_name']
                        };
                        tempData[i].picture_size = picture_size;
                        tempData[i].types = 'video';
                    }
                    listVideo = tempData;
                }
                callback();
            });
        },

        function (callback) { // get Column
            var query = 'SELECT st.ref_id, sc.column_id2 as news_id, sc.title, sc.lastupdate_date, \
      sc.countview, sc.share, \
      ss_t.tournament_id, ss_t.sport_id, ss_t.tournament_name_th, ss_t.tournament_name_en, ss_t.domain, \
      ss_t.url as tournament_url, ss_t.dimension as tournament_dimension, \
      ss_s.sport_name_th, ss_s.sport_name_en, ss_s.url as sport_url, ss_s.dimension as sport_dimension, \
      ss_p.folder, ss_p.file_name, ss_p.ref_type as picture_type \
      FROM ss_tag_pair_column as st \
      LEFT JOIN ss_column sc \
      ON st.ref_id = sc.column_id2 \
      LEFT JOIN ss_tournament ss_t \
      ON sc.tournament_id = ss_t.tournament_id \
      LEFT JOIN ss_sport ss_s \
      ON sc.sport_id = ss_s.sport_id \
      LEFT JOIN ss_picture ss_p \
      ON sc.column_id2 = ss_p.ref_id \
      WHERE st.tag_id = ' + tagId[0].tag_id + ' \
      AND sc.status = 1 \
      AND sc.approve = 1 \
      AND ss_p.ref_type = 1 \
      ORDER BY sc.lastupdate_date DESC ';

            // AND sc.lastupdate_date >= date_add(curdate(),interval - 30 day) \

            mysqlModule.getData(query, function (error, result) {

                if (error) return callback(error);

                if (!utils.isEmptyObject(result)) {
                    tempData = result;

                    for (var i in tempData) {
                        var picType = 'news';
                        var picture_size = {
                            'fullsize': picType + '/' + tempData[i]['folder'] + '/' + tempData[i]['file_name'],
                            'size128': 'size128/' + tempData[i]['folder'] + '/' + tempData[i]['file_name'],
                            'size224': 'size224/' + tempData[i]['folder'] + '/' + tempData[i]['file_name'],
                            'size304': 'size304/' + tempData[i]['folder'] + '/' + tempData[i]['file_name'],
                            'size640': 'size640/' + tempData[i]['folder'] + '/' + tempData[i]['file_name']
                        };
                        tempData[i].picture_size = picture_size;
                        tempData[i].types = 'column';
                    }
                    listColumn = tempData;
                }
                callback();
            });
        },
        function (callback) {
            // merge data object
            if (utils.isEmptyObject(listNews) && utils.isEmptyObject(listVideo) && utils.isEmptyObject(listColumn)) {
                errorCode = 404;
                error = new Error('Data from this tag not found');
                callback(error);
            } else {
                if (utils.isEmptyObject(listNews)) {
                    listNews = []
                }

                if (!utils.isEmptyObject(listVideo)) {
                    listVideo.forEach((item, index) => { listNews.push(item) });
                }

                if (!utils.isEmptyObject(listColumn)) {
                    listColumn.forEach((item, index) => { listNews.push(item) });
                }

                // order data object by date
                data = listNews.sort((a, b) => {
                    return new Date(b.lastupdate_date) - new Date(a.lastupdate_date)
                });

                // count object data
                for (var k in data) {
                    if (data.hasOwnProperty(k)) {
                        ++recordCouter;
                    }
                }
                total_records = recordCouter;

                // create paginate
                // ref: https://www.npmjs.com/package/paginator
                var paginator = new Paginator(10, 7);
                paginator_info = paginator.build(total_records, param_page);
                total_page = paginator_info.total_pages;
                first_result = paginator_info.first_result;
                last_result = paginator_info.last_result + 1;
                page_info = paginator_info;

                if (param_page > total_page) {
                    errorCode = 400;
                    error = new Error('Over page limit');
                    callback(error);
                } else {
                    // slice data for each page view
                    data = data.slice(first_result, last_result)
                    callback();
                }

            }

        }

    ], function (error) {
        if (error) {
            return utils.printJSON(res, utils.getJSONObject(errorCode, error.message, null));

        } else {
            if (utils.isEmptyObject(data)) {
                return utils.printJSON(res, utils.getJSONObject(404, { "status": "data not found" }, null));
            } else {
                return utils.printJSON(res, utils.getJSONObject(200, {
                    "status": "success",
                    "total_records": total_records,
                    "total_page": total_page,
                    "current_page": param_page,
                    "first_result": first_result,
                    "last_result": last_result
                },
                    data));
            }

        }
    });

}

module.exports = searchModule;
