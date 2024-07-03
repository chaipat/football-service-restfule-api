var express = require('express');
var config = require('../config/index');
var utils = require('../utils/index');
var log = require('../logging/index');
var request = require('request');
var dateFormat = require('dateformat');
var async = require("async");

var newsModule = require('../app_modules/news');
var columnModule = require('../app_modules/column');
var videoModule = require('../app_modules/video');
var galleryModule = require('../app_modules/gallery');
var livescoreModule = require('../app_modules/livescore');
var matchModule = require('../app_modules/match.js');

var category = express.Router();


category.get("/news/tournament", newsModule.getTournamentNews);
category.get("/news/tournamentHilight", newsModule.getTournamentHilight);

category.get("/news/sport", newsModule.getSportNews);
category.get("/news/byType", newsModule.getNewsByType);

// ----------------- get data from livescore -------------------- //
category.get("/livescore/programs/:leagueid", livescoreModule.getProgram);
category.get("/livescore/programsByTeam/:teamid", livescoreModule.getProgramByTeam);
category.get("/livescore/:topChartType/:tournamentId", livescoreModule.getTopChart);
category.get("/livescore/monthlyprograms/:tournamentId/:year/:month", livescoreModule.getMonthlyPrograms);
category.get("/livescore/monthlyprogramsByTeam/:teamId/:year/:month", livescoreModule.getMonthlyProgramsByTeam);
category.get("/livescore/yearprograms/:tournamentId/:year", livescoreModule.getYearPrograms);
category.get("/livescore/yearprogramsByTeam/:teamId/:year", livescoreModule.getYearProgramsByTeam);

category.get("/match/programs/boxing", matchModule.getBoxingProgram);
category.get("/match/yearprograms/boxing/:year", matchModule.getBoxingYearPrograms);
category.get("/match/analysis/boxing", matchModule.getBoxingAnalysis);
category.get("/match/analysis/boxing/:matchId", matchModule.getBoxingMatchAnalysis);

module.exports = category;
