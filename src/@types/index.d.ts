import {Dialect, ModelOptions, Transaction} from 'sequelize';

declare global {
    // eslint-disable-next-line no-var, @typescript-eslint/no-explicit-any
  var browser: any;
  // eslint-disable-next-line no-var, @typescript-eslint/no-explicit-any
  var window: any;

    type DatabaseConfig = {
        storage: string,
        database: string,
        username: string,
        password: string,
        host: string,
        port: number,
        dialect: Dialect,
        define: ModelOptions,
        transactionType: Transaction.TYPES,
        retry: {
            max: number
        }
    };

    type ProgramType<T> = InstanceType<T> & {
        datadir?: string,
        attach?: boolean,
        makemigration?: boolean,
        migrate?: boolean,
        migrate_undo?: boolean,
        compile?: boolean,
        debug_destroy_everything?: boolean,
        new?: string,
        deploy?: boolean,
        deploy_path?: string,
        deploy_contracts?: boolean,
        dev?: boolean,
        upload?: string,
        force_deploy_proxy?: boolean
    };

    type CtxType = Record<string, unknown> & {
        basepath: string;
        exit: (code: number) => void;
        die: (err: Error) => void;
        db?: {shutdown?: () => Promise<void>};
    };
}

export {};
