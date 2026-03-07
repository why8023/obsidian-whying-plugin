import { ItemView, Notice, WorkspaceLeaf } from "obsidian";
import type { EventRef } from "obsidian";
import type { Feature } from "./feature";
import type { WhyingPluginContext } from "../types";

interface TabZoomSettings {
	defaultZoom: number;
	zoomStep: number;
	showStatusBar: boolean;
	/** serialized view state -> zoom level */
	zoomRecords: Record<string, number>;
}

const TAB_ZOOM_DEFAULTS: TabZoomSettings = {
	defaultZoom: 100,
	zoomStep: 10,
	showStatusBar: true,
	zoomRecords: {},
};

export { TAB_ZOOM_DEFAULTS };
export type { TabZoomSettings };

export class TabZoomFeature implements Feature {
	id = "tab-zoom";
	name = "Tab zoom";

	private plugin: WhyingPluginContext | null = null;
	private commandIds: string[] = [];
	private eventRefs: EventRef[] = [];
	private statusBarEl: HTMLElement | null = null;

	private get settings(): TabZoomSettings {
		return this.plugin?.settings.tabZoom ?? TAB_ZOOM_DEFAULTS;
	}

	private async saveSettings(): Promise<void> {
		if (this.plugin) {
			await this.plugin.saveSettings();
		}
	}

	onload(plugin: WhyingPluginContext): void {
		this.plugin = plugin;

		this.syncStatusBar();

		const commands = [
			{ id: "zoom-in", name: "Zoom in current tab", cb: () => this.zoomCurrentTab(this.settings.zoomStep) },
			{ id: "zoom-out", name: "Zoom out current tab", cb: () => this.zoomCurrentTab(-this.settings.zoomStep) },
			{ id: "zoom-reset", name: "Reset current tab zoom", cb: () => this.resetCurrentTabZoom() },
			{ id: "zoom-reset-all", name: "Reset all tabs zoom", cb: () => this.resetAllZoom() },
		];

		for (const cmd of commands) {
			this.commandIds.push(cmd.id);
			plugin.addCommand({ id: cmd.id, name: cmd.name, callback: cmd.cb });
		}

		this.eventRefs.push(
			plugin.app.workspace.on("active-leaf-change", (leaf) => {
				if (leaf) this.onActiveLeafChange(leaf);
			})
		);

		for (const ref of this.eventRefs) {
			plugin.registerEvent(ref);
		}

		plugin.app.workspace.onLayoutReady(() => {
			this.restoreAllZoom();
		});
	}

	onSettingsChanged(): void {
		this.syncStatusBar();
		this.applyZoomToAllLeaves();

		const activeLeaf = this.getCurrentLeaf();
		if (activeLeaf) {
			this.updateStatusBar(this.getCurrentZoom(activeLeaf));
		}
	}

	onunload(): void {
		if (this.plugin) {
			for (const id of this.commandIds) {
				this.plugin.removeCommand(`${this.plugin.manifest.id}:${id}`);
			}

			for (const ref of this.eventRefs) {
				this.plugin.app.workspace.offref(ref);
			}

			this.plugin.app.workspace.iterateAllLeaves((leaf) => {
				this.removeZoomFromLeaf(leaf);
			});

			if (this.statusBarEl) {
				this.statusBarEl.remove();
			}
		}

		this.commandIds = [];
		this.eventRefs = [];
		this.statusBarEl = null;
		this.plugin = null;
	}

	// --- Zoom core ---

	private getZoomKey(leaf: WorkspaceLeaf): string {
		const viewState = leaf.getViewState();

		return JSON.stringify({
			type: viewState.type,
			pinned: viewState.pinned ?? false,
			state: viewState.state ?? {},
		});
	}

	private getZoomTarget(leaf: WorkspaceLeaf): HTMLElement | null {
		const { view } = leaf;
		if (view instanceof ItemView) {
			return view.contentEl;
		}

		return view.containerEl;
	}

	private isValidZoom(zoom: number): boolean {
		return Number.isFinite(zoom) && zoom > 0;
	}

	private applyZoomToLeaf(leaf: WorkspaceLeaf, zoomPercent: number) {
		const target = this.getZoomTarget(leaf);
		if (!target || !this.isValidZoom(zoomPercent)) return;

		target.style.setProperty("zoom", `${zoomPercent / 100}`);
	}

