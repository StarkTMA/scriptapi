import { StateMachineDatabase } from "./Database.js";
import * as mc from "@minecraft/server";
import { BranchObject, PlayerObject, levelState, playerState } from "./Interfaces.js";

class Event {
	private __onLevelLoad: (() => void)[];
	private __levelLoop: (() => void)[];
	private __onLevelExit: (() => void)[];

	private __onPlayerJoinLevel: ((player: mc.Player) => void)[];
	private __onPlayerRespawn: ((player: mc.Player) => void)[];
	private __onPlayerDied: ((player: mc.Player) => void)[];
	private __onPlayerLeaveLevel: ((player: mc.Player) => void)[];

	private __onPlayerJoinServer: ((player: mc.Player) => void)[];
	private __onPlayerLeaveServer: ((player: mc.Player) => void)[];

	constructor() {
		this.__onLevelLoad = [];
		this.__levelLoop = [];
		this.__onLevelExit = [];

		this.__onPlayerJoinLevel = [];
		this.__onPlayerRespawn = [];
		this.__onPlayerDied = [];
		this.__onPlayerLeaveLevel = [];

		this.__onPlayerJoinServer = [];
		this.__onPlayerLeaveServer = [];
	}

	_triggerLevelLoad() {
		for (const func of this.__onLevelLoad) {
			func();
		}
	}

	_triggerLevelLoop() {
		for (const func of this.__levelLoop) {
			func();
		}
	}

	_triggerLevelExit() {
		for (const func of this.__onLevelExit) {
			func();
		}
	}

	_triggerPlayerJoinServer(player: mc.Player) {
		for (const func of this.__onPlayerJoinServer) {
			func(player);
		}
	}

	_triggerPlayerLeaveServer(player: mc.Player) {
		for (const func of this.__onPlayerLeaveServer) {
			func(player);
		}
	}

	_triggerPlayerJoinLevel(player: mc.Player) {
		for (const func of this.__onPlayerJoinLevel) {
			func(player);
		}
	}

	_triggerPlayerLeaveLevel(player: mc.Player) {
		for (const func of this.__onPlayerLeaveLevel) {
			func(player);
		}
	}

	_triggerPlayerRespawn(player: mc.Player) {
		for (const func of this.__onPlayerRespawn) {
			func(player);
		}
	}

	_triggerPlayerDied(player: mc.Player) {
		for (const func of this.__onPlayerDied) {
			func(player);
		}
	}

	onLevelLoad(callback: () => void) {
		this.__onLevelLoad.push(callback);
	}

	levelLoop(callback: () => void) {
		this.__levelLoop.push(callback);
	}

	onLevelExit(callback: () => void) {
		this.__onLevelExit.push(callback);
	}

	onPlayerJoinServer(callback: (player: mc.Player) => void) {
		this.__onPlayerJoinServer.push(callback);
	}

	onPlayerLeaveServer(callback: (player: mc.Player) => void) {
		this.__onPlayerLeaveServer.push(callback);
	}

	onPlayerJoinLevel(callback: (player: mc.Player) => void) {
		this.__onPlayerJoinLevel.push(callback);
	}

	onPlayerLeaveLevel(callback: (player: mc.Player) => void) {
		this.__onPlayerLeaveLevel.push(callback);
	}

	onPlayerRespawn(callback: (player: mc.Player) => void) {
		this.__onPlayerRespawn.push(callback);
	}

	onPlayerDied(callback: (player: mc.Player) => void) {
		this.__onPlayerDied.push(callback);
	}
}

export class Level {
	private levelId: string;
	private branchId: string;
	private branchDatabase: StateMachineDatabase;
	private index: number;
	private levelTick: number;
	private stateTick: number;
	public events: Event;

	constructor(levelId: string, branchId: string, branchDatabase: StateMachineDatabase, index: number) {
		this.levelId = levelId;
		this.branchId = branchId;
		this.branchDatabase = branchDatabase;
		this.index = index;
		this.events = new Event();

		let object = this.getObject();

		this.levelTick = object.levelTick;
		this.stateTick = object.stateTick;
	}

	get identifier(): string {
		return this.levelId;
	}

	get levelIndex(): number {
		return this.index;
	}

	get levelState(): levelState {
		return this.branchDatabase.getObject(this.branchId).levelState;
	}

	private getObject(): BranchObject {
		return this.branchDatabase.getObject(this.branchId);
	}

	get getLevelTick(): number {
		return this.levelTick;
	}

	get getStateTick(): number {
		return this.stateTick;
	}

	nextState() {
		let branch: BranchObject = this.getObject();

		if (branch.levelState == levelState.INIT_LEVEL) {
			branch.levelState = levelState.LOOP;
		} else if (branch.levelState == levelState.LOOP) {
			branch.levelState = levelState.END_LEVEL;
		} else if (branch.levelState == levelState.END_LEVEL) {
			branch.levelState = levelState.COMPLETED;
		}
		branch.stateTick = 0;

		this.branchDatabase.updateObject(branch);
	}

	tick() {
		let branch: BranchObject = this.getObject();
		branch.stateTick++;
		if (branch.levelState == levelState.INIT_LEVEL) {
			this.events._triggerLevelLoad();
		} else if (branch.levelState == levelState.LOOP) {
			this.events._triggerLevelLoop();
		} else if (branch.levelState == levelState.END_LEVEL) {
			this.events._triggerLevelExit();
		}
		this.branchDatabase.updateObject(branch);
	}
}
