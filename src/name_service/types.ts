export type PointDomainData = {
    identity: string;
    isAlias: boolean;
    routesId?: string;
    rootDirId?: string;
};

export type DomainContent = {
    decoded: string | null;
    error: Error | null;
    protocolType?: string;
};

export type DomainRegistry = {
    owner: string;
    content: DomainContent;
};
