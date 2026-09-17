interface TicketHeader {
    alg: string;
    typ: string;
}

interface TicketClaims {
    exp?: number;
    uid: string; // userId
    pid: string; // profileId
    aid: string; // appId
    sid: string; // sessionId
    platform: string;
    environment: string;
    productId?: string; // spaceId or productId (if exists, but most likely spaceId)
    spid?: string; // spaceId
    genomeId?: string; // appId
    pids?: string[]; // profileId of user in array
    guest?: boolean;
    admin?: boolean;
    mod?: boolean;
    patreon?: boolean;
    qa?: boolean;
    jmcsEnv?: string;
    vfc?: string; // verificationCode
}

interface TicketDecryptSuccess {
    result: {
        header: TicketHeader;
        claims: TicketClaims;
    };
    error: null;
}

interface TicketDecryptFailure {
    result?: never;
    error: typeof UNAUTHORIZED | typeof TICKET_EXPIRED;
}

type TicketDecryptResult = TicketDecryptSuccess | TicketDecryptFailure;