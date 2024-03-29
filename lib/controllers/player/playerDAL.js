/**
 * Created by Tomer on 28-Feb-18.
 */

const sqlFunction = require('../../utils').sqlFunction;
const config = require('../../config');
const models = require('../../models');
const dbConn = models.dbConn;
const _ = require('underscore');

/**
 * Query player's basic info by playerid
 * @param playerid
 * @param cb
 */
exports.getPlayerInfo = function (playerid, cb) {

    // Gets current player basic info
    dbConn.query(`SELECT pbi.name as name, pbi.age as age, pbi.favourite_leg as favourite_leg,
                  (select ps.position from players_positions as ps where ps.id = pbi.position) as position,
                  pbi.country as country, pbi.team as team, pbi.own_description as own_description, pbi.img as img 
                  FROM iscout.players_basic_info as pbi 
                  WHERE pbi.id = ?`, [playerid], (err, basicInfo) => {
        if (err){
            cb(err);
        } else if (basicInfo.length === 1) {

            // Selects all player's videos
            dbConn.query(`SELECT youtube_url 
                          FROM iscout.players_videos 
                          WHERE player_id=?`, [playerid], (err, urls) => {
                if (err){
                    cb(err);
                } else {
                    basicInfo[0].urls = _.map(urls, (urlObj) => {
                        return urlObj.youtube_url
                    });
                    cb(null, basicInfo);
                }
            });
        } else {
            cb(null, []);
        }
    });
};

/**
 * Query player's id by userid
 * @param userid
 * @param cb
 */
exports.getPlayerIdByUserId = function (userid, cb) {

    // Gets current player basic info
    dbConn.query(`SELECT player_id
                  FROM users_to_players_rel
                  WHERE user_id = ?`, [userid], cb);
};

/**
 * Query player's statistics by playerid
 * @param playerid
 * @param cb
 */
exports.getPlayerStatistics = function (playerid, cb) {

    // Gets current player basic info
    dbConn.query(`SELECT year, goals, assists, games_in_starting_linup, games_entered_from_bench,
                  yellow_cards, red_cards, average_km_per_game   
                  FROM players_yearly_statistics as pys
                  WHERE pys.player_id = ?`, [playerid], cb);
};

/**
 * Query players by wanted params
 * @param sqlArr
 * @param basicInfoAlias
 * @param statsAlias
 * @param cb
 */
exports.search = function (sqlArr, basicInfoAlias, statsAlias, cb) {

    // Creates basic query
    let query = `SELECT ${statsAlias}.player_id as player_id
                 FROM players_basic_info as ${basicInfoAlias}
                 INNER JOIN players_yearly_statistics as ${statsAlias}
                 ON ${basicInfoAlias}.id = ${statsAlias}.player_id `;

    // Creates WHERE clause
    let whereClause = (sqlArr.length === 0) ? '' :
        _.reduce(sqlArr, function(accumulator, currentItem) {
            return accumulator + ' ' + currentItem + ' AND';
        }, 'WHERE').slice(0, -4);

    // Runs query
    dbConn.query(query + whereClause, [], cb);
};

/**
 * Updates player's own description by playerid
 * @param own_desc
 * @param playerid
 * @param cb
 */
exports.updateDescription = function (own_desc, playerid, cb) {

    // Gets current player basic info
    dbConn.query(`UPDATE iscout.players_basic_info 
                  SET own_description=? 
                  WHERE id=?`, [own_desc, playerid], cb);
};

/**
 * Inserts player's video url
 * @param playerid
 * @param videoUrl
 * @param cb
 */
exports.insertVideoUrl = function (playerid, videoUrl, cb) {

    // Gets current player basic info
    dbConn.query(`INSERT INTO iscout.players_videos 
                  (player_id, youtube_url) 
                  VALUES (?, ?);`, [playerid, videoUrl], cb);
};

/**
 * Inserts player's picture base64
 * @param playerid
 * @param picStr
 * @param cb
 */
exports.insertPictureBase64 = function (playerid, picStr, cb) {

    // Gets current player basic info
    dbConn.query(`UPDATE iscout.players_basic_info SET img=? WHERE id=?`, [picStr, playerid], cb);
};

/**
 * json of functions for each player basic parameter - matched sql
 * value - the value of the parameter to search for
 * alias - the parameter's table alias name
 */
exports.player_basic_info_params_to_SQL = {
    name: (value, alias) => {
        return sqlFunction.contains(value, alias + '.' + 'name');
    },
    age: (value, alias) => {
        return sqlFunction.in_range(value - 2, value + 2, alias + '.' + 'age');
    },
    country: (value, alias) => {
        return sqlFunction.equals(value, alias + '.' + 'country', true);
    },
    leg: (value, alias) => {
        return sqlFunction.equals(value, alias + '.' + 'favourite_leg', true);
    },
    team: (value, alias) => {
        return sqlFunction.equals(value, alias + '.' + 'team', true);
    },
    position: (value, alias) => {
        return sqlFunction.equals(config.iscout.positionsToId[value], alias + '.' + 'position', false);
    }
};

/**
 * json of functions for each player statistic parameter - matched sql
 * value - the value of the parameter to search for
 * alias - the parameter's table alias name
 */
exports.player_statistics_params_to_SQL = {
    year: (value, alias) => {
        return sqlFunction.equals(value, alias + '.' + 'year', false);
    },
    goals: (value, alias) => {
        return sqlFunction.greater_or_equals(value, alias + '.' + 'goals');
    },
    assists: (value, alias) => {
        return sqlFunction.greater_or_equals(value, alias + '.' + 'assists');
    },
    games_in_starting_linup: (value, alias) => {
        return sqlFunction.greater_or_equals(value, alias + '.' + 'games_in_starting_linup');
    },
    games_entered_from_bench: (value, alias) => {
        return sqlFunction.greater_or_equals(value, alias + '.' + 'games_entered_from_bench');
    },
    yellow_cards: (value, alias) => {
        return sqlFunction.smaller_or_equals(value, alias + '.' + 'yellow_cards');
    },
    red_cards: (value, alias) => {
        return sqlFunction.smaller_or_equals(value, alias + '.' + 'red_cards');
    },
    average_km_per_game: (value, alias) => {
        return sqlFunction.greater_or_equals(value, alias + '.' + 'average_km_per_game');
    }
};