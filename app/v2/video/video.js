const queryData = require("../../helper/query");
const helper = require("../../helper/helper");

const UPLOAD_PATH = {
  video: "uploads/clip/",
  imgDefault: "uploads/video/",
  imgSize128: "uploads/size128/",
  imgSize224: "uploads/size224/",
  imgSize304: "uploads/size304/",
  imgSize640: "uploads/size640/"
};

const getHighLight = async (categoryId, siteId) => {
  var query = `
            SELECT v.video_id as id, v.program_id, v.site_id, h.title as title, v.countview as view,
                v.video_path, v.video_file, v.ref_id, v.video_type,
                v.countshare as share, h.lastupdate_date as lastupdated_date, v.approve_date, h.create_date as created_date,
                p.file_path, p.folder, p.file_name,
                g.program_name, g.program_name_en,
                h.order_by
            FROM sstv_highlight_video_mapping as h
            LEFT JOIN sstv_video as v ON h.video_id = v.video_id
            LEFT JOIN sstv_picture as p ON v.video_id = p.ref_id
            LEFT JOIN sstv_program as g ON v.program_id = g.program_id
            WHERE h.highlight_category_id = ${categoryId}
            AND v.site_id = ${siteId}
            AND h.status = 1
            AND v.status = 1
            AND v.approve = 1
            AND v.video_status = 1
            AND v.flag = 1
            ORDER BY h.order_by, v.approve_date DESC 
            LIMIT 10`;

  var videoItems = await queryData.getVideo(query);

  if (helper.isEmptyObject(videoItems)) {
    return null;
  }

  // setup moment date
  helper.addMomentDate(videoItems, "approve_date");

  var content = [];

  videoItems.map(row => {
    row.link_video = `${UPLOAD_PATH.video}${row.video_path}/${row.video_file}`;
    row.thumbnails = {
      default: `${UPLOAD_PATH.imgDefault}${row.folder}/${row.file_name}`,
      size128: `${UPLOAD_PATH.imgSize128}${row.folder}/${row.file_name}`,
      size224: `${UPLOAD_PATH.imgSize224}${row.folder}/${row.file_name}`,
      size304: `${UPLOAD_PATH.imgSize304}${row.folder}/${row.file_name}`,
      size640: `${UPLOAD_PATH.imgSize640}${row.folder}/${row.file_name}`
    };

    content.push({
      id: row.id,
      site_id: row.site_id,
      program_id: row.program_id,
      video_type: row.video_type,
      ref_id: row.ref_id,
      title: row.title,
      program_name: row.program_name,
      program_name_en: row.program_name_en,
      view: row.view,
      share: row.share,
      lastupdated_date: row.lastupdated_date,
      approve_date: row.approve_date,
      created_date: row.created_date,
      custom_date: row.custom_date,
      date_fromnow: row.date_fromnow,
      link_video: row.link_video,
      thumbnails: row.thumbnails
    });
  });

  return content;
};

const getByTeam = async (
  teamId,
  categoryId,
  subCategoryId,
  siteId,
  paginatePage,
  itemPerPage
) => {
  var totalRows = 0;
  var totalPages = 0;

  var queryTotalRows = `
            SELECT count(video_id) as totalRows
            FROM sstv_video
            WHERE category_id = ${categoryId}
            AND subcategory_id = ${subCategoryId}
            AND site_id = ${siteId}
            AND (team1=${teamId} OR team2=${teamId})
            AND status = 1
            AND approve = 1
            AND video_status = 1
            AND flag = 1
        `;

  let result = await queryData.getVideo(queryTotalRows);

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

  var orderBy = "ORDER BY v.approve_date DESC";

  var query = `
      SELECT v.video_id as id, v.site_id, v.program_id, v.video_title as title, v.countview as view,
          v.video_path, v.video_file, v.ref_id, v.video_type,
          v.countshare as share, v.lastupdated_date, v.approve_date, v.created_date,
          p.file_path, p.folder, p.file_name,
          g.program_name, g.program_name_en
      FROM sstv_video as v
      LEFT JOIN sstv_picture as p ON v.video_id = p.ref_id
      LEFT JOIN sstv_program as g ON v.program_id = g.program_id
      WHERE v.category_id = ${categoryId}
      AND v.subcategory_id = ${subCategoryId}
      AND v.site_id = ${siteId}
      AND (v.team1=${teamId} OR v.team2=${teamId})
      AND v.status = 1
      AND v.approve = 1
      AND v.video_status = 1
      AND v.flag = 1
      ${orderBy}
      LIMIT ${startLimit}, ${itemPerPage}`;

  var videoItems = await queryData.getVideo(query);

  // setup moment date
  helper.addMomentDate(videoItems, "approve_date");

  var content = [];

  videoItems.map(row => {
    row.link_video = `${UPLOAD_PATH.video}${row.video_path}/${row.video_file}`;
    row.thumbnails = {
      default: `${UPLOAD_PATH.imgDefault}${row.folder}/${row.file_name}`,
      size128: `${UPLOAD_PATH.imgSize128}${row.folder}/${row.file_name}`,
      size224: `${UPLOAD_PATH.imgSize224}${row.folder}/${row.file_name}`,
      size304: `${UPLOAD_PATH.imgSize304}${row.folder}/${row.file_name}`,
      size640: `${UPLOAD_PATH.imgSize640}${row.folder}/${row.file_name}`
    };

    content.push({
      id: row.id,
      site_id: row.site_id,
      program_id: row.program_id,
      video_type: row.video_type,
      ref_id: row.ref_id,
      title: row.title,
      program_name: row.program_name,
      program_name_en: row.program_name_en,
      view: row.view,
      share: row.share,
      lastupdated_date: row.lastupdated_date,
      approve_date: row.approve_date,
      created_date: row.created_date,
      custom_date: row.custom_date,
      date_fromnow: row.date_fromnow,
      link_video: row.link_video,
      thumbnails: row.thumbnails
    });
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
  getByTeam
};
