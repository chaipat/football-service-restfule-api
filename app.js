var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var pmx = require('pmx').init({
  http: true,
  errors: true,
  custom_probes: true,
  network: true,
  ports: true
});

var routes = require('./routes/index');
var main = require('./routes/main'); //Keng
var ads = require('./routes/ads'); //Keng
var category = require('./routes/category'); //Keng
var newsDetail = require('./routes/newsDetail'); //ta
var columnDetail = require('./routes/columnDetail'); //ta
var videoDetail = require('./routes/videoDetail'); //ta
var viewCount = require('./routes/viewCount'); //ball
var viewPageCount = require('./routes/viewPageCount'); //ball
var galleryDetail = require('./routes/galleryDetail'); //ta
var listNews = require('./routes/getListNews2'); //ta
var listSport = require('./routes/getListSport'); //ta
var listColumnist = require('./routes/getListColumn'); //ta
var listColumnTournament = require('./routes/getListColumnTournament'); //ta
var listColumnSport = require('./routes/getListColumnSport'); //ta
var listVideoType = require('./routes/getListVideoType'); //ta
var listAllNews = require('./routes/getListAllNews'); //ta
var listAllColumn = require('./routes/getListAllColumn'); //ta
var listAllVideo = require('./routes/getListAllVideo'); //ta
var listVideoTournament = require('./routes/getListVideoTournament'); //ta
var listVideoSport = require('./routes/getListVideoSport'); //ta
var listAllGallery = require('./routes/getListAllGallery'); //ta
var listGalleryType = require('./routes/getListGalleryType'); //ta
var relateNews = require('./routes/relateNews'); //ball
var relateColumn = require('./routes/relateColumn'); //ball
var relateVideo = require('./routes/relateVideo'); //ball
var listTag = require('./routes/getTag'); //ball
var listSearch = require('./routes/getSearch'); //ball
var listAllColumnistName = require('./routes/getListAllColumnistName'); //ta
var list90Min = require('./routes/getList90Min'); //ta
var viewShareAll = require('./routes/viewShareAll'); //ta
var lastNews = require('./routes/lastNews'); //ta
var topview7Days = require('./routes/getListTopview7Days'); //ta
var playerProfile = require('./routes/playerProfile'); //ta
var teamProfile = require('./routes/teamProfile'); //ta
var relateArticle = require('./routes/relateNewsTeamPlayerProfile'); //ta
var relateVDOArticle = require('./routes/relateVideoTeamPlayerProfile'); //ta
var listTournament = require('./routes/getListTournament'); //ta
var listTournamentCountry = require('./routes/getListTournamentByCountry'); //ta
var clearCache = require('./routes/clearcache'); //ta
var mainPageVideo = require('./routes/indexVideo'); //ta
var listProgram = require('./routes/listProgramAll');
var topview7DaysTournament = require('./routes/getListTopview7DaysTournament');
var listVideoBeinTournament = require('./routes/getListBeinVideoTournament');
var videoBeinDetail = require('./routes/videoBeinDetail');
var indexBein = require('./routes/indexBein');
var listNewsSpecialId = require('./routes/getListNewsSpecialId');
// var listLiveScoreMonthlyMatch = require('./routes/getListLiveScoreMonthlyMatch');
var lastNewsFeed = require('./routes/lastNewsFeed');
var getDetailPage = require('./routes/getDetailPage');

/** API version 2 */
const { apiRoutes } = require('./app/routes/index');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('combined'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/main', main);
app.use('/ads', ads);
app.use('/category', category);
app.use('/detail/news/getDetail', newsDetail);
app.use('/detail/column/getDetail', columnDetail);
app.use('/detail/video/getDetail', videoDetail);
app.use('/viewCount', viewCount);
app.use('/viewPageCount', viewPageCount);
app.use('/detail/gallery/getDetail', galleryDetail);
app.use('/list/news/getList/tournament', listNews);
app.use('/list/news/getList/sport', listSport);
app.use('/list/column/getList/columnist', listColumnist);
app.use('/list/column/getList/tournament', listColumnTournament);
app.use('/list/column/getList/sport', listColumnSport);
app.use('/list/video/getList/type', listVideoType);
app.use('/list/news/getList/all', listAllNews);
app.use('/list/column/getList/all', listAllColumn);
app.use('/list/video/getList/all', listAllVideo);
app.use('/list/video/getList/tournament', listVideoTournament);
app.use('/list/video/getList/sport', listVideoSport);
app.use('/list/gallery/getList/all', listAllGallery);
app.use('/list/gallery/getList/type', listGalleryType);
app.use('/relate/news', relateNews);
app.use('/relate/column', relateColumn);
app.use('/relate/video', relateVideo);
app.use('/tag', listTag);
app.use('/search', listSearch);
app.use('/list/column/getList/columnistname', listAllColumnistName);
app.use('/list/90min', list90Min);
app.use('/viewShareAll', viewShareAll);
app.use('/lastNews', lastNews);
app.use('/topview7Days', topview7Days);
app.use('/playerProfile', playerProfile);
app.use('/teamProfile', teamProfile);
app.use('/relateArticle', relateArticle);
app.use('/relateVDOArticle', relateVDOArticle);
app.use('/listTournament', listTournament);
app.use('/list/tournament/country', listTournamentCountry);
app.use('/clearcache', clearCache);
app.use('/list/video/main', mainPageVideo);
app.use('/list/program', listProgram);
app.use('/topview/tournament', topview7DaysTournament);
app.use('/list/videobein/tournament', listVideoBeinTournament);
app.use('/detail/videobein', videoBeinDetail);
app.use('/list/main/bein', indexBein);
app.use('/list/news/special', listNewsSpecialId);
// app.use('/list/monthlyprogram/football', listLiveScoreMonthlyMatch);
app.use('/lastNewsFeed', lastNewsFeed);
app.use('/detail/page', getDetailPage);

/** API Version 2 */
app.use('/v2/', apiRoutes);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

module.exports = app;
