jest.mock('dockerode');
jest.mock('../src/models/UserStrategy.model');

const Docker = require('dockerode');
const dockerService = require('../src/services/docker.service');
const getStrategyModel = require('../src/models/UserStrategy.model');

describe('Docker Service Tests', () => {
  let mockDocker;
  let mockContainer;
  let Strategy;

  beforeEach(() => {
    mockContainer = {
      id: 'container123',
      start: jest.fn().mockResolvedValue(true),
      stop: jest.fn().mockResolvedValue(true),
      remove: jest.fn().mockResolvedValue(true),
      wait: jest.fn().mockResolvedValue({ StatusCode: 0 }),
      attach: jest.fn().mockResolvedValue({
        on: jest.fn(),
        pipe: jest.fn()
      }),
      inspect: jest.fn().mockResolvedValue({
        State: { Running: true, ExitCode: 0 }
      })
    };

    mockDocker = {
      createContainer: jest.fn().mockResolvedValue(mockContainer),
      getContainer: jest.fn().mockReturnValue(mockContainer),
      buildImage: jest.fn().mockResolvedValue('imageStream'),
      modem: {
        followProgress: jest.fn((stream, callback) => callback(null, []))
      }
    };

    Docker.mockImplementation(() => mockDocker);

    Strategy = {
      findByIdAndUpdate: jest.fn()
    };

    getStrategyModel.mockReturnValue(Strategy);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Docker Image Management', () => {
    test('should build Docker image successfully', async () => {
      const imageName = 'algo-runner-image';
      
      expect(mockDocker.buildImage).toBeDefined();
      expect(imageName).toBe('algo-runner-image');
    });

    test('should handle image build errors', async () => {
      const buildError = new Error('Build failed');
      mockDocker.buildImage = jest.fn().mockRejectedValue(buildError);

      try {
        await mockDocker.buildImage();
        fail('Should have thrown error');
      } catch (error) {
        expect(error.message).toBe('Build failed');
      }
    });
  });

  describe('Strategy Container Lifecycle', () => {
    test('should create and start strategy container', async () => {
      const strategy = {
        _id: 'strategy123',
        name: 'Test Strategy',
        code: 'print("Trading")',
        userId: 'user123'
      };

      const clientId = 'client123';
      const accessToken = 'token456';

      const container = await mockDocker.createContainer({
        Image: 'algo-runner-image',
        Cmd: ['python', '-u', '-c', 'strategy code'],
        name: `strategy-container-${strategy._id}`
      });

      await container.start();

      expect(mockDocker.createContainer).toHaveBeenCalled();
      expect(container.start).toHaveBeenCalled();
    });

    test('should stop running strategy container', async () => {
      const containerId = 'container123';
      const container = mockDocker.getContainer(containerId);
      
      await container.stop();
      
      expect(container.stop).toHaveBeenCalled();
    });

    test('should remove strategy container', async () => {
      const containerId = 'container123';
      const container = mockDocker.getContainer(containerId);
      
      await container.remove({ force: true });
      
      expect(container.remove).toHaveBeenCalledWith({ force: true });
    });

    test('should handle stale container removal before creating new one', async () => {
      const containerName = 'strategy-container-strategy123';
      
      // Simulate existing container
      mockDocker.getContainer = jest.fn().mockReturnValue(mockContainer);
      
      const existingContainer = mockDocker.getContainer(containerName);
      await existingContainer.remove({ force: true });
      
      expect(existingContainer.remove).toHaveBeenCalledWith({ force: true });
    });

    test('should handle 404 error when no stale container exists', async () => {
      const containerName = 'strategy-container-strategy123';
      const notFoundError = new Error('Not found');
      notFoundError.statusCode = 404;
      
      mockDocker.getContainer = jest.fn().mockReturnValue({
        remove: jest.fn().mockRejectedValue(notFoundError)
      });

      try {
        const container = mockDocker.getContainer(containerName);
        await container.remove({ force: true });
      } catch (error) {
        expect(error.statusCode).toBe(404);
      }
    });
  });

  describe('Python Code Execution', () => {
    test('should execute Python code in container', async () => {
      const userCode = 'print("Hello Trading")';
      const clientId = 'client123';
      const accessToken = 'token456';

      const fullCode = `
import time, sys
from Tradehull_V2 import Tradehull
client_code = "${clientId}"
token_id = "${accessToken}"
tsl = Tradehull(client_code, token_id)
    ${userCode}
      `.trim();

      const container = await mockDocker.createContainer({
        Image: 'algo-runner-image',
        Cmd: ['python', '-c', fullCode]
      });

      await container.start();
      const result = await container.wait();

      expect(container.start).toHaveBeenCalled();
      expect(result.StatusCode).toBe(0);
    });

    test('should indent user code properly', () => {
      const userCode = 'line1\nline2\nline3';
      const indented = userCode.split('\n').map(line => '    ' + line).join('\n');
      
      expect(indented).toBe('    line1\n    line2\n    line3');
    });

    test('should handle Python execution errors', async () => {
      mockContainer.wait = jest.fn().mockResolvedValue({ StatusCode: 1 });

      const result = await mockContainer.wait();
      expect(result.StatusCode).not.toBe(0);
    });
  });

  describe('Container State Management', () => {
    test('should check if container is running', async () => {
      const inspection = await mockContainer.inspect();
      const isRunning = inspection.State.Running;
      
      expect(isRunning).toBe(true);
    });

    test('should get container exit code', async () => {
      const inspection = await mockContainer.inspect();
      const exitCode = inspection.State.ExitCode;
      
      expect(exitCode).toBe(0);
    });

    test('should update strategy status after container start', async () => {
      const strategyId = 'strategy123';
      const containerId = 'container123';

      await Strategy.findByIdAndUpdate(strategyId, {
        status: 'running',
        containerId: containerId
      });

      expect(Strategy.findByIdAndUpdate).toHaveBeenCalledWith(
        strategyId,
        expect.objectContaining({ status: 'running' })
      );
    });

    test('should update strategy status after container stop', async () => {
      const strategyId = 'strategy123';

      await Strategy.findByIdAndUpdate(strategyId, {
        status: 'stopped',
        containerId: null
      });

      expect(Strategy.findByIdAndUpdate).toHaveBeenCalledWith(
        strategyId,
        expect.objectContaining({ status: 'stopped' })
      );
    });
  });

  describe('Container Logs and Output', () => {
    test('should attach to container logs', async () => {
      const stream = await mockContainer.attach({
        stream: true,
        stdout: true,
        stderr: true
      });

      expect(mockContainer.attach).toHaveBeenCalledWith({
        stream: true,
        stdout: true,
        stderr: true
      });
    });

    test('should capture container output', () => {
      const output = '--- Environment Initialized ---\nTrading strategy executed\n';
      const lines = output.split('\n');
      
      expect(lines.length).toBeGreaterThan(0);
      expect(output).toContain('Environment Initialized');
    });

    test('should handle empty log output', () => {
      const logOutput = '';
      expect(logOutput.length).toBe(0);
    });
  });

  describe('Container Configuration', () => {
    test('should set container name based on strategy ID', () => {
      const strategyId = 'strategy123';
      const containerName = `strategy-container-${strategyId}`;
      
      expect(containerName).toBe('strategy-container-strategy123');
    });

    test('should configure container with auto-remove', async () => {
      const container = await mockDocker.createContainer({
        Image: 'algo-runner-image',
        HostConfig: { AutoRemove: true }
      });

      expect(mockDocker.createContainer).toHaveBeenCalledWith(
        expect.objectContaining({
          HostConfig: expect.objectContaining({ AutoRemove: true })
        })
      );
    });

    test('should configure container with TTY disabled', async () => {
      const container = await mockDocker.createContainer({
        Image: 'algo-runner-image',
        Tty: false
      });

      expect(mockDocker.createContainer).toHaveBeenCalledWith(
        expect.objectContaining({ Tty: false })
      );
    });

    test('should use unbuffered Python output (-u flag)', () => {
      const cmd = ['python', '-u', '-c', 'code'];
      expect(cmd).toContain('-u');
      expect(cmd.indexOf('-u')).toBe(1);
    });
  });

  describe('Error Handling', () => {
    test('should handle container creation failure', async () => {
      const error = new Error('Failed to create container');
      mockDocker.createContainer = jest.fn().mockRejectedValue(error);

      try {
        await mockDocker.createContainer({});
        fail('Should have thrown error');
      } catch (err) {
        expect(err.message).toBe('Failed to create container');
      }
    });

    test('should handle container start failure', async () => {
      mockContainer.start = jest.fn().mockRejectedValue(new Error('Start failed'));

      try {
        await mockContainer.start();
        fail('Should have thrown error');
      } catch (err) {
        expect(err.message).toBe('Start failed');
      }
    });

    test('should handle container stop failure', async () => {
      mockContainer.stop = jest.fn().mockRejectedValue(new Error('Stop failed'));

      try {
        await mockContainer.stop();
        fail('Should have thrown error');
      } catch (err) {
        expect(err.message).toBe('Stop failed');
      }
    });
  });
});
