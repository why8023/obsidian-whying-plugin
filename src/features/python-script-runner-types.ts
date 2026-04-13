export const PYTHON_SCRIPT_RUNNER_FEATURE_ID = "python-script-runner";
export const PYTHON_SCRIPT_RUNNER_DEFAULT_ARGS_TEMPLATE = "${file}";
export const PYTHON_SCRIPT_RUNNER_DEFAULT_TIMEOUT_MS = 300_000;

export type PythonScriptRunStatus =
	| "idle"
	| "running"
	| "success"
	| "error"
	| "timeout"
	| "spawn_error";

export type PythonScriptExecutionMode = "standalone-script" | "project";

export interface PythonScriptConfig {
	id: string;
	name: string;
	enabled: boolean;
	useIsolatedScript: boolean;
	projectPath: string;
	scriptPath: string;
	workingDirectory?: string;
	argsTemplate: string;
	timeoutMs?: number;
}

export interface PythonScriptLastRunRecord {
	scriptId: string;
	scriptName: string;
	status: PythonScriptRunStatus;
	startedAt?: number;
	endedAt?: number;
	exitCode?: number | null;
	signal?: string | null;
	stdout?: string;
	stderr?: string;
	errorMessage?: string;
	resolvedCommand?: string;
}

export interface PythonScriptRunnerSettings {
	uvPath: string;
	defaultTimeoutMs: number;
	scripts: PythonScriptConfig[];
	lastRun?: PythonScriptLastRunRecord;
}

export const PYTHON_SCRIPT_RUNNER_DEFAULTS: Readonly<PythonScriptRunnerSettings> = {
	uvPath: "uv",
	defaultTimeoutMs: PYTHON_SCRIPT_RUNNER_DEFAULT_TIMEOUT_MS,
	scripts: [],
};

export function createPythonScriptRunnerSettings(): PythonScriptRunnerSettings {
	return {
		uvPath: PYTHON_SCRIPT_RUNNER_DEFAULTS.uvPath,
		defaultTimeoutMs: PYTHON_SCRIPT_RUNNER_DEFAULTS.defaultTimeoutMs,
		scripts: [],
	};
}

export function createPythonScriptConfig(): PythonScriptConfig {
	return {
		id: createPythonScriptConfigId(),
		name: "",
		enabled: true,
		useIsolatedScript: true,
		projectPath: "",
		scriptPath: "",
		workingDirectory: "",
		argsTemplate: PYTHON_SCRIPT_RUNNER_DEFAULT_ARGS_TEMPLATE,
	};
}

function createPythonScriptConfigId(): string {
	const randomSuffix = Math.random().toString(36).slice(2, 8);
	return `python-script-${Date.now().toString(36)}-${randomSuffix}`;
}
