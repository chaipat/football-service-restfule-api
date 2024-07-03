// *** Create 22/12/2016. ta ***

var express = require('express');
var config = require('../config/index')
var utils = require('../utils/index');
var log = require('../logging/index');
var async = require("async");
var fs = require('fs');
var path = require('path');

var router = express.Router();
var redis_key = config.getKeyType() + config.getKeyPrefix() + config.getKeyProjectName() + 'team-profile-';
var cache_timeout = 60; // 1 minute
var static_image_url = config.getStaticImageURL();
// var dir_name = "/app/siamsport.co.th/livescore/backend/public_html/uploads/player/"; //st
var dir_name = "/app/web/siamsport.co.th/livescore.siamsport.co.th/backend/uploads/player/"; //prod
var async = require('async');


function getDimension(team_id, callback) {
    
    var query = "SELECT a.`team_id`, a.`tournament_id`, a.`liveteam_id`, a.`livetour_id`, ";
    query += " b.`sport_id`, b.url as tournament_url, b.dimension as tournament_dimension, ";
    query += " c.url as sport_url, c.dimension as sport_dimension ";
    query += " FROM `ss_team` a LEFT JOIN ss_tournament b ON a.livetour_id = b.livescore_id ";
    query += " LEFT JOIN ss_sport c ON b.sport_id = c.sport_id WHERE a.liveteam_id = ? ";

    var connection = config.getMySQLConnection();
    connection.connect();

    connection.query({
        sql: query,
        timeout: 2000,
        values: team_id
    }, function(error, result) {

        if (!utils.isEmptyObject(result) && result.length > 0) {
            callback(error, result);
        } else {
            result = [];
            callback(error, result);
        }
        connection.end();
    });

}

