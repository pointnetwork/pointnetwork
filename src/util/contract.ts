import path from 'path';
import {existsSync, readFileSync, writeFileSync} from 'fs';

const defaultBuildPath = path.resolve(__dirname, '..', '..', 'hardhat', 'build', 'contracts');
const defaultContractPath = path.resolve(__dirname, '..', '..', 'hardhat', 'contracts');
const defaultHardhatResourcesPath = path.resolve(__dirname, '..', '..', 'hardhat', 'resources');

export function getContractAddress(name: string, hardhatResourcesPath = defaultHardhatResourcesPath) {
    const filename = path.resolve(hardhatResourcesPath, `${name}-address.json`);

    if (!existsSync(filename)) {
        return;
    }

    const buildFile = require(filename);

    return buildFile.address;
}

export function getPragmaVersion(source: string) {
    const regex = /pragma solidity [\^~><]?=?(?<version>[0-9.]*);/;
    const found = source.match(regex);
    if (found && found.groups) {
        return found.groups.version;
    } else {
        throw new Error('Contract has no compiler version');
    }
}

type GetImportsFunc = (dependency: string) => {contents: string};
export function getImportsFactory(nodeModulesPath: string, originalPath: string): GetImportsFunc {
    return function(dependency) {
        const dependencyNodeModulesPath = path.join(nodeModulesPath, dependency);
        if (existsSync(dependencyNodeModulesPath)) {
            return {contents: readFileSync(dependencyNodeModulesPath, 'utf8')};
        }

        if (originalPath) {
            const dependencyOriginalPath = path.join(originalPath, dependency);
            if (existsSync(dependencyOriginalPath)) {
                return {contents: readFileSync(dependencyOriginalPath, 'utf8')};
            }
        }

        throw new Error(
            `Could not find contract dependency "${dependency}", have you tried npm install?`
        );
    };
}

export type ContractCompilerArgs = {
    name: string;
    contractPath?: string;
    buildDirPath?: string;
};

type CompilationArgs = Omit<ContractCompilerArgs, 'buildDirPath'> & {getImports: GetImportsFunc};

export function compileContract({
    name,
    contractPath = defaultContractPath,
    getImports
}: CompilationArgs) {
    const sourceFileName = `${name}.sol`;
    const filepath = path.join(contractPath, sourceFileName);
    const content = readFileSync(filepath, 'utf8');

    const version = getPragmaVersion(content);
    const solc = require(`solc${version
        .split('.')
        .slice(0, 2)
        .join('_')}`);

    const compilerProps = {
        language: 'Solidity',
        sources: {[sourceFileName]: {content}},
        settings: {outputSelection: {'*': {'*': ['*']}}}
    };

    const artefact = solc.compile(JSON.stringify(compilerProps), {import: getImports});
    return artefact;
}

export async function compileAndSaveContract({
    name,
    contractPath = defaultContractPath,
    buildDirPath = defaultBuildPath
}: ContractCompilerArgs) {
    const sourceFileName = `${name}.sol`;
    const buildPath = path.join(buildDirPath, `${name}.json`);
    if (existsSync(buildPath)) {
        return;
    }

    const nodeModulesPath = path.join(__dirname, '..', '..', 'node_modules');
    const originalPath = '';
    const getImports = getImportsFactory(nodeModulesPath, originalPath);

    const artefact = compileContract({name, contractPath, getImports});

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
