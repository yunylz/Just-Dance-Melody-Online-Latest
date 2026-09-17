import skus, { ISku } from "../config/skus";

/**
 * Builds, retrieves, and manages SKUs.
 */
class Skus {
    public info = skus
    /**
     * Builds a canonical SKU ID string from its components.
     *
     * Format: `{gameVersion}-{platform}-{region}`
     *
     * @example
     * skus.buildSkuId({ gameVersion: "jd2022", platform: "nx", region: "all" });
     * // "jd2022-nx-all"
     */
    buildSkuId({
        gameVersion = "jd2017",
        platform = "pc",
        region = "ww",
    }: ISku): string {
        return `${gameVersion}-${platform}-${region}`;
    }

    getAllSkuIds(): string[] {
        return Object.keys(this.info);
    }
}

export default new Skus();