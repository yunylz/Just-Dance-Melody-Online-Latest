import { Avatar, Skin, PortraitBorder } from "./models/items";
import utils from "./utils";

class Items {
    constructor() {};

    async getAvatars() {
        const avatars = await Avatar.find({});
        return avatars;
    };

    async getSkins() {
        const skins = await Skin.find({});
        return skins;
    };

    async getPortraitBorders() {
        const portraitBorders = await PortraitBorder.find({});
        return portraitBorders;
    };

    async getItems() {
        const avatars = (await Avatar.find({}).select("-_id -__v")).map((d: any) => ({
            __class: "OnlineCustomizableItem",
            ...d.toObject(),
            visibility: d.visibility ? 1 : 0
        }));

        const skins = (await Skin.find({}).select("-_id -__v")).map((d: any) => ({
            __class: "OnlineCustomizableItem",
            ...d.toObject(),
            visibility: d.visibility ? 1 : 0
        }));

        const portraitBorders = (await PortraitBorder.find({}).select("-_id -__v")).map((d: any) => ({
            __class: "OnlinePortraitBorder",
            ...d.toObject(),
            visibility: d.visibility ? 1 : 0
        }));

        return {
            avatars: utils.toMap(avatars),
            skins: utils.toMap(skins),
            portraitBorders: utils.toMap(portraitBorders)
        };
    };
}

export default new Items();