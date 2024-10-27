/**
 * @typedef  {Object} StationDepartures
 * @property {string} station
 * @property {Date[]} departures
 */

/**
 * @typedef {"urban" | "metropolitan" | "night" | "express" | "supermarket"} LineType
 */

/**
 * @typedef  {Object} LineDetails
 * @property {string} url
 * @property {LineType} type
 */

/**
 * @typedef {Object.<string, LineDetails>} LinesResult
 */

/**
 * @typedef  {Object}  HttpError
 * @property {number}  status
 * @property {message} message
 */

/**
 * @typedef  {Object}              Data
 * @property {LinesResult}         lines
 * @property {Object.<string, StationDepartures[]>} schedules
 */
