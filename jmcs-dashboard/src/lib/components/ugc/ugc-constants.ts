import { Film, Video, Users, Music, Activity, Zap } from "lucide-svelte";

const _Film: any = Film;
const _Video: any = Video;
const _Users: any = Users;
const _Music: any = Music;
const _Activity: any = Activity;
const _Zap: any = Zap;

export const UGC_TYPES: Record<string, { label: string; icon: any }> = {
	ad: { label: "Autodance", icon: _Users },
	st: { label: "Showtime", icon: _Video },
	dm: { label: "Dance Machine", icon: _Zap },
	ch: { label: "Challenge", icon: _Activity },
	cr: { label: "Community Remix", icon: _Music },
	cv: { label: "Menu Video", icon: _Film },
};

export function getTypeInfo(type: string) {
	return UGC_TYPES[type] || { label: type || "Unknown", icon: _Film };
}

export function getUgcId(ugc: any) {
	return ugc.ugcId || ugc._id;
}

export function formatTimestamp(ts: number | string | undefined) {
	if (!ts) return "-";
	const d = new Date(Number(ts) * 1000);
	return d.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

export function getContentSummary(content: any) {
	if (!content) return "—";
	const filenames = Object.keys(content);
	return filenames.length > 0 ? filenames.join(", ") : "—";
}