function getStanding(mysql_connection, team_id, callback) {
    var data = {};

    query = "SELECT sp_xml_standing.country, sp_xml_standing.`tournament_id`, sp_tournament.tournament_name as tournament_name_th, ";
    query += " sp_xml_standing.`tournament_name` as tournament_name_en, sp_team.team_name, ";
    query += " sp_xml_standing.group_name ";
    query += " FROM sp_xml_standing ";
    query += " LEFT JOIN sp_team ON sp_xml_standing.team_id = sp_team.team_id ";
    query += " LEFT JOIN sp_tournament ON sp_xml_standing.tournament_id = sp_tournament.tournament_id ";
    query += " WHERE sp_xml_standing.team_id  = ? ";
    query += " GROUP BY sp_xml_standing.tournament_id ";

    async.series([
        function(callback) {
            mysql_connection.query({
                sql: query,
                timeout: 2000,
                values: team_id
            }, function(error, result) {
                if (error) {
                    callback(error, error.stack);
                } else {
                    data = result;
                    callback();
                }
            });
        },
        function(callback) {
            async.each(data, function(item, cb) {

                var query_data = [];
                var query = "";

                if (item.country.toUpperCase() === "International".toUpperCase()) {

                    query_data.push(item.tournament_id, item.group_name, item.tournament_id);

                    query = " SELECT distinct(sp_xml_standing.team_id), country, sp_xml_standing.`tournament_id`, sp_tournament.`tournament_name`, ";
                    query += " sp_xml_standing.`season`,`team_position`, sp_xml_standing.`team_id`, ";
                    query += " sp_team.`team_name`, sp_team.`team_name_en`, `group_name`, ";
                    query += " `overall_gp`, `overall_w`, `overall_d`, `overall_l`, `overall_gs`, ";
                    query += " `overall_ga`, `total_gd`, `total_p`, `description`, ";
                    query += " DATE_FORMAT(sp_xml_standing.`lastupdate_date`, '%d-%m-%Y %H:%m') as lastupdate_date ";
                    query += " FROM `sp_xml_standing` ";
                    query += " LEFT JOIN sp_team ON sp_xml_standing.team_id = sp_team.team_id ";
                    query += " LEFT JOIN sp_tournament ON sp_xml_standing.tournament_id = sp_tournament.tournament_id ";
                    query += " WHERE ( sp_xml_standing.tournament_id = ? ";
                    query += " and group_name = ? ";
                    query += " AND round = (SELECT MAX(round) FROM sp_xml_standing WHERE tournament_id = ? ) )";
                    query += " ORDER BY team_position ASC, total_p DESC, total_gd DESC";
                    //query += " GROUP BY sp_xml_standing.team_id ";
                    //query += " ORDER BY sp_xml_standing.team_position ASC ";

                } else {
                    // for local league.
                    query_data.push(item.tournament_id, item.tournament_id);

                    query = "SELECT distinct(sp_xml_standing.team_id), country, sp_xml_standing.`tournament_id`, sp_tournament.`tournament_name`, sp_xml_standing.`season`,`team_position`, ";
                    query += " sp_xml_standing.`team_id`, sp_team.`team_name`, sp_team.`team_name_en`, `group_name`, `overall_gp`, `overall_w`, `overall_d`, ";
                    query += " `overall_l`, `overall_gs`, `overall_ga`, `total_gd`, `total_p`, `description`, ";
                    query += " DATE_FORMAT(sp_xml_standing.`lastupdate_date`, '%d-%m-%Y %H:%m') as lastupdate_date ";
                    query += " FROM `sp_xml_standing` ";
                    query += " LEFT JOIN sp_team ON sp_xml_standing.team_id = sp_team.team_id ";
                    query += " LEFT JOIN sp_tournament ON sp_xml_standing.tournament_id = sp_tournament.tournament_id ";
                    query += " WHERE (sp_xml_standing.tournament_id = ? ";
                    query += " AND round = (SELECT MAX(round) FROM sp_xml_standing WHERE tournament_id = ? ) )";
                    query += " ORDER BY team_position ASC, total_p DESC, total_gd DESC";
                    //query += " WHERE sp_xml_standing.tournament_id = ? ";
                    //query += " GROUP BY sp_xml_standing.team_id ORDER BY sp_xml_standing.team_position ASC -- team_id= 9260, tournament_id = 1007, 1204 / team_id=15702, tournament_id= 1005, 1399 ";
                }

                mysql_connection.query({
                    sql: query,
                    timeout: 2000,
                    values: query_data
                }, function(error3, result) {

                    if (error3) {
                        callback(error3, error3.stack);
                    } else {

                        if (item.country.toUpperCase() != "International".toUpperCase()) {
                            var res = [];
                            for (var i = 0; i < result.length; i++) {

                                if (result[i].team_position == 1 && result[i].team_id == team_id) {

                                    res[0] = result[0];
                                    res[1] = result[1];
                                    res[2] = result[2];
                                } else if (result[i].team_position == result.length && result[i].team_id == team_id) {
                                    var prev1 = i-1;
                                    var prev2 = i-2;

                                    res[0] = result[prev2];
                                    res[1] = result[prev1];
                                    res[2] = result[i];
                                } else if (result[i].team_id == team_id) {
                                    var prev = i - 1;
                                    var next = i + 1;

                                    res[0] = result[prev];
                                    res[1] = result[i];
                                    res[2] = result[next];
                                }
                            }

                            item.table = res;

                        } else {
                            item.table = result;
                        }

                        cb();
                    }
                });


            }, function(error2) {
                if (error2) {
                    callback(error2, error2.stack);
                } else {
                    callback();
                }
            });
        }

    ], function(error) {
        if (error) {
            callback(error, error.stack);
        } else {
            callback(error, data);
        }
    });

}


