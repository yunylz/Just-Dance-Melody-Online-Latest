const News = require("./models/news");

class NewsLib {
    /**
     * Creates a new news item.
     * @param {Object} data 
     * @returns {Promise<Object>}
     */
    static async createNews(data) {
        const news = new News(data);
        return news.save();
    }

    /**
     * Updates an existing news item.
     * @param {string} id 
     * @param {Object} data 
     * @returns {Promise<Object>}
     */
    static async updateNews(id, data) {
        return News.findByIdAndUpdate(id, data, { new: true });
    }

    /**
     * Deletes a news item.
     * @param {string} id 
     * @returns {Promise<Object>}
     */
    static async deleteNews(id) {
        return News.findByIdAndDelete(id);
    }

    /**
     * Gets a single news item by ID.
     * @param {string} id 
     * @returns {Promise<Object>}
     */
    static async getNews(id) {
        return News.findById(id);
    }

    /**
     * Gets all news items.
     * @param {boolean} publishedOnly 
     * @returns {Promise<Array>}
     */
    static async getAllNews(publishedOnly = true) {
        const query = publishedOnly ? { published: true } : {};
        return News.find(query).sort({ createdAt: -1 }).select("-_id -__v");
    }
}

module.exports = NewsLib;
