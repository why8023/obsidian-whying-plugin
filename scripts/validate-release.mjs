import { readFileSync } from "node:fs";

function readJson(path) {
	return JSON.parse(readFileSync(path, "utf8"));
}

const rawTag = process.argv[2] ?? process.env.GITHUB_REF_NAME ?? "";
const releaseTag = rawTag.replace(/^refs\/tags\//, "");

const packageJson = readJson("package.json");
const manifest = readJson("manifest.json");
const versions = readJson("versions.json");

const errors = [];

if (releaseTag && !/^\d+\.\d+\.\d+$/.test(releaseTag)) {
	errors.push(
		`Release tag must be plain semantic version x.y.z without a leading "v". Received "${releaseTag}".`,
	);
}

if (packageJson.version !== manifest.version) {
	errors.push(
		`package.json version "${packageJson.version}" must match manifest.json version "${manifest.version}".`,
	);
}

if (releaseTag && manifest.version !== releaseTag) {
	errors.push(
		`manifest.json version "${manifest.version}" must match the release tag "${releaseTag}".`,
	);
}

if (versions[manifest.version] !== manifest.minAppVersion) {
	const actual = versions[manifest.version];
	errors.push(
		`versions.json must map "${manifest.version}" to "${manifest.minAppVersion}", received "${actual ?? "<missing>"}".`,
	);
}

if (errors.length > 0) {
	console.error("Release metadata validation failed:");
	for (const error of errors) {
		console.error(`- ${error}`);
	}
	process.exit(1);
}

const scope = releaseTag ? ` for tag ${releaseTag}` : "";
console.log(`Release metadata is valid${scope}.`);
