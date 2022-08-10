export type PointDomainData = {
    identity: string;
    isAlias: boolean;
    routesId?: string;
    rootDirId?: string;
};

export type DomainRegistry = {
    owner: string;
    content: string | null;
};

export type IdentityData = {
    identity: string | null;
    address: string;
    publicKey: string;
    network: 'point' | 'solana' | 'ethereum';
};

export type IdentityParams = {
    solAddress?: string;
    ethAddress?: string;
    targets?: string[];
    solNetwork?: string;
    ethNetwork?: string;
};
