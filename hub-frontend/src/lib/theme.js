export default {
	primary_color_very_darker: "#81218e",
	secondary_color_very_darker: "#2d2da9",

	primary_color_darker: "#972ca5",
	secondary_color_darker: "#4444d4",

    primary_color: "#972ca5",
	secondary_color: "#0d49cc",

	brand_gradient_1: "#4c7fe8",
	brand_gradient_2: "#9a5ddf",
	brand_gradient_3: "#e33cd7",
	brand_gradient_4: "#f26580",
	brand_gradient_5: "#ffa302",

	getVeryDarkerGradient(direction = "to bottom right") {
		return `linear-gradient(${direction}, ${this.primary_color_very_darker}, ${this.secondary_color_very_darker})`;
	},

	getDarkerGradient(direction = "to bottom right") {
		return `linear-gradient(${direction}, ${this.primary_color_darker}, ${this.secondary_color_darker})`;
	},

    getGradient(direction = "to bottom right") {
		return `linear-gradient(${direction}, ${this.primary_color}, ${this.secondary_color})`;
	}
};