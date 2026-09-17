interface IPopulation {
    name: string;
    object: string;
    spaceId: string;
    subject: string;
}

interface IPairingInfo {
    protocol: string;
    pairingUrl: string;
    tlsCertificate: string;
    titleId: string;
    displayName: string;
}

interface ISessionRequestBody {
    publicIp: string;
    pairingInfo: IPairingInfo;
    populations: IPopulation[];
}

interface ISession {
    userId: string;
    profileId: string;
    sessionId: string;
    ticketExpiration: number;
    sku: ISku;
    publicIp: string;
    pairingInfo: IPairingInfo;
    populations: IPopulation[];
    pairingCode: string;
    docId: string;
    createdAt: Date;
}

interface IRefreshSubscriptionInput {
    deviceId?: string // pc did not send this, so keep it optional
}

interface ICountry {
    name: string;
    code: string;
    id: number;
}

interface ILeaderboardEntry {
    __class: "LeaderboardEntry_Online";
    profileId: string;
    rank: number;
    score: number;
    name: string;
    avatar: number;
    country: number;
    platformId: string;
    alias: number;
    aliasGender: number;
    jdPoints: number;
    portraitBorder: number;
}

interface IDancerOfTheWeekEntry {
    __class: "DancerOfTheWeek";
    alias: number;
    aliasGender: number;
    avatar: number;
    country: number;
    gameVersion: string;
    jdPoints: number;
    name: string;
    pid: string;
    platformId: string;
    portraitBorder: number;
    profileId: string;
    rank: number;
    score: number;
}