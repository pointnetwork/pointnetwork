declare type ProgramType<T> = InstanceType<T> & {
    datadir?: string,
    attach?: boolean,
    makemigration?: boolean,
    migrate?: boolean,
    migrate_undo?: boolean,
    compile?: boolean,
    debug_destroy_everything?: boolean,
    deploy?: boolean,
    deploy_contracts?: boolean,
    dev?: boolean,
};

declare type CtxType = Record<string, unknown> & {
    basepath: string;
    exit: (code: number) => void;
    die: (err: Error) => void;
    db?: {shutdown?: () => Promise<undefined>};
};
