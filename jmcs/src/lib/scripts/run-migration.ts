import "dotenv/config";
import path from "node:path";
(global as any).root = path.join(__dirname, "../..");

import loadClients from "../load-clients";
import migrateCarousel from "./migrate-carousel";
import { createLogger } from "../logger";

const logger = createLogger({ service: "run-migration" });

(async () => {
    try {
        logger.info("Connecting to database...");
        await loadClients();
        
        logger.info("Starting carousel migration...");
        const mockReq = {} as any;
        const mockRes = {
            json: (data: any) => {
                console.log(JSON.stringify(data, null, 2));
                process.exit(0);
            },
            status: (code: number) => ({
                json: (data: any) => {
                    console.error(`Error ${code}:`, JSON.stringify(data, null, 2));
                    process.exit(1);
                }
            })
        } as any;

        await migrateCarousel.run(mockReq, mockRes);
    } catch (err) {
        logger.error("Migration runner failed:", err);
        process.exit(1);
    }
})();
