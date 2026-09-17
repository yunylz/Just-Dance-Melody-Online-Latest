import { Schema, model, Document } from 'mongoose';

// --- Carousel Category ---
const categorySchema = new Schema({
    titleId: { type: Number },
    title: { type: String },
    act: { type: String, required: true },
    isc: { type: String, required: true },
    order: { type: Schema.Types.Mixed },
    logoUrl: { type: String },
    noItemsMsgId: { type: Number },
    noItemsMsg: { type: String },
    categoryType: { type: String },
    requests: { type: [Schema.Types.Mixed], default: [] },
    items: { type: [Schema.Types.Mixed], default: [] },
    filters: { type: [Schema.Types.Mixed] }
}, { _id: false, strict: false });

// --- Carousel Rule (Page) ---
const carouselRuleSchema = new Schema({
    pageName: { type: String, required: true, unique: true },
    onlineOnly: { type: Boolean, default: false },
    categories: { type: [categorySchema], default: [] }
}, { timestamps: true });

// --- Carousel Item List ---
const carouselItemListSchema = new Schema({
    name: { type: String, required: true, unique: true },
    actionListName: { type: String },
    upsellActionListName: { type: String },
    items: { type: [Schema.Types.Mixed], default: [] }
}, { timestamps: true });

// --- Action List ---
const actionListSchema = new Schema({
    name: { type: String, required: true, unique: true },
    actions: { type: [Schema.Types.Mixed], default: [] }
}, { timestamps: true });

// --- Models ---
export const CarouselRule = model('CarouselRule', carouselRuleSchema);
export const CarouselItemList = model('CarouselItemList', carouselItemListSchema);
export const ActionList = model('ActionList', actionListSchema);

export default {
    CarouselRule,
    CarouselItemList,
    ActionList
};