function getRelateVideo(team_id, callback) {
    var relate_video = [];
    query = "SELECT ss_video_team_mapping.video_id as id, ss_video.tournament_id, ss_video.sport_id, ";
    query += " ss_video.embed_video, ss_video.title, ss_video.countview, ss_video.share, ";
    query += " ss_video.shorturl, ss_video.order_by, ";
    query += " DATE_FORMAT(ss_video.create_date, '%d-%m-%Y %H:%m') as create_date, ";
    query += " DATE_FORMAT(ss_video.lastupdate_date, '%d-%m-%Y %H:%m') as lastupdate_date, ";
    query += " ss_picture.ref_type as picture_type, ss_picture.folder, ss_picture.file_name, ";
    query += " ss_tournament.tournament_name_th, ss_tournament.tournament_name_en, ss_tournament.url as tournament_url, ss_tournament.dimension as tournament_dimension, ss_tournament.domain as domain, ";
    query += " ss_sport.sport_name_th, ss_sport.sport_name_en, ss_sport.url as sport_url, ss_sport.dimension as sport_dimension ";
    query += " FROM ss_team ";
    query += " LEFT JOIN ss_video_team_mapping ON ss_video_team_mapping.team_id = ss_team.team_id ";
    query += " LEFT JOIN ss_video ON ss_video_team_mapping.video_id = ss_video.video_id2 ";
    query += " LEFT JOIN ss_picture ON ss_video_team_mapping.video_id = ss_picture.ref_id AND (ss_picture.ref_type =  4 AND ss_picture.default = 1) ";
    query += " LEFT JOIN ss_tournament ON ss_video.tournament_id = ss_tournament.tournament_id ";
    query += " LEFT JOIN ss_sport ON ss_video.sport_id = ss_sport.sport_id ";
    query += " WHERE ss_team.liveteam_id = ? ";
    query += " ORDER BY ss_video_team_mapping.lastupdate_date DESC ";
    query += " LIMIT 3 ";

    var connection = config.getMySQLConnection();
    connection.connect();

    connection.query({
        sql: query,
        timeout: 2000,
        values: team_id
    }, function(error, result) {

        if (!utils.isEmptyObject(result) && result.length > 0) {

            if (result[0]["id"] == null) {
                result = [];
            } else {
                for (var i = 0; i < result.length; i++) {

                    var obj = result[i];
                    obj.types = "video";
                    result[i] = obj;

                    var data2 = result[i];
                    for (var j in data2) {

                        var picType = 'video';
                        var picture_size = {

                            'fullsize': picType + '/' + data2['folder'] + '/' + data2['file_name'],
                            'size128': 'size128/' + data2['folder'] + '/' + data2['file_name'],
                            'size224': 'size224/' + data2['folder'] + '/' + data2['file_name'],
                            'size304': 'size304/' + data2['folder'] + '/' + data2['file_name'],
                            'size640': 'size640/' + data2['folder'] + '/' + data2['file_name']
                        };

                        result[i].picture_size = picture_size;
                    }
                }

            }

            callback(error, result);

        } else {
            result = [];
            callback(error, result);
        }


        connection.end();
    });

}

