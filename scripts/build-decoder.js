const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const repositoryRoot = path.resolve(__dirname, "..");
const decoderDirectory = path.join(repositoryRoot, "src", "decoder");
const decoderOutput = path.join(decoderDirectory, "wasm", "decoder.js");
const imageName = process.env.DECODER_IMAGE || "audio-decoder";

function fail(message) {
  console.error(`Decoder build failed: ${message}`);
  process.exit(1);
}

function checkOutput() {
  let stats;
  try {
    stats = fs.statSync(decoderOutput);
  } catch (error) {
    if (error.code === "ENOENT") {
      fail(
        `missing ${path.relative(repositoryRoot, decoderOutput)}; run npm run decoder:build`,
      );
    }
    throw error;
  }

  if (!stats.isFile() || stats.size === 0) {
    fail(
      `${path.relative(repositoryRoot, decoderOutput)} is empty; run npm run decoder:build`,
    );
  }
}

function runDocker(args) {
  const result = spawnSync("docker", args, {
    cwd: repositoryRoot,
    stdio: "inherit",
  });

  if (result.error) {
    fail(`could not start Docker (${result.error.message})`);
  }
  if (result.status !== 0) {
    fail(
      `Docker exited with ${
        result.status === null
          ? "no status (daemon may be unavailable)"
          : result.status
      }`,
    );
  }
}

if (process.argv.includes("--check")) {
  checkOutput();
  process.stdout.write(
    `Decoder artifact is present: ${path.relative(repositoryRoot, decoderOutput)}\n`,
  );
  process.exit(0);
}

const buildArgs = ["build", "--platform", "linux/amd64", "--tag", imageName];
const jobs = process.env.DECODER_BUILD_JOBS;
if (jobs !== undefined) {
  if (!/^\d+$/.test(jobs) || Number(jobs) < 1) {
    fail("DECODER_BUILD_JOBS must be a positive integer");
  }
  buildArgs.push("--build-arg", `MAKE_JOBS=${jobs}`);
}
buildArgs.push("src/decoder");

runDocker(buildArgs);
runDocker([
  "run",
  "--rm",
  "--platform",
  "linux/amd64",
  "--mount",
  `type=bind,source=${decoderDirectory},target=/build`,
  imageName,
  "make",
]);
checkOutput();
process.stdout.write(
  `Decoder artifact generated: ${path.relative(repositoryRoot, decoderOutput)}\n`,
);
