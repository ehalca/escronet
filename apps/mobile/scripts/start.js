const { spawn } = require("child_process");
const path = require("path");

const NODE_PATH = [
  path.join(__dirname, "..", "node_modules"),
  path.join(__dirname, "..", "..", "..", "node_modules"),
].join(path.delimiter);

const args = ["react-native", "start", ...process.argv.slice(2)];
const child = spawn("npx", args, {
  env: { ...process.env, NODE_PATH },
  stdio: "inherit",
  shell: true,
});

child.on("exit", (code) => process.exit(code ?? 0));