function getRelateNews(team_id, callback) {
    var relate_news = [];
    query = "SELECT ss_team.team_id, ss_team.liveteam_id, ss_news_team_mapping.news_id as id,";
    query += " ss_news.tournament_id, ss_news.title, ss_news.sport_id, ss_news.icon_pic, ";
    query += " ss_news.icon_vdo, ss_news.news_special_id, ss_ns.name as news_special_name, ss_news.headline, ss_news.title, ss_news.countview, ";
    query += " ss_news.share, ss_news.comment_fb, ss_news.like_fb, ";
    query += " DATE_FORMAT(ss_news.create_date, '%Y-%m-%d %H:%m') as create_date, ";
    query += " DATE_FORMAT(ss_news.lastupdate_date, '%Y-%m-%d %H:%m') as lastupdate_date, ";
    query += " ss_picture.ref_type as picture_type, ss_picture.folder, ss_picture.file_name, ";
    query += " ss_news.redirect_url, ss_news.order_by, ss_tournament.tournament_name_th, ";
    query += " ss_tournament.tournament_name_en, ss_tournament.url as tournament_url, ss_tournament.dimension as tournament_dimension, ss_tournament.domain as domain, ";
    query += " ss_sport.sport_name_th, ss_sport.sport_name_en, ss_sport.url as sport_url, ss_sport.dimension as sport_dimension ";
    query += " FROM ss_team ";
    query += " LEFT JOIN ss_news_team_mapping ON ss_news_team_mapping.team_id = ss_team.team_id ";
    query += " LEFT JOIN ss_news ON ss_news_team_mapping.news_id = ss_news.news_id2 ";
    query += " LEFT JOIN ss_picture ON ss_news_team_mapping.news_id = ss_picture.ref_id ";
    query += " LEFT JOIN ss_tournament ON ss_news.tournament_id = ss_tournament.tournament_id ";
    query += " LEFT JOIN ss_sport ON ss_news.sport_id = ss_sport.sport_id ";
    query += " LEFT JOIN ss_news_special ss_ns ON ss_news.news_special_id = ss_ns.news_special_id ";
    query += " WHERE ss_team.liveteam_id = ? ";
    query += " AND ss_news.status = 1 AND ss_news.approve = 1 AND ss_news.lang = 'th' ";
    query += " AND ss_picture.ref_type = 1 ";
    query += " ORDER BY ss_news.lastupdate_date DESC ";
    query += " LIMIT 3 ";

    var connection = config.getMySQLConnection();
    connection.connect();

    connection.query({
        sql: query,
        timeout: 2000,
        values: team_id
    }, function(error, result) {

        if (!utils.isEmptyObject(result) && result.length > 0) {
            if (result[0]["id"] == null) {
                result = [];
            } else {
                for (var i = 0; i < result.length; i++) {

                    var obj = result[i];
                    obj.types = "news";
                    result[i] = obj;

                    var data2 = result[i];
                    for (var j in data2) {

                        var picType = 'news';
                        var picture_size = {

                            'fullsize': picType + '/' + data2['folder'] + '/' + data2['file_name'],
                            'size128': 'size128/' + data2['folder'] + '/' + data2['file_name'],
                            'size224': 'size224/' + data2['folder'] + '/' + data2['file_name'],
                            'size304': 'size304/' + data2['folder'] + '/' + data2['file_name'],
                            'size640': 'size640/' + data2['folder'] + '/' + data2['file_name']
                        };

                        result[i].picture_size = picture_size;
                    }
                }
            }

            callback(error, result);
        } else {
            result = [];
            callback(error, result);
        }

        connection.end();
    });

}

function getTeamAchievement(mysql_connection, team_id, callback) {

    var data = [];
    data.push(team_id, team_id);

    var squad = [];

    query = "SELECT sp.`program_id`, sp.`fix_id`, sp.`static_id`, sp.`league_id`, sp.`hometeam_id`, ";
    query += " sp.`hometeam_title`, th.team_name_en as hometeam_title_en , sp.`hometeam_point`, sp.`awayteam_id`, ";
    query += " sp.`awayteam_title`, ta.team_name_en as awayteam_title_en, sp.`awayteam_point`, ";
    query += " DATE_FORMAT(DATE_ADD(sp.`kickoff`, INTERVAL 7 HOUR), '%d-%m-%Y %H:%m') as kickoff, ";
    query += " DATE_FORMAT(sp.`lastupdate_date`, '%d-%m-%y %H:%m') AS lastupdate_date ";
    query += " FROM `sp_program` sp  ";
    query += " LEFT JOIN sp_team th ON sp.hometeam_id = th.team_id ";
    query += " LEFT JOIN sp_team ta ON sp.awayteam_id = ta.team_id ";
    query += " WHERE (sp.hometeam_id = ? and sp.status = 2) ";
    query += " OR (sp.awayteam_id = ? AND sp.status = 2) ";
    query += " ORDER BY DATE_ADD(sp.kickoff, INTERVAL 7 HOUR) DESC LIMIT 5 ";

    mysql_connection.query({
        sql: query,
        timeout: 2000, //2 Sec.
        values: data
    }, function(error, result) {

        callback(error, result);
    });
}

