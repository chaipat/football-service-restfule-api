const queryData = require("../../helper/query");
const helper = require("../../helper/helper");

const getHighLight = async highLightId => {
  var query = `
  SELECT news_id, order_by, types, title, description, thumbnail, redirect_url,
  pin_start, pin_end, countview, status, create_date, lastupdate_date
	FROM ss_highlight_news_mapping
	WHERE highlight_category_id=${highLightId}
  ORDER BY ss_highlight_news_mapping.order_by ASC
  LIMIT 10`;

  var newsItem = await queryData.get(query);

  if (helper.isEmptyObject(newsItem)) {
    return null;
  }
  // setup moment date
  helper.addMomentDate(newsItem, "create_date");

  // get content pictures
  newsItem.map(row => {
    row.picture_type = 1;
  });
  var completedNews = await queryData.getContentPicture(newsItem);

  // check news pin
  var content = [];
  completedNews.map(row => {
    isPublish = helper.checkPublish(row.pin_start, row.pin_end);

    if (isPublish) {
      content.push(row);
    }
  });

  return content;
};

const getHighLightGateway = async highLightId => {
  var query = `
  SELECT news_id, order_by, types, title, description, thumbnail, redirect_url,
  pin_start, pin_end, countview, status, create_date, lastupdate_date
	FROM ss_highlight_news_mapping
	WHERE highlight_category_id=${highLightId}
  ORDER BY ss_highlight_news_mapping.order_by ASC
  LIMIT 10`;

  var newsItem = await queryData.get(query);

  if (helper.isEmptyObject(newsItem)) {
    return null;
  }

  // setup moment date
  helper.addMomentDate(newsItem, "create_date");

  // get content pictures
  var news = [];
  var video = [];

  newsItem.map(row => {
    row.picture_type = 1;
    if (row.types === "vdo") {
      video.push(row);
    } else {
      news.push(row);
    }
  });

  try {
    var completedNews = await queryData.getContentPicture(news);
    completedNews = completedNews.concat(video);
  } catch (error) {
    throw error;
  }

  // check news pin
  var content = [];
  completedNews.map(row => {
    isPublish = helper.checkPublish(row.pin_start, row.pin_end);

    if (isPublish) {
      content.push(row);
    }
  });

  return content;
};

const getRelate = async newsId => {
  var query = `
  SELECT nr.news_id, nr.ref_id, ss_n.news_id2 as news_id, ss_n.icon_pic, ss_n.icon_vdo, ss_n.title,
    ss_n.lastupdate_date, ss_n.countview, ss_n.share, ss_n.approve_date, ss_n.start_date, ss_n.expire_date,
    ss_n.countview, ss_n.share,
    ss_t.tournament_id, ss_t.tournament_name_th, ss_t.tournament_name_en, ss_t.domain,
    ss_s.sport_id, ss_s.sport_name_th, ss_s.sport_name_en,
    ss_t.url as tournament_url, ss_t.dimension as tournament_dimension,
    ss_s.url as sport_url, ss_s.dimension as sport_dimension,
    ss_p.ref_type as picture_type
  FROM ss_news_relate nr
  LEFT JOIN ss_news ss_n ON nr.news_id=ss_n.news_id2
  LEFT JOIN ss_tournament ss_t ON ss_n.tournament_id=ss_t.tournament_id
  LEFT JOIN ss_sport ss_s ON ss_n.sport_id = ss_s.sport_id
  LEFT JOIN ss_picture ss_p ON ss_n.news_id2 = ss_p.ref_id
  WHERE nr.ref_id=${newsId}
  AND ss_n.status=1
  AND ss_n.approve=1
  AND ss_n.lang='th'
  AND ss_p.ref_type = 1
  AND ss_p.default = 1`;

  var newsItem = await queryData.get(query);

  if (helper.isEmptyObject(newsItem)) {
    return null;
  }

  // setup moment date
  helper.addMomentDate(newsItem, "approve_date");

  // get content pictures
  var completedNews = await queryData.getContentPicture(newsItem);

  var content = [];
  var isPublish = false;

  // check publish date on each items
  completedNews.map(row => {
    isPublish = helper.checkPublish(row.start_date, row.expire_date);

    if (isPublish) {
      content.push({
        news_id: row.news_id,
        types: row.types,
        title: row.title,
        thumbnail: row.thumbnail,
        lastupdate_date: row.lastupdate_date,
        approve_date: row.approve_date,
        start_date: row.start_date,
        expire_date: row.expire_date,
        view: row.countview,
        share: row.share,
        tournament_id: row.tournament_id,
        tournament_name_th: row.tournament_name_th,
        tournament_name_en: row.tournament_name_en,
        tournament_url: row.tournament_url,
        tournament_dimension: row.tournament_dimension,
        domain: row.domain,
        sport_url: row.sport_url,
        sport_dimension: row.sport_dimension,
        sport_id: row.sport_id,
        sport_name_th: row.sport_name_th,
        sport_name_en: row.sport_name_en,
        custom_date: row.custom_date,
        date_fromnow: row.date_fromnow,
        picture_size: row.picture_size
      });
    }
  });

  return content;
};

