const config = require("../config/index");
const helpers = require("./helper");
const MySqlClass = require("../v2/database/mysql.class");
const log = require("../../logging/index");

const db = new MySqlClass(config.SS_MYSQL_CONNECTION_POOL);
const sstvdb = new MySqlClass(config.SSTV_MYSQL_CONNECTION_POOL);

function getContentPicture(data) {
  return new Promise((resolve, reject) => {
    var type = "";
    var queryContentPicture = "";
    var fieldID = "";

    let queryContentPictures = data.map(row => {
      if (row.picture_type == 1) {
        type = "news";
        fieldID = "news_id";
      } else if (row.picture_type == 2) {
        type = "column";
        fieldID = "column_id";
      }

      queryContentPicture = `
                      SELECT folder, file_name
                      FROM ss_picture
                      WHERE ref_id = ${row[fieldID]}
                      AND ref_type = ${row.picture_type};
                  `;
      return db
        .read(queryContentPicture)
        .then(picturePath => {
          var pictureFolder = "";
          var pictureName = "";

          if (picturePath) {
            var pictureFolder = picturePath[0]["folder"];
            var pictureName = picturePath[0]["file_name"];
          }

          row.picture_size = {
            fullsize: `${type}/${pictureFolder}/${pictureName}`,
            size128: `${
              config.siamsport_upload_path.imgSize128
            }${pictureFolder}/${pictureName}`,
            size224: `${
              config.siamsport_upload_path.imgSize224
            }${pictureFolder}/${pictureName}`,
            size304: `${
              config.siamsport_upload_path.imgSize304
            }${pictureFolder}/${pictureName}`,
            size640: `${
              config.siamsport_upload_path.imgSize640
            }${pictureFolder}/${pictureName}`
          };

          return row;
        })
        .catch(error => {
          log.error(error);
        });
    });

    // run all iterate promise in data
    Promise.all(queryContentPictures)
      .then(completed => {
        resolve(completed);
      })
      .catch(error => {
        reject(error);
      });
  });
}

module.exports = {
  get: async queryString => {
    var data = await db.read(queryString);

    if (helpers.isEmptyObject(data)) {
      return null;
    }

    return data;
  },
  getVideo: async queryString => {
    var data = await sstvdb.read(queryString);

    if (helpers.isEmptyObject(data)) {
      return null;
    }

    return data;
  },
  getContentPicture
};
