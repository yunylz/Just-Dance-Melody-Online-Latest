
import { CarouselClass, CarouselCategoryType } from '../lib/enums/carousel';

export interface ICarouselComponent {
    __class: string;
    [key: string]: any;
}

export interface ICarouselItem {
    __class: CarouselClass.Item | CarouselClass.SongItem;
    components: ICarouselComponent[];
    [key: string]: any;
}

export interface ICarouselCategory {
    __class: CarouselClass.Category;
    title: string;
    act: string;
    isc: string;
    items: ICarouselItem[];
    categories?: ICarouselCategory[];
    logoUrl?: string;
    noItemsMsg?: string;
    categoryType?: CarouselCategoryType;
    order?: number;
    onlineTitleId?: string;
}

export interface ICarouselContent {
    __class: CarouselClass.JD_CarouselContent;
    categories: ICarouselCategory[];
    actionLists?: Record<string, any>;
    songItemLists?: Record<string, any>;
}

export interface ICarouselRule {
    categories: any[];
}

export interface ICarouselRules {
    rules: Record<string, ICarouselRule>;
    actionLists: Record<string, any>;
}
