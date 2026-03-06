import tseslint from 'typescript-eslint';
import obsidianmd from "eslint-plugin-obsidianmd";
import globals from "globals";
import { globalIgnores } from "eslint/config";

type FlatConfigArg = Parameters<typeof tseslint.config>[number];

function normalizeConfigEntries(config: unknown): FlatConfigArg[] {
	if (config == null) {
		return [];
	}

	if (Array.isArray(config)) {
		return config as FlatConfigArg[];
	}

	if (
		typeof config === "object" &&
		config !== null &&
		Symbol.iterator in config &&
		typeof config[Symbol.iterator] === "function"
	) {
		return Array.from(config as Iterable<FlatConfigArg>);
	}

	return [config as FlatConfigArg];
}

const obsidianRecommended = normalizeConfigEntries(obsidianmd.configs?.recommended);

export default tseslint.config(
	{
		languageOptions: {
			globals: {
				...globals.browser,
			},
			parserOptions: {
				projectService: {
					allowDefaultProject: [
						'eslint.config.mts',
						'manifest.json'
					]
				},
				tsconfigRootDir: import.meta.dirname,
				extraFileExtensions: ['.json']
			},
		},
	},
	...obsidianRecommended,
	globalIgnores([
		"node_modules",
		"dist",
		"refer",
		"refer/**",
		"esbuild.config.mjs",
		"eslint.config.mts",
		"version-bump.mjs",
		"versions.json",
		"main.js",
	]),
);
