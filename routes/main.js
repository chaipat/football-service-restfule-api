var express = require('express');
var config = require('../config/index');
var utils = require('../utils/index');
var log = require('../logging/index');
var request = require('request');
var dateFormat = require('dateformat');
var async = require('async');

var newsModule = require('../app_modules/news');
var columnModule = require('../app_modules/column');
var videoModule = require('../app_modules/video');
var galleryModule = require('../app_modules/gallery');
var livescoreModule = require('../app_modules/livescore');
var searchModule = require('../app_modules/search');
var gatewayModule = require('../app_modules/gateway');
var instantNewsModule = require('../app_modules/instantNews');
var sitemapModule = require('../app_modules/sitemap');

var main = express.Router();

// ----------------- get hilight news -------------------- ///
main.get('/news/getHilight/headline', newsModule.getHilightHeadline);
main.get(
  '/news/getHilight/headlineHistory',
  newsModule.getHilightHeadlineHistory
);
main.get('/news/getHilight/hilightNews', newsModule.getHilightNews);
main.get('/news/getHilight/footballThai', newsModule.getHilightFootballThai);
main.get('/news/getHilight/footballInter', newsModule.getHilightFootballInter);
main.get('/news/getHilight/muaySiam', newsModule.getHilightMuaySiam);
main.get('/news/getHilight/sports', newsModule.getHilightSports);
main.get('/news/getHilight/info', newsModule.getHilightInfo);
main.get('/news/getHilight/specialNews', newsModule.getHilightSpecial);

// ----------------- get column -------------------- //
main.get('/column/getHilight/columnists', columnModule.getHilighColumnists);

// ----------------- get video -------------------- //
main.get('/video/getHilight/clipVideo', videoModule.getHilightClipVideo);

// ----------------- get data from livescore -------------------- //
main.get('/livescore/tournament', livescoreModule.getTournament);
main.get('/livescore/playerlist/:teamid', livescoreModule.getPlayerList);
main.get('/livescore/player', livescoreModule.getPlayer);

// ----------------- get search -------------------- //
main.get('/search', searchModule.getSearch);
main.get('/tag', searchModule.getTag);

// ----------------- get gallery -------------------- //
//main.get("/gallery/getHilight/type", galleryModule.getHilightByType);

// ----------------- gateway -------------------- //
main.get('/gateway/seagame', newsModule.getGatewaySeagame);
main.get('/gateway/bein', gatewayModule.getBeinVideo);
main.get('/gateway/cokecup', gatewayModule.getCokeCup);
main.get('/gateway/chang', gatewayModule.getChang);
main.get('/gateway/atletico', gatewayModule.getAtletico);
main.get('/gateway/kingpower', gatewayModule.getKingPower);
main.get('/gateway/kingpowerscup', gatewayModule.getKingPowersCup);
main.get('/gateway/fhm', gatewayModule.getFhm);
main.get('/gateway/sbt', gatewayModule.getSbt);
main.get('/gateway/siamdara', gatewayModule.getSiamdara);
main.get('/gateway/gadgets', gatewayModule.getGadgets);
main.get('/gateway/auto', gatewayModule.getAuto);
main.get('/gateway/bundesliga', gatewayModule.getBundesliga);

// ----------------- FB instant article -------------------- //
main.get('/lastNewsFeed', instantNewsModule.getLastNewsFeed);

// ----------------- Sitemap -------------------- //
main.get('/sitemap/today', sitemapModule.getSitemapToday);
main.get('/sitemap/test', sitemapModule.getSitemapTest);

module.exports = main;
