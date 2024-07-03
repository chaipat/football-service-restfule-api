const queryData = require("../../helper/query");
const helper = require("../../helper/helper");

const getHighlight = async highLightId => {
  var query = `
  SELECT news_id as column_id, order_by, types, title, description, thumbnail, redirect_url,
  pin_start, pin_end, countview, status, create_date, lastupdate_date
  FROM ss_highlight_news_mapping
  WHERE highlight_category_id =  ${highLightId}
  ORDER BY ss_highlight_news_mapping.order_by ASC
  LIMIT 10`;

  var columnItem = await queryData.get(query);

  if (helper.isEmptyObject(columnItem)) {
    return null;
  }
  // setup moment date
  helper.addMomentDate(columnItem, "create_date");

  // get content pictures
  columnItem.map(row => {
    row.picture_type = 2;
  });
  var completedColumn = await queryData.getContentPicture(columnItem);

  // check column pin
  var content = [];
  completedColumn.map(row => {
    isPublish = helper.checkPublish(row.pin_start, row.pin_end);

    if (isPublish) {
      content.push(row);
    }
  });

  return content;
};

const getByTeam = async (teamId, tournamentId, paginatePage, itemPerPage) => {
  var totalRows = 0;
  var totalPages = 0;

  // count total rows
  let queryTotalRows = `
    SELECT count(ss_column.column_id2) as totalRows
    FROM ss_column
    LEFT JOIN ss_column_team_mapping ON ss_column.column_id2=ss_column_team_mapping.column_id
    WHERE ss_column.tournament_id=${tournamentId}
    AND ss_column_team_mapping.team_id=${teamId}
    AND ss_column.status = 1
    AND ss_column.approve = 1
    AND ss_column.lang='th'
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

  var orderBy = "ORDER BY ss_column.approve_date DESC";

  var query = `SELECT ss_column.column_id2 as column_id, ss_column.match_id, ss_column.profile_id, ss_column.sport_id, 
                ss_column.tournament_id, ss_column.micro_id, ss_column.icon_pic, ss_column.icon_vdo, ss_column.lang, 
                ss_column.columnist_id, columnist.name as columnist_name, columnist.alias as columnist_alias, columnist.avatar as columnist_avatar, 
                ss_column.title, ss_column.embed_script, ss_column.keyword, ss_column.shorturl, ss_column.redirect_url, 
                ss_column.can_comment, ss_column.rate18_flag, ss_column.countview, ss_column.share, ss_column.create_date, ss_column.approve_date,
                ss_column.start_date, ss_column.expire_date,
                ss_column.lastupdate_date, ss_column.order_by, ss_highlight_news_mapping.types, picture.ref_type as picture_type, picture.folder, picture.file_name, 
                tournament.tournament_name_th, tournament.tournament_name_en, tournament.url as tournament_url, 
                tournament.dimension as tournament_dimension, tournament.domain as domain, 
                sport.sport_name_th, sport.sport_name_en, sport.url as sport_url, sport.dimension as sport_dimension 
                FROM ss_column
                LEFT JOIN ss_column_team_mapping ON ss_column.column_id2=ss_column_team_mapping.column_id
                LEFT JOIN ss_picture AS picture ON ss_column.column_id2 = picture.ref_id 
                LEFT JOIN ss_tournament tournament ON ss_column.tournament_id = tournament.tournament_id 
                LEFT JOIN ss_sport sport ON ss_column.sport_id = sport.sport_id 
                LEFT JOIN ss_columnist columnist ON ss_column.columnist_id = columnist.columnist_id 
                LEFT JOIN ss_highlight_news_mapping ON ss_column.column_id2 = ss_highlight_news_mapping.news_id 
                WHERE ss_column.tournament_id = ${tournamentId}
                AND ss_column_team_mapping.team_id=${teamId}
                AND ss_column.status = 1 
                AND ss_column.approve = 1
                AND ss_column.lang = "th"
                AND picture.ref_type = 2 
                AND picture.default = 1 
                ${orderBy}
                LIMIT ${startLimit}, ${itemPerPage}`;

  var columnItem = await queryData.get(query);

  // setup moment date
  helper.addMomentDate(columnItem, "approve_date");

  // get content pictures
  var completedColumn = await queryData.getContentPicture(columnItem);

  var content = [];
  var isPublish = false;

  // check publish date on each items
  completedColumn.map(row => {
    isPublish = helper.checkPublish(row.start_date, row.expire_date);

    if (isPublish) {
      content.push({
        column_id: row.column_id,
        types: row.types,
        title: row.title,
        thumbnail: row.thumbnail,
        lastupdate_date: row.lastupdate_date,
        approve_date: row.approve_date,
        start_date: row.start_date,
        expire_date: row.expire_date,
        view: row.countview,
        share: row.share,
        columnist_id: row.columnist_id,
        columnist_name: row.columnist_name,
        columnist_alias: row.columnist_alias,
        columnist_avatar: row.columnist_avatar,
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
  getHighlight,
  getByTeam
};
