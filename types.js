/**
 * @typedef  {Object} Station
 * @property {string} name
 * @property {Date[]} departures
 */

/**
 * @typedef {"urban" | "metropolitan" | "night" | "express" | "supermarket"} LineType
 */

/**
 * @typedef  {Object}    Line
 * @property {string}    url
 * @property {LineType}  type
 * @property {Station[]} stations
 */

/**
 * @typedef {Object.<string, Line>} LineMap
 */

/**
 * @typedef  {Object}  HttpError
 * @property {number}  status
 * @property {message} message
 */
