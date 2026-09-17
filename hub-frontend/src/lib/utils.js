import consoles from "./consoles";

class Utils {
    static getStarsByScore(score) {
        let stars = Math.floor(score / 2000);

        // First check score thresholds
        if (score >= 12000) {
            return '★★★★★ MEGASTAR';
        } else if (score >= 11000) {
            return '★★★★★ SUPERSTAR';
        } else {
            // Normal star rating (0–5 max)
            return '★'.repeat(stars) + '☆'.repeat(5 - stars);
        }
    }

    static getStarsByStars(stars) {
        if (stars < 5) {
            return '★'.repeat(stars) + '☆'.repeat(5 - stars);
        } else if (stars === 6) {
            return '★'.repeat(5) + ' SUPERSTAR';
        } else if (stars === 7) {
            return '★'.repeat(5) + ' MEGASTAR';
        }
    }

    static getStarsColor(stars) {
        if (stars <= 5) return 'text-orange-400';   // normal
        if (stars >= 6 && stars < 7) return 'text-blue-400';   // SUPERSTAR
        if (stars >= 7) return 'text-purple-400';   // MEGASTAR
        return 'text-gray-400';
    }

    static getStarsColorByScore(score) {
        if (score >= 12000) return 'text-purple-400';   // MEGASTAR
        if (score >= 11000) return 'text-blue-400';     // SUPERSTAR
        return 'text-orange-400';                       // normal
    }

    static getTitle(title = "", isHub = false) {
        return `${title} | ${!isHub ? 'JDMO' : 'JDMO Hub'}`
    }

    static getPlatformIcon(platformId) {
        const platform = consoles[platformId];
        return platform?.icon || "";
    }

    static getPlatformTitle(platformId) {
        const platform = consoles[platformId];
        return platform?.title || "Unknown";
    }

    static getPlatformIconSize(platformId) {
        const platform = consoles[platformId];
        return platform?.iconSize || "6xl";
    }

    static timeAgo(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        const seconds = Math.floor((new Date() - date) / 1000);
        if (seconds < 60) return `${seconds}s ago`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    }


	/**
	 * Convert a base64url-encoded string to a Uint8Array
	 * Required for the VAPID public key used in push subscription
	 * @param {string} base64String - Base64url-encoded string
	 * @returns {Uint8Array} Decoded bytes
	 */
	static urlBase64ToUint8Array(base64String) {
		const padding = '='.repeat((4 - base64String.length % 4) % 4);
		const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
		const rawData = atob(base64);
		return new Uint8Array([...rawData].map(c => c.charCodeAt(0)));
	}

	static isMobile() {
		if (typeof navigator === 'undefined') return false;
		const ua = navigator.userAgent || navigator.vendor || window.opera || '';
		return /android|iphone|ipad|ipod|opera mini|iemobile|wpdesktop/i.test(ua);
	}
}

export default Utils;