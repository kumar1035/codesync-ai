import Docker from 'dockerode';
import { Writable } from 'stream';

const docker = new Docker({ socketPath: process.env.DOCKER_SOCKET || '/var/run/docker.sock' });

const LANGUAGE_CONFIG: Record<string, { image: string; cmd: (code: string, stdin: string) => string[] }> = {
  javascript: {
    image: 'node:20-alpine',
    cmd: (code) => ['node', '-e', code],
  },
  python: {
    image: 'python:3.12-alpine',
    cmd: (code) => ['python3', '-c', code],
  },
  cpp: {
    image: 'gcc:13',
    cmd: (code) => ['sh', '-c', `echo '${code.replace(/'/g, "'\\''")}' > /tmp/main.cpp && g++ -o /tmp/main /tmp/main.cpp && /tmp/main`],
  },
  java: {
    image: 'eclipse-temurin:21',
    cmd: (code) => ['sh', '-c', `mkdir -p /tmp/java && echo '${code.replace(/'/g, "'\\''")}' > /tmp/java/Main.java && cd /tmp/java && javac Main.java && java Main`],
  },
};

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTimeMs: number;
}

async function ensureImage(image: string): Promise<void> {
  try {
    await docker.getImage(image).inspect();
    return; // already local
  } catch {
    // not local — pull it
  }
  console.log(`[executor] pulling image ${image}...`);
  await new Promise<void>((resolve, reject) => {
    docker.pull(image, (err: any, stream: any) => {
      if (err) return reject(new Error(`Failed to pull ${image}: ${err.message}`));
      docker.modem.followProgress(stream, (err: any) => {
        if (err) return reject(err);
        console.log(`[executor] pulled ${image}`);
        resolve();
      });
    });
  });
}

export async function executeCode(
  language: string,
  code: string,
  stdin: string = '',
  timeoutMs: number = 30000,
  memoryLimitMb: number = 128
): Promise<ExecutionResult> {
  const config = LANGUAGE_CONFIG[language];
  if (!config) throw new Error(`Unsupported language: ${language}`);

  // Pull image on demand (fast no-op if already local)
  await ensureImage(config.image);

  const startTime = Date.now();

  const container = await docker.createContainer({
    Image: config.image,
    Cmd: config.cmd(code, stdin),
    AttachStdout: true,
    AttachStderr: true,
    NetworkDisabled: true,
    HostConfig: {
      Memory: memoryLimitMb * 1024 * 1024,
      MemorySwap: memoryLimitMb * 1024 * 1024,
      CpuQuota: 50000,
      CpuPeriod: 100000,
      AutoRemove: false, // manual cleanup so container.wait() is safe
      ReadonlyRootfs: false,
      CapDrop: ['ALL'],
      SecurityOpt: ['no-new-privileges'],
    },
  });

  let stdout = '';
  let stderr = '';

  const timeoutHandle = setTimeout(async () => {
    try { await container.stop({ t: 5 }); } catch { /* already stopped */ }
  }, timeoutMs);

  try {
    const stream = await container.attach({ stream: true, stdout: true, stderr: true });

    // Collect output; resolves when the stream closes (container exited)
    const outputDone = new Promise<void>((resolve) => {
      container.modem.demuxStream(stream, {
        write: (chunk: Buffer) => { stdout += chunk.toString(); },
      } as Writable, {
        write: (chunk: Buffer) => { stderr += chunk.toString(); },
      } as Writable);
      stream.on('end', resolve);
      stream.on('error', resolve);
    });

    await container.start();

    // Wait for exit code AND output concurrently.
    // container.wait() must be in-flight BEFORE the container exits,
    // otherwise Docker removes it (AutoRemove) and we get a 404.
    const [waitResult] = await Promise.all([container.wait(), outputDone]);

    clearTimeout(timeoutHandle);
    await container.remove({ force: true }).catch(() => {});

    return {
      stdout: stdout.slice(0, 50000),
      stderr: stderr.slice(0, 10000),
      exitCode: waitResult.StatusCode,
      executionTimeMs: Date.now() - startTime,
    };
  } catch (err) {
    clearTimeout(timeoutHandle);
    await container.remove({ force: true }).catch(() => {});
    throw err;
  }
}
