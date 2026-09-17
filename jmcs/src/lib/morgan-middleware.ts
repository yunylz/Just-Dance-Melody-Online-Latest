import winston from "winston";
import express from "express";
import morgan from "morgan";

import utils from "./utils";
import config from "../config";

/**
 * Handles HTTP request logging
 * @param {winston.Logger} logger 
 * @returns {morgan.Morgan} Morgan middleware instance
 */
export default (logger: winston.Logger) => {
  const stream = {
    write: (message: string) => logger.http(message.trim()),
  };

  return morgan(
    ":remote-addr :method :url :status :res[content-length] - :response-time ms",
    {
      stream,
      skip: function (req: express.Request, res: express.Response) {
        const url = req.baseUrl + req.path;
        const shouldSkip = config.MORGAN_SKIPS.some((p: RegExp) => p.test(url));
        // If metrics is requested by non local ip, log it
        if (url == "/metrics" && !utils.isLocalIp(req.ip)) return false;
        return shouldSkip ? true : false;
      }
    }
  );
};