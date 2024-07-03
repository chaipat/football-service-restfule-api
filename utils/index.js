var utils = Utils.prototype;

function Utils() {

}

utils.getJSONArray = function(code, message, results) {

	var header = {};
	header.res_code = code;
	header.res_desc = message;

	if( results != null )
		header.total_row = results.length;

	var data = {};
	data.header = header;

	if(results != null && results.length > 0)
		data.body = results;

	return data;
};

utils.getJSONObject = function(code, message, results) {

	var header = {};
	header.res_code = code;
	header.res_desc = message;

	var data = {};
	data.header = header;

	if(results != null)
		data.body = results;

	return data;
};

utils.getJSONMatchObject = function(code, message, round, results) {

	var header = {};
	header.res_code = code;
	header.res_desc = message;
	header.round = round;

	var data = {};
	data.header = header;

	if(results != null)
		data.body = results;

	return data;
};

utils.getJSONPaginationObject = function(code, message, results, page, total_page, total_row) {

	var header = {};
	header.res_code = code;
	header.res_desc = message;

	if( total_row != null )
		header.total_row = total_row;

	if( page != null )
		header.page = page;

	if( total_page != null )
		header.total_page = total_page;

	var data = {};
	data.header = header;

	if(results != null && results.length > 0)
		data.body = results;

	return data;
};

utils.getJSONPaginationCustomObject = function(code, message, results, page, total_page, total_row, tournament_name_th, tournament_name_en, sport_name_th, sport_name_en, video_type_name, gallery_type_name, columnist_name, columnist_avatar, columnist_alias, total_article, total_read, total_share, tournament_id) {

	var header = {};
	header.res_code = code;
	header.res_desc = message;

	if( total_row != null ){
		header.total_row = total_row;
	}

	if( page != null ){
		header.page = page;
	}

	if( total_page != null ){
		header.total_page = total_page;
	}

	if (tournament_name_th != null) {
		header.tournament_name_th = tournament_name_th;
	}

	if (tournament_name_en != null){
		header.tournament_name_en = tournament_name_en;
	}
	
	if (sport_name_th != null){
		header.sport_name_th = sport_name_th;
	}

	if (sport_name_en != null){
		header.sport_name_en = sport_name_en;
	}

	if (video_type_name != null){
		header.video_type_name = video_type_name;
	}

	if (gallery_type_name != null){
		header.gallery_type_name = gallery_type_name;
	}

	if (columnist_name != null){
		header.columnist_name = columnist_name;
	}

	if (columnist_alias != null){
		header.columnist_alias = columnist_alias;
	}

	if (columnist_avatar != null){
		header.columnist_avatar = columnist_avatar;
	}

	if (total_article != null){
		header.total_article = total_article;
	}

	if (total_read != null){
		header.total_read = total_read;
	}

	if (total_share != null){
		header.total_share = total_share;
	}

	if (tournament_id != null){
		header.tournament_id = tournament_id;
	}

	var data = {};
	data.header = header;

	if(results != null && results.length > 0)
		data.body = results;

	return data;
};

utils.printJSON = function(res, jsonObj) {

	res.writeHead(200, {"Content-Type": "application/json; charset=UTF-8", "Access-Control-Allow-Origin": "*"});
	res.write( JSON.stringify(jsonObj) );
	res.end();
};

utils.print = function(res, message) {

	res.writeHead(200, {"Content-Type": "application/json; charset=UTF-8", "Access-Control-Allow-Origin": "*"});
	res.write( message );
	res.end();
};

utils.parseInt = function(value) {

	var result = parseInt(value);
	if (isNaN(result)) {
		return false;
	} else {
		return true;
	}
}

utils.validateEmail = function(email) {

	var reg = /^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;
	return reg.test(email);
}

utils.isEmptyObject = function(obj) {

	if(obj == null) {
		return true;
	} else {
		return !Object.keys(obj).length;
	}
}

utils.hasKeyAndValue = function(jsonObj, key) {

	if( jsonObj.hasOwnProperty(key) ) {

		if( jsonObj[key] != "" )
			return true;
		else
			return false;

	} else {
		return false;
	}
}

utils.mysql_real_escape_string = function(str) {

    return str.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, function (char) {

        switch (char) {
            case "\0":
                return "\\0";
            case "\x08":
                return "\\b";
            case "\x09":
                return "\\t";
            case "\x1a":
                return "\\z";
            case "\n":
                return "\\n";
            case "\r":
                return "\\r";
            case "\"":
            case "'":
            case "\\":
            case "%":
                return "\\"+char; // prepends a backslash to backslash, percent and double/single quotes
        }
    });
}

utils.clearGarbageCollection = function() {

	if (global.gc) {
	    global.gc();
	    return true;
	} else {
		return false;
	}
}

module.exports = utils;
