const Docker = require('dockerode');
const path = require('path');
const stream = require('stream');

const docker = new Docker();
const imageName = 'algo-runner-image';

let io;

function init(socketIoInstance) {
    io = socketIoInstance;
}

async function buildImage() {
    console.log(`Building Docker image: ${imageName}...`);
    try {
        const stream = await docker.buildImage({
            context: path.join(__dirname, '..', '..', '..', 'algo-runner'),
            src: ['Dockerfile', 'requirements.txt', 'Tradehull_V2.py']
        }, { t: imageName });
        await new Promise((resolve, reject) => {
            docker.modem.followProgress(stream, (err, res) => err ? reject(err) : resolve(res));
        });
        console.log("Image built successfully.");
    } catch (error) {
        console.error("Error building Docker image:", error);
        throw error;
    }
}

async function runPythonCode(userCode, clientId, accessToken) {
    const indentedUserCode = userCode.split('\n').map(line => '    ' + line).join('\n');
    const fullCode = `
import time, sys
from Tradehull_V2 import Tradehull
client_code = "${clientId}"
token_id    = "${accessToken}"
tsl         = Tradehull(client_code, token_id)
print("--- Environment Initialized. Executing User Code ---")
sys.stdout.flush()
try:
${indentedUserCode}
except Exception as e:
    print(f"An error occurred: {e}")
`;
    let logOutput = '';
    const logStream = new stream.PassThrough();
    logStream.on('data', (chunk) => {
        logOutput += chunk.toString('utf8');
    });
    try {
        const container = await docker.createContainer({
            Image: imageName,
            Cmd: ['python', '-c', fullCode],
            Tty: false,
            HostConfig: { AutoRemove: true },
        });
        const containerStream = await container.attach({ stream: true, stdout: true, stderr: true });
        container.modem.demuxStream(containerStream, logStream, logStream);
        await container.start();
        await container.wait();
        return logOutput;
    } catch (err) {
        return `Error executing code in Docker: ${err.message}`;
    }
}

async function startStrategyContainer(strategy, clientId, accessToken) {
    const fullCode = `
import time, sys
from Tradehull_V2 import Tradehull
client_code = "${clientId}"
token_id    = "${accessToken}"
tsl         = Tradehull(client_code, token_id)
print(f"--- Strategy ${strategy.name} Started ---")
sys.stdout.flush()
try:
${strategy.code.split('\n').map(line => '    ' + line).join('\n')}
except Exception as e:
    print(f"An error occurred: {e}")
`;
    const containerName = `strategy-container-${strategy._id}`;

    // --- THIS IS THE FIX ---
    // Before creating a new container, check for and remove any old container with the same name.
    try {
        const existingContainer = docker.getContainer(containerName);
        await existingContainer.remove({ force: true });
        console.log(`Removed stale container: ${containerName}`);
    } catch (error) {
        // A 404 error is normal and expected if the container doesn't exist.
        if (error.statusCode !== 404) {
            console.error(`Error checking for stale container:`, error.message);
        }
    }
    // --- END FIX ---

    const container = await docker.createContainer({
        Image: imageName,
        Cmd: ['python', '-u', '-c', fullCode],
        Tty: false,
        name: containerName
    });
    await container.start();
    const logStream = await container.logs({ follow: true, stdout: true, stderr: true });
    logStream.on('data', chunk => {
        const logMessage = chunk.toString('utf8').trim();
        if (io) {
            io.emit('strategy-log', {
                strategyId: strategy._id,
                message: logMessage
            });
        }
    });
    return container.id;
}

async function stopStrategyContainer(containerId) {
    try {
        const container = docker.getContainer(containerId);
        await container.remove({ force: true }); // Force remove stops and removes in one step
        return true;
    } catch (error) {
        // Ignore error if container is already gone
        if (error.statusCode !== 404) {
            console.error(`Error stopping container ${containerId}:`, error.message);
        }
        return false;
    }
}

// Fetch logs for a container (non-following). Returns logs as a string.
async function getContainerLogs(containerId) {
    try {
        const container = docker.getContainer(containerId);
        // Retrieve both stdout and stderr
        const logs = await container.logs({ stdout: true, stderr: true, timestamps: false, follow: false });
        if (!logs) return '';
        // logs may be a Buffer
        return logs.toString('utf8');
    } catch (error) {
        // If container not found or logs retrieval fails, return empty string
        if (error && error.statusCode !== 404) {
            console.error(`Error fetching logs for container ${containerId}:`, error.message || error);
        }
        return '';
    }
}

module.exports = {
    init,
    buildImage,
    runPythonCode,
    startStrategyContainer,
    stopStrategyContainer,
    getContainerLogs
};

