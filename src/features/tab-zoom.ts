import { Notice, WorkspaceLeaf } from "obsidian";
import type { EventRef } from "obsidian";
import type { Feature } from "./feature";
import type { WhyingPluginContext } from "../types";

interface TabZoomSettings {
	defaultZoom: number;
	zoomStep: number;
	minZoom: number;
	maxZoom: number;
	showStatusBar: boolean;
	/** leafId -> zoom level */
	zoomRecords: Record<string, number>;
}

const TAB_ZOOM_DEFAULTS: TabZoomSettings = {
	defaultZoom: 100,
	zoomStep: 10,
	minZoom: 30,
	maxZoom: 300,
	showStatusBar: true,
	zoomRecords: {},
};

export { TAB_ZOOM_DEFAULTS };
export type { TabZoomSettings };

interface WorkspaceLeafWithId extends WorkspaceLeaf {
	id?: string;
}

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

		if (this.settings.showStatusBar) {
			this.statusBarEl = plugin.addStatusBarItem();
			this.statusBarEl.addClass("tab-zoom-status");
			this.updateStatusBar(this.settings.defaultZoom);
		}

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

	private getLeafId(leaf: WorkspaceLeaf): string {
		return (leaf as WorkspaceLeafWithId).id ?? "";
	}

	private getZoomTarget(leaf: WorkspaceLeaf): HTMLElement | null {
		const container = leaf.view?.containerEl;
		if (!container) return null;
		return container.querySelector<HTMLElement>(".view-content") ?? container;
	}

	private clampZoom(zoom: number): number {
		return Math.max(this.settings.minZoom, Math.min(this.settings.maxZoom, zoom));
	}

	private applyZoomToLeaf(leaf: WorkspaceLeaf, zoomPercent: number) {
		const target = this.getZoomTarget(leaf);
		if (!target) return;

		const clamped = this.clampZoom(zoomPercent);
		target.style.setProperty("zoom", `${clamped / 100}`);
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
		const leafId = this.getLeafId(leaf);
		if (leafId && this.settings.zoomRecords[leafId] !== undefined) {
			return this.settings.zoomRecords[leafId];
		}
		return this.settings.defaultZoom;
	}

	// --- Commands ---

	private zoomCurrentTab(delta: number) {
		const leaf = this.getCurrentLeaf();
		if (!leaf) {
			new Notice("No active tab");
			return;
		}

		const newZoom = this.clampZoom(this.getCurrentZoom(leaf) + delta);
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
		this.plugin?.app.workspace.iterateAllLeaves((leaf) => {
			this.removeZoomFromLeaf(leaf);
		});
		this.settings.zoomRecords = {};
		void this.saveSettings();
		this.updateStatusBar(this.settings.defaultZoom);
		new Notice("All tabs zoom reset");
	}

	// --- Persistence (by leaf ID) ---

	private persistZoom(leaf: WorkspaceLeaf, zoom: number) {
		const leafId = this.getLeafId(leaf);
		if (!leafId) return;

		if (zoom === this.settings.defaultZoom) {
			delete this.settings.zoomRecords[leafId];
		} else {
			this.settings.zoomRecords[leafId] = zoom;
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
		const aliveLeafIds = new Set<string>();

		this.plugin?.app.workspace.iterateAllLeaves((leaf) => {
			const leafId = this.getLeafId(leaf);
			if (leafId) {
				aliveLeafIds.add(leafId);
				const savedZoom = this.settings.zoomRecords[leafId];
				if (savedZoom !== undefined) {
					this.applyZoomToLeaf(leaf, savedZoom);
				}
			}
		});

		// Clean up stale records for leaves that no longer exist
		let changed = false;
		for (const id of Object.keys(this.settings.zoomRecords)) {
			if (!aliveLeafIds.has(id)) {
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
