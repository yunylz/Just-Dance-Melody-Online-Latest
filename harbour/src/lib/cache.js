const logger = require("./logger").createLogger({ service: "cache" });

class Cache {
  constructor() {}

  /**
   * Set a value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache (string, object, array, etc.)
   * @param {number} ttl - Time to live in seconds (optional)
   * @returns {Promise<boolean>} - Success status
   */
  async set(key, value, ttl = 3600) {
    try {
      let serializedValue;
      let isJson = false;

      if (typeof value === 'string') {
        serializedValue = value;
      } else {
        serializedValue = JSON.stringify(value);
        isJson = true;
      }

      // Add metadata prefix to track data type
      const finalValue = `${isJson ? 'JSON:' : 'TEXT:'}${serializedValue}`;

      // Redis v4 uses .set(key, value, { EX: seconds })
      await global.cacheClient.set(key, finalValue, {
        EX: ttl
      });

      logger.debug(`Cache SET success for key "${key}"`);
      return true;
    } catch (error) {
      logger.error(`Cache SET error for key "${key}":`, error);
      return false;
    }
  }

  /**
   * Get a value from cache
   * @param {string} key - Cache key
   * @returns {Promise<any>} - Cached value or null if not found
   */
  async get(key) {
    try {
      const value = await global.cacheClient.get(key);

      if (!value) {
        logger.debug(`Cache MISS for key "${key}"`);
        return null;
      }

      const stringValue = value.toString();
      let result;

      if (stringValue.startsWith('JSON:')) {
        const jsonData = stringValue.substring(5);
        result = JSON.parse(jsonData);
        logger.debug(`Cache HIT (JSON) for key "${key}"`);
      } else if (stringValue.startsWith('TEXT:')) {
        result = stringValue.substring(5);
        logger.debug(`Cache HIT (TEXT) for key "${key}"`);
      } else {
        // Fallback for data without prefix
        try {
          result = JSON.parse(stringValue);
          logger.debug(`Cache HIT (Legacy JSON) for key "${key}"`);
        } catch {
          result = stringValue;
          logger.debug(`Cache HIT (Legacy TEXT) for key "${key}"`);
        }
      }

      return result;
    } catch (error) {
      logger.error(`Cache GET error for key "${key}":`, error);
      return null;
    }
  }

  /**
   * Delete a value from cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} - Success status
   */
  async delete(key) {
    try {
      const result = await global.cacheClient.del(key);
      logger.debug(`Cache DELETE for key "${key}":`, !!result);
      return result > 0;
    } catch (error) {
      logger.error(`Cache DELETE error for key "${key}":`, error);
      return false;
    }
  }

  /**
   * Check if a key exists in cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} - Existence status
   */
  async has(key) {
    try {
      const result = await global.cacheClient.exists(key);
      return result > 0;
    } catch (error) {
      logger.error(`Cache HAS error for key "${key}":`, error);
      return false;
    }
  }

  /**
   * Flush all cache data
   * @returns {Promise<boolean>} - Success status
   */
  async flush() {
    try {
      await global.cacheClient.flushDb();
      logger.info('Cache FLUSH completed');
      return true;
    } catch (error) {
      logger.error('Cache FLUSH error:', error);
      return false;
    }
  }

  /**
   * Get cache statistics
   * @returns {Promise<object>} - Cache stats
   */
  async stats() {
    try {
      const info = await global.cacheClient.info();
      return { info };
    } catch (error) {
      logger.error('Cache STATS error:', error);
      return {};
    }
  }

  /**
   * Get or set pattern
   */
  async getOrSet(key, fetchFunction, ttl = 3600) {
    try {
      const cached = await this.get(key);
      if (cached !== null) {
        return cached;
      }

      const result = await fetchFunction();
      await this.set(key, result, ttl);
      return result;
    } catch (error) {
      logger.error(`Cache getOrSet error for key "${key}":`, error);
      throw error;
    }
  }
}

module.exports = new Cache();