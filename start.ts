import child_process from 'child_process';
import fs from 'fs';

import { ExitPromptError } from '@inquirer/core';
import { confirm, input, number, password, select } from '@inquirer/prompts';

// if you're forking this feel free to change these :) it does make some assumptions elsewhere (branch names)
const repoOrg = 'https://github.com/LostCityRS';
const engineRepo = 'Engine-TS';
const contentRepo = 'Content';
const webRepo = 'Client-TS';
const javaRepo = 'Client-Java';

function cloneRepo(repo: string, dir: string, branch: string) {
    child_process.execSync(`git clone ${repoOrg}/${repo} --single-branch -b ${branch} ${dir}`, {
        stdio: 'inherit'
    });
}

function updateRepo(cwd: string) {
    child_process.execSync('git pull', {
        stdio: 'inherit',
        cwd
    });
}

function runOnOs(exec: string, cwd?: string) {
    const start = (process.platform == 'darwin' ? 'open' : process.platform == 'win32' ? 'start' : 'xdg-open');

    child_process.execSync(`${start} ${exec}`, {
        stdio: 'inherit',
        cwd
    });
}

let config = {
    rev: 'unset'
};

let running = true;
async function main() {
    if (!fs.existsSync('server.json')) {
        await promptConfig();
    }

    config = JSON.parse(fs.readFileSync('server.json', 'utf8'));

    if (!fs.existsSync('engine')) {
        cloneRepo(engineRepo, 'engine', config.rev);
    }

    if (!fs.existsSync('content')) {
        cloneRepo(contentRepo, 'content', config.rev);
    }

    if (!fs.existsSync('webclient')) {
        cloneRepo(webRepo, 'webclient', config.rev);
    }

    if (!fs.existsSync('javaclient')) {
        cloneRepo(javaRepo, 'javaclient', config.rev);
    }

    if (!fs.existsSync('engine/.env')) {
        child_process.spawnSync('bun run setup', {
            shell: true,
            stdio: 'inherit',
            cwd: 'engine'
        });
    }

    const choice = await select({
        message: 'What would you like to do?',
        choices: [{
            name: 'Start Server',
            description: 'Starts the server normally',
            value: 'start'
        }, {
            name: 'Update Source',
            description: 'Pull the latest commits for all subprojects',
            value: 'update'
        }, {
            name: 'Run Web Client',
            description: 'Opens your browser to play using the modern web client (TypeScript)',
            value: 'web'
        }, {
            name: 'Run Java Client',
            description: 'Opens the legacy Java applet to play using the original client',
            value: 'java'
        }, {
            name: 'Advanced Options',
            description: 'View more options',
            value: 'advanced'
        }, {
            name: 'Quit',
            description: '',
            value: 'quit'
        }]
    }, { clearPromptOnDone: true });

    if (choice === 'start') {
        child_process.execSync('bun start', {
            stdio: 'inherit',
            cwd: 'engine'
        });
    } else if (choice === 'update') {
        updateRepo('engine');
        updateRepo('content');
        updateRepo('webclient');
        updateRepo('javaclient');
    } else if (choice === 'web') {
        if (process.platform === 'win32' || process.platform === 'darwin') {
            runOnOs('http://localhost/rs2.cgi');
        } else {
            runOnOs('http://localhost:8888/rs2.cgi');
        }
    } else if (choice === 'java') {
        child_process.execSync('gradlew run --args="10 0 highmem members"', {
            stdio: 'inherit',
            cwd: 'javaclient'
        });
    } else if (choice === 'advanced') {
        await promptAdvanced();
    } else if (choice === 'quit') {
        running = false;
    }
}

async function promptConfig() {
    const rev = await select({
        message: 'What version are you interested in?',
        choices: [{
            name: '225',
            description: 'May 18, 2004',
            value: '225'
        }]
    }, { clearPromptOnDone: true });

    config.rev = rev;
    fs.writeFileSync('server.json', JSON.stringify(config, null, 2));
}

async function promptAdvanced() {
    const choice = await select({
        message: 'What would you like to do?',
        choices: [{
            name: 'Start Server (engine dev)',
            description: 'Starts the server and watches for .ts file changes to reload',
            value: 'start-dev'
        }, {
        // todo:
        //     name: 'Reconfigure Server',
        //     description: 'Edit the environment config for the server',
        //     value: 'configure'
        // }, {
            name: 'Clean-build Server',
            description: '',
            value: 'clean-build'
        }, {
            name: 'Build Web Client',
            description: '',
            value: 'build-web'
        }, {
            name: 'Build Java Client',
            description: '',
            value: 'build-java'
        }, {
            name: 'Back',
            description: 'Go back',
            value: 'back'
        }]
    }, { clearPromptOnDone: true });

    if (choice === 'start-dev') {
        child_process.execSync('bun run dev', {
            stdio: 'inherit',
            cwd: 'engine'
        });
    } else if (choice === 'configure') {
        // todo: has issues with input appearing right now
        child_process.spawnSync('bun run setup', {
            shell: true,
            stdio: 'inherit',
            cwd: 'engine'
        });
    } else if (choice === 'clean-build') {
        child_process.execSync('bun run clean', {
            stdio: 'inherit',
            cwd: 'engine'
        });

        child_process.execSync('bun run build', {
            stdio: 'inherit',
            cwd: 'engine'
        });
    } else if (choice === 'build-web') {
        child_process.execSync('bun run build', {
            stdio: 'inherit',
            cwd: 'webclient'
        });

        fs.copyFileSync('webclient/out/client.js', 'engine/public/client/client.js');
        fs.copyFileSync('webclient/out/deps.js', 'engine/public/client/deps.js');
    } else if (choice === 'build-java') {
        child_process.execSync('gradlew build', {
            stdio: 'inherit',
            cwd: 'javaclient'
        });
    }
}

try {
    while (running) {
        await main();
    }
} catch (e) {
    if (e instanceof ExitPromptError) {
        process.exit(0);
    } else if (e instanceof Error) {
        if (e.message.startsWith('Command failed:')) {
            process.exit(0);
        }

        console.log(e.message);
    }
}
