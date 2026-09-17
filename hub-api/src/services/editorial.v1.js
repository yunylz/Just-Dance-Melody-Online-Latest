const jmcs = require("../lib/jmcs");
const { tokenRequired, adminOnly } = require("../lib/session-client");
const NewsLib = require("../lib/news");
const S3Lib = require("../lib/s3");
const multer = require("multer");
const { INTERNAL_SERVER_ERROR } = require("../lib/http-codes");
const { v4: uuidv4 } = require("uuid");
const User = require("../lib/models/user");

const upload = multer({ storage: multer.memoryStorage() });

module.exports = (app, publicRouter, privateRouter, logger) => {

  /**
   * @route GET /home
   * @description Fetches home from JMCS and returns it back.
   * @returns {Object} Home data from JMCS
   */
  publicRouter.get("/home", tokenRequired, async (req, res, next) => {
    try {
      const tiles = await jmcs.getHomeTiles();
      res.send({
        content: tiles
      });
    } catch (err) {
      logger.error({ err });
      next(INTERNAL_SERVER_ERROR);
    }
  });

  /**
   * @route GET /news
   * @description Fetches news list.
   */
  publicRouter.get("/news", tokenRequired, async (req, res, next) => {
    try {
      const user = await User.findOne({ userId: req.userId });
      const isAdmin = user && user.status.admin;
      const news = await NewsLib.getAllNews(!isAdmin);
      res.send(news);
    } catch (err) {
      logger.error({ err });
      next(INTERNAL_SERVER_ERROR);
    }
  });

  /**
   * @route POST /news
   * @description Creates a news item (Admin).
   */
  publicRouter.post("/news", tokenRequired, adminOnly, async (req, res, next) => {
    try {
      const news = await NewsLib.createNews(req.body);
      res.status(201).send(news);
    } catch (err) {
      logger.error({ err });
      next(INTERNAL_SERVER_ERROR);
    }
  });

  /**
   * @route PATCH /news/:id
   * @description Updates a news item (Admin).
   */
  publicRouter.patch("/news/:id", tokenRequired, adminOnly, async (req, res, next) => {
    try {
      const news = await NewsLib.updateNews(req.params.id, req.body);
      res.send(news);
    } catch (err) {
      logger.error({ err });
      next(INTERNAL_SERVER_ERROR);
    }
  });

  /**
   * @route DELETE /news/:id
   * @description Deletes a news item (Admin).
   */
  publicRouter.delete("/news/:id", tokenRequired, adminOnly, async (req, res, next) => {
    try {
      await NewsLib.deleteNews(req.params.id);
      res.send({ success: true });
    } catch (err) {
      logger.error({ err });
      next(INTERNAL_SERVER_ERROR);
    }
  });

  /**
   * @route POST /news/upload
   * @description Uploads an image to S3 (Admin).
   */
  publicRouter.post("/news/upload", tokenRequired, adminOnly, upload.single("image"), async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).send({ error: "No file uploaded" });

      const extension = req.file.originalname.split('.').pop();
      const fileName = `uploads/${uuidv4()}.${extension}`;

      const imageUrl = await S3Lib.uploadFile(req.file.buffer, fileName, req.file.mimetype);

      res.send({ imageUrl });
    } catch (err) {
      logger.error({ err });
      next(INTERNAL_SERVER_ERROR);
    }
  });

};