	private removeZoomFromLeaf(leaf: WorkspaceLeaf) {
		const target = this.getZoomTarget(leaf);
		if (target) {
			target.style.removeProperty("zoom");
		}
	}

	private getCurrentLeaf(): WorkspaceLeaf | null {
		return this.plugin?.app.workspace.getMostRecentLeaf() ?? null;
	}

	private getCurrentZoom(leaf: WorkspaceLeaf): number {
		const zoomKey = this.getZoomKey(leaf);
		const savedZoom = this.settings.zoomRecords[zoomKey];
		if (savedZoom !== undefined && this.isValidZoom(savedZoom)) {
			return savedZoom;
		}
		return this.settings.defaultZoom;
	}

	private applyZoomToAllLeaves() {
		this.plugin?.app.workspace.iterateAllLeaves((leaf) => {
			this.applyZoomToLeaf(leaf, this.getCurrentZoom(leaf));
		});
	}

	private syncStatusBar() {
		if (!this.plugin) {
			return;
		}

		if (this.settings.showStatusBar) {
			if (!this.statusBarEl) {
				this.statusBarEl = this.plugin.addStatusBarItem();
				this.statusBarEl.addClass("tab-zoom-status");
			}
			return;
		}

		if (this.statusBarEl) {
			this.statusBarEl.remove();
			this.statusBarEl = null;
		}
	}

	// --- Commands ---

	private zoomCurrentTab(delta: number) {
		const leaf = this.getCurrentLeaf();
		if (!leaf) {
			new Notice("No active tab");
			return;
		}

		const newZoom = this.getCurrentZoom(leaf) + delta;
		if (!this.isValidZoom(newZoom)) {
			new Notice("Zoom must be greater than 0%", 1500);
			return;
		}

		this.applyZoomToLeaf(leaf, newZoom);
		this.persistZoom(leaf, newZoom);
		this.updateStatusBar(newZoom);

		if (newZoom !== this.settings.defaultZoom) {
			new Notice(`Zoom: ${newZoom}%`, 1500);
		}
	}

	private resetCurrentTabZoom() {
		const leaf = this.getCurrentLeaf();
		if (!leaf) return;

		const defaultZoom = this.settings.defaultZoom;
		this.applyZoomToLeaf(leaf, defaultZoom);
		this.persistZoom(leaf, defaultZoom);
		this.updateStatusBar(defaultZoom);
		new Notice("Zoom reset", 1500);
	}

	private resetAllZoom() {
		this.settings.zoomRecords = {};
		this.applyZoomToAllLeaves();
		void this.saveSettings();
		this.updateStatusBar(this.settings.defaultZoom);
		new Notice("All tabs zoom reset");
	}

	// --- Persistence (by view state) ---

	private persistZoom(leaf: WorkspaceLeaf, zoom: number) {
		const zoomKey = this.getZoomKey(leaf);

		if (zoom === this.settings.defaultZoom) {
			delete this.settings.zoomRecords[zoomKey];
		} else {
			this.settings.zoomRecords[zoomKey] = zoom;
		}
		void this.saveSettings();
	}

	// --- Restore ---

	private onActiveLeafChange(leaf: WorkspaceLeaf) {
		const zoom = this.getCurrentZoom(leaf);
		this.applyZoomToLeaf(leaf, zoom);
		this.updateStatusBar(zoom);
	}

	private restoreAllZoom() {
		const aliveZoomKeys = new Set<string>();

		this.plugin?.app.workspace.iterateAllLeaves((leaf) => {
			aliveZoomKeys.add(this.getZoomKey(leaf));

			this.applyZoomToLeaf(leaf, this.getCurrentZoom(leaf));
		});

		// Clean up stale records for views that no longer exist
		let changed = false;
		for (const id of Object.keys(this.settings.zoomRecords)) {
			if (!aliveZoomKeys.has(id)) {
				delete this.settings.zoomRecords[id];
				changed = true;
			}
		}
		if (changed) {
			void this.saveSettings();
		}

		const activeLeaf = this.getCurrentLeaf();
		if (activeLeaf) {
			this.updateStatusBar(this.getCurrentZoom(activeLeaf));
		}
	}

	// --- Status bar ---

	private updateStatusBar(zoom: number) {
		if (this.statusBarEl && this.settings.showStatusBar) {
			this.statusBarEl.setText(`${zoom}%`);
		}
	}
}