function getTeamProgram(mysql_connection, team_id, callback) {

    var data = [];
    data.push(team_id, team_id);

    var squad = [];

    query = " SELECT sp.`program_id`, sp.`fix_id`, sp.`static_id`, sp.`league_id`, ";
    query += " sp.`hometeam_id`, sp.`hometeam_title`, th.team_name_en as hometeam_title_en, ";
    query += " sp.`awayteam_id`, sp.`awayteam_title`, ta.team_name_en as awayteam_title_en, ";
    query += " DATE_FORMAT(DATE_ADD(`kickoff`, INTERVAL 7 HOUR), '%d-%m-%Y %H:%m') as kickoff, ";
    query += " DATE_FORMAT(sp.`lastupdate_date`, '%d-%m-%y %H:%m') AS lastupdate_date ";
    query += " FROM `sp_program` sp ";
    query += " LEFT JOIN sp_team th ON sp.hometeam_id = th.team_id ";
    query += " LEFT JOIN sp_team ta on sp.awayteam_id = ta.team_id ";
    query += " WHERE (sp.hometeam_id = ? and sp.`status` = 1) ";
    query += " OR (sp.awayteam_id = ? AND sp.`status` = 1) ";
    query += " ORDER BY DATE_ADD(sp.kickoff, INTERVAL 7 HOUR)  ASC LIMIT 5 ";


    mysql_connection.query({
        sql: query,
        timeout: 2000, //2 Sec.
        values: data
    }, function(error, result) {

        callback(error, result);
    });
}

function getPlayerTopAssists(mysql_connection, team_id, callback) {
    var squad = [];
    query = " SELECT sp_xml_team_squad.player_id,sp_xml_team_squad.name AS player_name, sp_player_profile.firstname as firstname_en, ";
    query += " sp_player_profile.lastname as lastname_en, sp_player_profile.firstname_th, ";
    query += " sp_player_profile.lastname_th, sp_xml_team_squad.number, ";
    query += " sp_xml_team_squad.position, sp_xml_team_squad.assists ";
    query += " FROM sp_xml_team_squad ";
    query += " LEFT JOIN sp_player_profile ";
    query += " ON sp_xml_team_squad.player_id = sp_player_profile.profile_id ";
    query += " WHERE sp_xml_team_squad.team_id = ? ";
    query += " ORDER BY sp_xml_team_squad.assists DESC ";
    query += " LIMIT 5 ";

    mysql_connection.query({
        sql: query,
        timeout: 2000, //2 Sec.
        values: team_id
    }, function(error, result) {

        if (!utils.isEmptyObject(result) && result.length > 0) {

            for (var i = 0; i < result.length; i++) {

                var path_file = path.join(dir_name + team_id + '/' + result[i]['player_id']);

                if (fs.existsSync(path_file)) {
                    var data = fs.readFileSync(path_file, 'utf8');
                    result[i].image = data;
                } else {
                    var data = null;
                    result[i].image = data;
                }

                if (result[i].firstname_th === null) {
                    result[i].firstname_th = result[i].player_name;
                }
    
                if (result[i].firstname_en === null) {
                    result[i].firstname_en = result[i].player_name;
                }

            }

        } else {
            result = [];
        }



        callback(error, result);
    });
}

