const serverProc = Bun.spawn(["bun", "--watch", "src/server/index.ts"], {
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
});

const clientProc = Bun.spawn(["bunx", "vite"], {
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
});

let shuttingDown = false;

function shutdown(exitCode: number): void {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  serverProc.kill();
  clientProc.kill();
  process.exit(exitCode);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

const exited = await Promise.race([
  serverProc.exited.then((code) => ({ name: "server", code })),
  clientProc.exited.then((code) => ({ name: "client", code })),
]);

if (!shuttingDown) {
  console.error(`[dev] ${exited.name} exited with code ${exited.code}`);
  shutdown(exited.code);
}

export {};
