import infos from "../config/infos";

type InfoName = keyof typeof infos;
type InfoFormatData = Record<string, string>;

class CustomInfos {
    constructor() { }

    getCustomInfoDb(formats: { infoName: InfoName; infoFormatData: InfoFormatData }[] = [
        { infoName: "JoinTheHub", infoFormatData: { code: "EEE-AAA" } }
    ]): Record<string, object> {
        const infoDb: Record<string, object> = {};

        formats.forEach(({ infoName, infoFormatData }) => {
            const infoDesc = infos[infoName];
            if (!infoDesc) return;

            infoDb[infoName] = this.formatCustomInfo(infoName, infoDesc, infoFormatData);
        });

        return infoDb;
    }

    formatCustomInfo(infoName: InfoName, infoDesc: object, infoFormatData: InfoFormatData): object {
        switch (infoName) {
            case "JoinTheHub":
                return this.formatJoinTheHub({ infoDesc, verificationCode: infoFormatData["code"] });
            default:
                return infoDesc;
        }
    }

    formatJoinTheHub({
        infoDesc,
        verificationCode
    }: {
        infoDesc: any;
        verificationCode: string;
    }): object {
        return {
            ...infoDesc,
            credits: infoDesc.credits.replace("{{code}}", verificationCode ?? "N/A")
        };
    }
}

export default new CustomInfos();