const getByTeam = async (teamId, tournamentId, paginatePage, itemPerPage) => {
  var totalRows = 0;
  var totalPages = 0;

  // count total rows
  let queryTotalRows = `
    SELECT count(ss_news.news_id2) as totalRows
    FROM ss_news
    LEFT JOIN ss_news_team_mapping ON ss_news.news_id2=ss_news_team_mapping.news_id
    WHERE ss_news.tournament_id=${tournamentId}
    AND ss_news_team_mapping.team_id=${teamId}
    AND ss_news.status = 1
    AND ss_news.approve = 1
    AND ss_news.lang='th'
  `;

  let result = await queryData.get(queryTotalRows);

  if (result[0].totalRows === 0) {
    return null;
  }

  var totalRows = result[0].totalRows;
  var totalPages = Math.ceil(totalRows / itemPerPage);

  var startLimit = 0;

  if (paginatePage > totalPages) {
    throw {
      code: 400,
      message: "page request is more than total page."
    };
  }

  if (paginatePage > 1) {
    startLimit = itemPerPage * paginatePage - itemPerPage;
  }

  var orderBy = "ORDER BY ss_n.approve_date DESC";

  var query = `SELECT ss_n.news_id2 as news_id, ss_n.icon_pic, ss_n.icon_vdo, ss_n.title,
                ss_n.lastupdate_date, ss_n.countview, ss_n.share, ss_n.approve_date, ss_n.start_date, ss_n.expire_date,
                ss_n.countview, ss_n.share,
                ss_t.tournament_id, ss_t.tournament_name_th, ss_t.tournament_name_en, ss_t.domain,
                ss_s.sport_id, ss_s.sport_name_th, ss_s.sport_name_en,
                ss_t.url as tournament_url, ss_t.dimension as tournament_dimension,
                ss_s.url as sport_url, ss_s.dimension as sport_dimension,
                ss_p.folder, ss_p.file_name, ss_p.ref_type as picture_type
                FROM ss_news ss_n
                LEFT JOIN ss_news_team_mapping ON ss_n.news_id2=ss_news_team_mapping.news_id
                LEFT JOIN ss_tournament ss_t
                ON ss_n.tournament_id = ss_t.tournament_id
                LEFT JOIN ss_sport ss_s
                ON ss_n.sport_id = ss_s.sport_id
                LEFT JOIN ss_picture ss_p
                ON ss_n.news_id2 = ss_p.ref_id
                WHERE ss_n.tournament_id=${tournamentId}
                AND ss_news_team_mapping.team_id=${teamId}
                AND ss_p.ref_type = 1
                AND ss_p.default = 1
                AND ss_n.status = 1
                AND ss_n.approve = 1
                AND ss_n.lang='th'
                ${orderBy}
                LIMIT ${startLimit}, ${itemPerPage}`;

  var newsItem = await queryData.get(query);

  // setup moment date
  helper.addMomentDate(newsItem, "approve_date");

  // get content pictures
  var completedNews = await queryData.getContentPicture(newsItem);

  var content = [];
  var isPublish = false;

  // check publish date on each items
  completedNews.map(row => {
    isPublish = helper.checkPublish(row.start_date, row.expire_date);

    if (isPublish) {
      content.push({
        news_id: row.news_id,
        types: row.types,
        title: row.title,
        thumbnail: row.thumbnail,
        lastupdate_date: row.lastupdate_date,
        approve_date: row.approve_date,
        start_date: row.start_date,
        expire_date: row.expire_date,
        view: row.countview,
        share: row.share,
        tournament_id: row.tournament_id,
        tournament_name_th: row.tournament_name_th,
        tournament_name_en: row.tournament_name_en,
        tournament_url: row.tournament_url,
        tournament_dimension: row.tournament_dimension,
        domain: row.domain,
        sport_url: row.sport_url,
        sport_dimension: row.sport_dimension,
        sport_id: row.sport_id,
        sport_name_th: row.sport_name_th,
        sport_name_en: row.sport_name_en,
        custom_date: row.custom_date,
        date_fromnow: row.date_fromnow,
        picture_size: row.picture_size
      });
    }
  });

  var contentInfo = {
    total_rows: totalRows,
    total_page: totalPages
  };

  return {
    content,
    contentInfo
  };
};

module.exports = {
  getHighLight,
  getHighLightGateway,
  getRelate,
  getByTeam
};
