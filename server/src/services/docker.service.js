const Docker = require('dockerode');
const path = require('path');
const stream = require('stream');

const docker = new Docker();
const imageName = 'algo-runner-image'; // Our custom image name

/**
 * Builds the custom Docker image from the Dockerfile.
 * This should be run once when the server starts.
 */
async function buildImage() {
    console.log(`Building Docker image: ${imageName}...`);
    const stream = await docker.buildImage({
        context: path.join(__dirname, '..', '..', '..', 'algo-runner'), // Path to the algo-runner directory
        src: ['Dockerfile', 'requirements.txt', 'Tradehull_V2.py']
    }, { t: imageName });

    await new Promise((resolve, reject) => {
        docker.modem.followProgress(stream, (err, res) => err ? reject(err) : resolve(res));
    });
    console.log("Image built successfully.");
}

/**
 * Runs Python code inside our custom Docker container.
 * @param {string} userCode The Python code from the user.
 * @param {string} clientId The user's broker client ID.
 * @param {string} accessToken The user's broker access token.
 * @returns {Promise<string>} A promise that resolves with the code's output.
 */
async function runPythonCode(userCode, clientId, accessToken) {
    // We indent every line of the user's code to place it correctly inside the try block.
    const indentedUserCode = userCode.split('\n').map(line => '    ' + line).join('\n');

    // This is the "wrapper" that provides the trading library and credentials.
    const fullCode = `
import time
from Tradehull_V2 import Tradehull

client_code = "${clientId}"
token_id    = "${accessToken}"
tsl         = Tradehull(client_code, token_id)

print("--- Environment Initialized. Executing User Code ---")

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
        console.error("Error running Docker container:", err);
        return `Error executing code in Docker: ${err.message}`;
    }
}

// Export both functions so they can be used by server.js
module.exports = { buildImage, runPythonCode };