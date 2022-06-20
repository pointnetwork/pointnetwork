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
