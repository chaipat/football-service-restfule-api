const express = require('express');
const app = express();

// var home = require('../app/v1/home/index');
//var category = require('../v2/category/index');
// var detail = require('../app/v1/detail/index');
// var statistic = require('../app/v1/statistic/index');
// var search = require('../app/v1/search/index');
// var ads = require('../app/v1/ads/index');
// var service = require('../app/v1/service/index');
var video = require('../v2/video/index');
var timeout = require('../v2/category/timeout/index');


var apiRoutes = express.Router();

apiRoutes.get('/', (req, res) => {
    return res.send('New Siamsport API');
});

/**
 * Category page
 */
//apiRoutes.get('/category/list', category.getList);
// apiRoutes.get('/category/:id', category.getItemList);
// apiRoutes.get('/category/by/:order', category.getByOrder);
// apiRoutes.delete('/category/:id', category.deleteCache);
// apiRoutes.delete('/category/by/:order', category.deleteCache);

/**
 * Video
 */
 apiRoutes.get('/video/sstv', video.sstvList);


/**
 * Timeout
 */
apiRoutes.get('/timeout/highlight', timeout.getHighlight);
apiRoutes.get('/timeout/by/:order', timeout.getByOrder);
apiRoutes.delete('/timeout/highlight', timeout.deleteCache);
apiRoutes.delete('/timeout/by/:order', timeout.deleteCache);

module.exports = {apiRoutes};