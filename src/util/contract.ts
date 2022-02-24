import path from 'path';
import {existsSync, readFileSync, writeFileSync} from 'fs';
import Deployer from '../client/zweb/deployer';

const defaultBuildPath = path.resolve(__dirname, '..', 'truffle', 'build', 'contracts');
const defaultContractPath = path.resolve(__dirname, '..', 'truffle', 'contracts');

export function getContractAddress(name: string, buildPath = defaultBuildPath) {
    const filename = path.resolve(buildPath, `${name}.json`);

    if (!existsSync(filename)) {
        return;
    }

    const {networks} = require(filename);

    for (const network in networks) {
        const {address} = networks[network];
        if (address && typeof address === 'string') {
            return address;
        }
    }
}

export function getImports(dependency: string) {
    const dependencyNodeModulesPath = path.join(__dirname, '..', 'node_modules', dependency);
    if (!existsSync(dependencyNodeModulesPath)) {
        throw new Error(
            `Could not find contract dependency "${dependency}", have you tried npm install?`
        );
    }
    return {contents: readFileSync(dependencyNodeModulesPath, 'utf8')};
}

export type ContractCompilerArgs = {
    name: string,
    contractPath?: string,
    buildDirPath?: string
};

export async function compileContract({
    name,
    contractPath = defaultContractPath,
    buildDirPath = defaultBuildPath
}: ContractCompilerArgs) {
    const sourceFileName = `${name}.sol`;
    const buildPath = path.join(buildDirPath, `${name}.json`);
    const filepath = path.join(contractPath, sourceFileName);
    if (existsSync(buildPath)) {
        return;
    }

    const content = readFileSync(filepath, 'utf8');
    const version = await Deployer.getPragmaVersion(content);
    const solc = require(`solc${version.split('.').slice(0, 2).join('_')}`);
    const compilerProps = {
        language: 'Solidity',
        sources: {[sourceFileName]: {content}},
        settings: {outputSelection: {'*': {'*': ['*']}}}
    };

    const artefact = solc.compile(JSON.stringify(compilerProps), {import: getImports});

    if (!artefact) {
        throw new Error('Compiled contract is empty');
    }

    writeFileSync(
        path.join(buildPath),
        JSON.stringify(JSON.parse(artefact).contracts[sourceFileName][name]),
        'utf-8'
    );

    return true;
}
