const { spawn, spawnSync } = require("child_process");
const path = require("path");

const ANDROID_HOME = "C:\\Android\\Sdk";
// NODE_PATH is inherited by every child process (npx → react-native CLI → Gradle → RNGP).
// Without it, react-native/cli.js runs from the pnpm virtual store and can't resolve
// @react-native-community/cli, so `react-native config` returns empty output and autolinking fails.
const NODE_PATH = [
  path.join(__dirname, "..", "node_modules"),
  path.join(__dirname, "..", "..", "..", "node_modules"),
].join(path.delimiter);
const env = { ...process.env, ANDROID_HOME, NODE_PATH };

// Kill anything already on Metro's port
spawnSync(
  "powershell",
  [
    "-Command",
    "Get-NetTCPConnection -LocalPort 8081 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }",
  ],
  { stdio: "ignore", shell: false },
);

// Start emulator in background
spawn(`${ANDROID_HOME}\\emulator\\emulator.exe`, ["-avd", "Pixel_7_API_35", "-gpu", "host"], {
  detached: true,
  stdio: "ignore",
}).unref();

// Build and install the APK (no Metro)
console.log("Building and installing APK...");
const install = spawnSync("npx", ["react-native", "run-android", "--no-packager"], {
  env,
  stdio: "inherit",
  shell: true,
});

if (install.status !== 0) process.exit(install.status ?? 1);

// Start Metro in foreground so logs are visible here
console.log("Starting Metro...");
const metro = spawn("npx", ["react-native", "start"], {
  env,
  stdio: "inherit",
  shell: true,
});

metro.on("exit", (code) => process.exit(code ?? 0));