function getPlayerTopScore(mysql_connection, team_id, callback) {
    var squad = [];
    query = " SELECT sp_xml_team_squad.player_id, sp_player_profile.firstname as firstname_en, ";
    query += " sp_player_profile.lastname as lastname_en, sp_player_profile.firstname_th, ";
    query += " sp_player_profile.lastname_th, sp_xml_team_squad.number, ";
    query += " sp_xml_team_squad.position, sp_xml_team_squad.goals ";
    query += " FROM sp_xml_team_squad ";
    query += " LEFT JOIN sp_player_profile ";
    query += " ON sp_xml_team_squad.player_id = sp_player_profile.profile_id ";
    query += " WHERE sp_xml_team_squad.team_id = ? ";
    query += " ORDER BY sp_xml_team_squad.goals DESC ";
    query += " LIMIT 5 ";

    mysql_connection.query({
        sql: query,
        timeout: 2000, //2 Sec.
        values: team_id
    }, function(error, result) {

        if (!utils.isEmptyObject(result) && result.length > 0) {

            for (var i = 0; i < result.length; i++) {

                var path_file = path.join(dir_name + team_id + '/' + result[i]['player_id']);

                if (fs.existsSync(path_file)) {
                    var data = fs.readFileSync(path_file, 'utf8');
                    result[i].image = data;

                } else {
                    var data = null;
                    result[i].image = data;
                }

            }

        } else {
            result = [];
        }

        callback(error, result);
    });
}

function getPlayerAppearences(mysql_connection, team_id, callback) {
    var squad = [];
    query = " SELECT sp_xml_team_squad.player_id, sp_player_profile.firstname as firstname_en, ";
    query += " sp_player_profile.lastname as lastname_en, sp_player_profile.firstname_th, ";
    query += " sp_player_profile.lastname_th, sp_xml_team_squad.number, sp_xml_team_squad.age, ";
    query += " sp_xml_team_squad.position, sp_xml_team_squad.appearences, sp_xml_team_squad.lineups, ";
    query += " sp_xml_team_squad.substitute_in, sp_xml_team_squad.goals, sp_xml_team_squad.assists, ";
    query += " sp_xml_team_squad.yellowcards, sp_xml_team_squad.yellowred, sp_xml_team_squad.redcards ";
    query += " FROM sp_xml_team_squad ";
    query += " LEFT JOIN sp_player_profile ";
    query += " ON sp_xml_team_squad.player_id = sp_player_profile.profile_id ";
    query += " WHERE sp_xml_team_squad.team_id = ? ";
    query += " ORDER BY sp_xml_team_squad.appearences DESC ";
    query += " LIMIT 5 ";

    mysql_connection.query({
        sql: query,
        timeout: 2000, //2 Sec.
        values: team_id
    }, function(error, result) {

        if (!utils.isEmptyObject(result) && result.length > 0) {

            for (var i = 0; i < result.length; i++) {

                var path_file = path.join(dir_name + team_id + '/' + result[i]['player_id']);

                if (fs.existsSync(path_file)) {
                    var data = fs.readFileSync(path_file, 'utf8');
                    result[i].image = data;
                } else {
                    var data = null;
                    result[i].image = data;
                }

                if (result[i].firstname_th === null) {
                    result[i].firstname_th = result[i].firstname_en;
                }
    
                if (result[i].lastname_th === null) {
                    result[i].lastname_th = result[i].lastname_en;
                }
            }

        } else {
            result = [];
        }

        callback(error, result);
    });
}

function getTeamSquad(mysql_connection, team_id, callback) {
    var squad = [];
    query = " SELECT sp_xml_team_squad.player_id, sp_player_profile.firstname as firstname_en, ";
    query += " sp_player_profile.lastname as lastname_en, sp_player_profile.firstname_th, ";
    query += " sp_player_profile.lastname_th, sp_xml_team_squad.number, sp_xml_team_squad.age, ";
    query += " sp_xml_team_squad.position, sp_xml_team_squad.appearences, sp_xml_team_squad.lineups, ";
    query += " sp_xml_team_squad.substitute_in, sp_xml_team_squad.goals, sp_xml_team_squad.assists, ";
    query += " sp_xml_team_squad.yellowcards, sp_xml_team_squad.yellowred, sp_xml_team_squad.redcards ";
    query += " FROM sp_xml_team_squad ";
    query += " LEFT JOIN sp_player_profile ";
    query += " ON sp_xml_team_squad.player_id = sp_player_profile.profile_id ";
    query += " WHERE sp_xml_team_squad.team_id = ? AND sp_player_profile.firstname IS NOT NULL ";

    mysql_connection.query({
        sql: query,
        timeout: 2000, //2 Sec.
        values: team_id
    }, function(error, result) {
        for (var i in result) {
            if (result[i].firstname_th === null) {
                result[i].firstname_th = result[i].firstname_en;
            }

            if (result[i].lastname_th === null) {
                result[i].lastname_th = result[i].lastname_en;
            }
        }
        callback(error, result);
    });
}

