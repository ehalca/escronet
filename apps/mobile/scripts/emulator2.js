/**
 * Starts a second emulator instance for guardian pairing tests.
 *
 * Strategy: clone just the config files of Pixel_7_API_35 into a temp AVD
 * (Pixel_7_API_35_test2) with fresh user-data, then boot and install the APK.
 *
 * Prerequisites: run `pnpm dev:android` at least once so the APK is built.
 */
const { spawn, spawnSync, execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const ANDROID_HOME = "C:\\Android\\Sdk";
const ADB = path.join(ANDROID_HOME, "platform-tools", "adb.exe");
const EMULATOR = path.join(ANDROID_HOME, "emulator", "emulator.exe");
const AVD_HOME = path.join(os.homedir(), ".android", "avd");
const SOURCE_AVD = "Pixel_7_API_35";
const TEMP_AVD = "Pixel_7_API_35_test2";
const APK = path.join(
  __dirname,
  "..",
  "android",
  "app",
  "build",
  "outputs",
  "apk",
  "debug",
  "app-debug.apk",
);
const APP_PACKAGE = "com.escronet";
const MAX_WAIT_MS = 180_000;
const POLL_MS = 3_000;

// ── helpers ────────────────────────────────────────────────────────────────

function adb(...args) {
  try {
    return execFileSync(ADB, args, { encoding: "utf8" });
  } catch (e) {
    return e.stdout?.toString() ?? "";
  }
}

function getAllEmulators() {
  return adb("devices")
    .split("\n")
    .slice(1)
    .map((l) => l.trim())
    .filter((l) => l.startsWith("emulator-"))
    .map((l) => {
      const [serial, state] = l.split(/\s+/);
      return { serial, state: state ?? "unknown" };
    });
}

function isBooted(serial) {
  return adb("-s", serial, "shell", "getprop", "sys.boot_completed").trim() === "1";
}

// ── create temp AVD ────────────────────────────────────────────────────────

function createTempAvd() {
  const srcDir = path.join(AVD_HOME, `${SOURCE_AVD}.avd`);
  const srcIni = path.join(AVD_HOME, `${SOURCE_AVD}.ini`);
  const dstDir = path.join(AVD_HOME, `${TEMP_AVD}.avd`);
  const dstIni = path.join(AVD_HOME, `${TEMP_AVD}.ini`);

  if (!fs.existsSync(srcDir)) {
    console.error(`AVD not found: ${srcDir}`);
    console.error(`Make sure the AVD "${SOURCE_AVD}" exists in Android Studio.`);
    process.exit(1);
  }

  // Clean up any leftover temp AVD from a previous run
  try {
    fs.rmSync(dstDir, { recursive: true, force: true });
    fs.rmSync(dstIni, { force: true });
  } catch {}

  // Copy config.ini, replacing the AVD ID references
  fs.mkdirSync(dstDir, { recursive: true });
  const configSrc = fs.readFileSync(path.join(srcDir, "config.ini"), "utf8");
  const configDst = configSrc
    .replace(/^AvdId=.*/m, `AvdId=${TEMP_AVD}`)
    .replace(/^avd\.ini\.displayname=.*/m, `avd.ini.displayname=Pixel 7 (test2)`);
  fs.writeFileSync(path.join(dstDir, "config.ini"), configDst);

  // Write .ini pointer file
  const iniSrc = fs.readFileSync(srcIni, "utf8");
  const iniDst = iniSrc
    .replace(new RegExp(SOURCE_AVD.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), TEMP_AVD);
  fs.writeFileSync(dstIni, iniDst);

  console.log(`Temp AVD "${TEMP_AVD}" created → ${dstDir}`);
}

// ── main ───────────────────────────────────────────────────────────────────

const before = getAllEmulators();
console.log(
  `Existing emulators: [${before.map((e) => `${e.serial}(${e.state})`).join(", ") || "none"}]`,
);

createTempAvd();

// Write emulator stdout/stderr to a temp log for diagnostics
const logPath = path.join(os.tmpdir(), "escronet_emulator2.log");
const logFd = fs.openSync(logPath, "w");
console.log(`Launching ${TEMP_AVD}... (log: ${logPath})`);

const proc = spawn(EMULATOR, ["-avd", TEMP_AVD, "-gpu", "host", "-wipe-data", "-no-snapstorage"], {
  detached: true,
  stdio: ["ignore", logFd, logFd],
});

proc.on("error", (err) => {
  console.error("Failed to start emulator process:", err.message);
  process.exit(1);
});

// Allow Node to exit once setup is done — emulator keeps running
proc.unref();
fs.closeSync(logFd);

const started = Date.now();
let trackedSerial = null;

const poll = setInterval(() => {
  const elapsed = Date.now() - started;

  if (elapsed > MAX_WAIT_MS) {
    clearInterval(poll);
    let hint = "";
    try {
      const tail = fs.readFileSync(logPath, "utf8").split("\n").slice(-25).join("\n");
      if (tail.trim()) hint = `\nEmulator output (last 25 lines):\n${tail}`;
    } catch {}
    console.error(`\nTimed out after 3 min.${hint}`);
    process.exit(1);
  }

  const after = getAllEmulators();

  if (!trackedSerial) {
    const newEntry = after.find((e) => !before.some((b) => b.serial === e.serial));
    if (!newEntry) {
      process.stdout.write(".");
      return;
    }
    trackedSerial = newEntry.serial;
    console.log(`\nDetected: ${trackedSerial} (${newEntry.state})`);
  }

  const current = after.find((e) => e.serial === trackedSerial);
  if (!current || current.state !== "device") {
    process.stdout.write("~");
    return;
  }

  if (!isBooted(trackedSerial)) {
    process.stdout.write("+");
    return;
  }

  clearInterval(poll);
  console.log(`\n${trackedSerial} fully booted.`);

  adb("-s", trackedSerial, "reverse", "tcp:8081", "tcp:8081");
  adb("-s", trackedSerial, "reverse", "tcp:3000", "tcp:3000");
  console.log("Reverse tunnels: :8081 (Metro) :3000 (backend)");

  console.log("Installing APK...");
  const install = spawnSync(ADB, ["-s", trackedSerial, "install", "-r", "-t", APK], {
    stdio: "inherit",
  });

  if (install.status !== 0) {
    console.error(
      "\nInstall failed. Run `pnpm dev:android` first, then retry `pnpm emulator2`.",
    );
    process.exit(install.status ?? 1);
  }

  adb("-s", trackedSerial, "shell", "am", "start", "-n", `${APP_PACKAGE}/.MainActivity`);
  console.log(`\nDone — ${trackedSerial} is running the app.`);
  console.log(`Both emulators share Metro on :8081.`);
}, POLL_MS);
