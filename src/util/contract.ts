import path from 'path';
import {existsSync, readFileSync, writeFileSync} from 'fs';
const config = require('config');
const {resolveHome} = require('../core/utils');

const defaultBuildPath = path.resolve(
    resolveHome(config.get('datadir')),
    'hardhat',
    'artifacts',
    'contracts'
);

const defaultContractPath = path.resolve(__dirname, '..', '..', 'blockchain', 'contracts');

export function getContractAddress(name: string, buildPath = defaultBuildPath) {
    
    const filename = path.resolve(buildPath, `${name}.sol/${name}-address.json`);

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

// TODO: unify with the same function from Deployer
export function getImports(dependency: string) {
    const dependencyNodeModulesPath = path.join(__dirname, '..', '..', 'node_modules', dependency);
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
    const version = getPragmaVersion(content);
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