function getRanking(mysql_connection, team_id, callback) {
    var query = "";

    query = " SELECT sp_team.team_id, sp_team.team_name as team_name_th, sp_team.team_name_en, ";
    query += " sp_team.league_id, sp_xml_team.country, sp_xml_team.is_national_team, ";
    query += " sp_xml_team.founded, sp_xml_team.venue_name as stadium_name_en, ";
    query += " sp_xml_team.venue_address as stadium_address, sp_xml_team.venue_surface as stadium_surface, ";
    query += " sp_xml_team.venue_capacity as stadium_capacity, sp_xml_team.coach_name as manager_name_en, ";
    query += " sp_standing.team_position, sp_standing.overall_gp, sp_standing.overall_w, ";
    query += " sp_standing.overall_d, sp_standing.overall_l, sp_standing.overall_gs, ";
    query += " sp_standing.overall_ga, sp_standing.total_gd, sp_standing.total_p, ";
    query += " sp_standing.description, DATE_FORMAT(sp_standing.lastupdate_date, '%Y-%m-%d %H:%m' ) as lastupdate_date ";
    query += " FROM sp_team LEFT JOIN sp_xml_team ON sp_team.team_id = sp_xml_team.team_id ";
    query += " LEFT JOIN sp_standing ON sp_team.team_id = sp_standing.team_id AND sp_team.league_id = sp_standing.tournament_id ";
    query += " WHERE sp_team.team_id = ? ";
    query += " AND sp_team.status = 1 ";

    mysql_connection.query({
        sql: query,
        timeout: 2000, //2 Sec.
        values: team_id
    }, function(error, result) {
        callback(error, result);
    });

}


function getTeamProfile(mysql_connection, team_id, callback) {
    var query = "";

    query = " SELECT sp_team.team_id, sp_team.team_name as team_name_th, sp_team.team_name_en, ";
    query += " sp_team.league_id, sp_xml_clear_leauge.leauge_name, sp_xml_team.country, sp_xml_team.is_national_team, ";
    query += " sp_xml_team.founded, sp_xml_team.venue_name as stadium_name_en, ";
    query += " sp_xml_team.venue_address as stadium_address, sp_xml_team.venue_surface as stadium_surface, ";
    query += " sp_xml_team.venue_capacity as stadium_capacity, sp_xml_team.coach_name as manager_name_en, ";
    query += " sp_xml_standing.team_position, sp_xml_standing.overall_gp, sp_xml_standing.overall_w, ";
    query += " sp_xml_standing.overall_d, sp_xml_standing.overall_l, sp_xml_standing.overall_gs, ";
    query += " sp_xml_standing.overall_ga, sp_xml_standing.total_gd, sp_xml_standing.total_p, ";
    query += " sp_xml_standing.description, DATE_FORMAT(sp_xml_standing.lastupdate_date, '%Y-%m-%d %H:%m' ) as lastupdate_date ";
    query += " FROM sp_team LEFT JOIN sp_xml_team ON sp_team.team_id = sp_xml_team.team_id ";
    query += " LEFT JOIN sp_xml_standing ON sp_team.team_id = sp_xml_standing.team_id AND sp_team.league_id = sp_xml_standing.tournament_id ";
    query += " LEFT JOIN sp_xml_clear_leauge ON sp_team.league_id = sp_xml_clear_leauge.leauge_id ";
    query += " WHERE sp_team.team_id = ? ";
    query += " AND sp_team.status = 1 ORDER BY lastupdate_date DESC LIMIT 1";

    mysql_connection.query({
        sql: query,
        timeout: 2000, //2 Sec.
        values: team_id
    }, function(error, result) {
        callback(error, result);
    });

}

