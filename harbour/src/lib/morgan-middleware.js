const morgan = require("morgan");
const utils = require("./utils");

/**
 * Handles HTTP request logging
 * @param {*} logger 
 * @returns 
 */
module.exports = (logger) => {
  const stream = {
    write: (message) => logger.http(message.trim()),
  };

  return morgan(
    ":remote-addr :method :url :status :res[content-length] - :response-time ms",
    {
      stream,
      skip: function (req, res) {
        const url = req.baseUrl + req.path;
        const shouldSkip = global.config.MORGAN_SKIPS.some(p => p.test(url));
        // If metrics is requested by non local ip, log it
        if (url == "/metrics" && !utils.isLocalIp(req.clientIp)) return false;
        return shouldSkip ? true : false;
      }
    }
  );
};