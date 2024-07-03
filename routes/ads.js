var express = require('express');
var config = require('../config/index');
var utils = require('../utils/index');
var log = require('../logging/index');
var request = require('request');
var dateFormat = require('dateformat');
var async = require("async");

var adsModule = require('../app_modules/ads');

var ads = express.Router();

// ----------------- get ads on home page -------------------- //
ads.get("/getAds/:adsType", adsModule.getAdsType);
ads.get("/getAds/:adsCategory/:id", adsModule.getAdsCategory);

module.exports = ads;