router.get('/:team_id', function(req, res, next) {
    
    var team_id = req.params.team_id;
    var teaminfo = {};

    var mysql_connection = config.getLivescoreMySQLConnection();
    mysql_connection.connect();

    async.parallel([
        function(callback) {

            getTeamProfile(mysql_connection, team_id, function(err, data) {
                if (err) return callback(err);
                teaminfo.info = data;
                callback();
            });

        },
        function(callback) {
            getTeamSquad(mysql_connection, team_id, function(err, data) {
                if (err) return callback(err);

                for (var i in data) {
                    if (data[i].firstname_th === null) {
                        data[i].firstname_th = data[i].firstname_en;
                    }
        
                    if (data[i].lastname_th === null) {
                        data[i].lastname_th = data[i].lastname_en;
                    }
                }

                teaminfo.squad = data;
                callback();
            });
        },
        function(callback) {
            getPlayerAppearences(mysql_connection, team_id, function(err, data) {
                if (err) return callback(err);
                for (var i in data) {
                    if (data[i].firstname_th === null) {
                        data[i].firstname_th = data[i].firstname_en;
                    }
        
                    if (data[i].lastname_th === null) {
                        data[i].lastname_th = data[i].lastname_en;
                    }
                }
                teaminfo.appearences = data;
                callback();
            });
        },
        function(callback) {
            getPlayerTopScore(mysql_connection, team_id, function(err, data) {
                if (err) return callback(err);

                for (var i in data) {
                    if (data[i].firstname_th === null) {
                        data[i].firstname_th = data[i].firstname_en;
                    }
        
                    if (data[i].lastname_th === null) {
                        data[i].lastname_th = data[i].lastname_en;
                    }
                }

                teaminfo.topscore = data;
                callback();
            });
        },
        function(callback) {
            getPlayerTopAssists(mysql_connection, team_id, function(err, data) {
                if (err) return callback(err);

                for (var i in data) {
                    if (data[i].firstname_en === null) {
                        data[i].firstname_en = data[i].player_name;
                    }
        
                    if (data[i].firstname_th === null) {
                        data[i].firstname_th = data[i].player_name;
                    }
                }
                teaminfo.topassists = data;
                callback();
            });
        },
        function(callback) {
            getTeamProgram(mysql_connection, team_id, function(err, data) {
                if (err) return callback(err);
                teaminfo.program = data;
                callback();
            });
        },
        function(callback) {
            getTeamAchievement(mysql_connection, team_id, function(err, data) {
                if (err) return callback(err);
                teaminfo.achievement = data;
                callback();
            });
        },
        function(callback) {
            getRelateNews(team_id, function(err, data) {
                teaminfo.relate_news = data;
                callback();
            });
        },
        function(callback) {
            getStanding(mysql_connection, team_id, function(err, data) {
                teaminfo.standing = data;
                callback();
            });
        },
        function(callback) {
            getDimension(team_id, function(err, data) {
                teaminfo.dimension = data;
                callback();
            });
        },
        function(callback) {
            getRelateVideo(team_id, function(err, data) {
                teaminfo.relate_video = data;
                callback();
            });
        }

    ], function(err) {

        mysql_connection.end();
        if (err) {
            utils.printJSON(res, utils.getJSONObject(500, err.stack, teaminfo));
        } else {
            utils.printJSON(res, utils.getJSONObject(200, 'success', teaminfo));
        }
    });

});

module.exports = router;
