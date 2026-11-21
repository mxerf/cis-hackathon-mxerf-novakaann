const serverProc = Bun.spawn(["bun", "--watch", "src/api/server.ts"], {
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
});

const clientProc = Bun.spawn(["bunx", "vite"], {
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
});

let isShuttingDown = false;

function shutdown(exitCode: number): void {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;
  serverProc.kill();
  clientProc.kill();
  process.exit(exitCode);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

const exited = await Promise.race([
  serverProc.exited.then((code) => ({ name: "api", code })),
  clientProc.exited.then((code) => ({ name: "web", code })),
]);

if (!isShuttingDown) {
  process.stderr.write(`[dev] ${exited.name} exited with code ${exited.code}\n`);
  shutdown(exited.code);
}

export {};
