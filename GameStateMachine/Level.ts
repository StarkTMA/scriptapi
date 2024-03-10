import { BranchDatabase } from "./database.js";
import { BranchObject, PlayerObject, levelState, playerState } from "./interfaces.js";
import * as mc from "@minecraft/server";

class Events {
	public onLevelLoad: (() => void)[];
	public levelLoop: (() => void)[];
	public onLevelExit: (() => void)[];

	public onPlayerJoinLevel: ((player: mc.Player) => void)[];
	public onPlayerRespawn: ((player: mc.Player) => void)[];
	public onPlayerDeath: ((player: mc.Player) => void)[];
	public onPlayerLeaveLevel: ((player: mc.Player) => void)[];

	public onPlayerJoinServer: ((player: mc.Player) => void)[];
	public onPlayerLeaveServer: ((player: mc.Player) => void)[];

	constructor() {
		this.onLevelLoad = [];
		this.levelLoop = [];
		this.onLevelExit = [];

		this.onPlayerJoinLevel = [];
		this.onPlayerRespawn = [];
		this.onPlayerDeath = [];
		this.onPlayerLeaveLevel = [];

		this.onPlayerJoinServer = [];
		this.onPlayerLeaveServer = [];
	}

	triggerLevelLoad() {
		this.onLevelLoad.forEach((func) => func());
	}

	triggerLevelLoop() {
		this.levelLoop.forEach((func) => func());
	}

	triggerLevelExit() {
		this.onLevelExit.forEach((func) => func());
	}

	triggerPlayerJoinServer(player: mc.Player) {
		this.onPlayerJoinServer.forEach((func) => func(player));
	}

	triggerPlayerLeaveServer(player: mc.Player) {
		this.onPlayerLeaveServer.forEach((func) => func(player));
	}

	triggerPlayerJoinLevel(player: mc.Player) {
		this.onPlayerJoinLevel.forEach((func) => func(player));
	}

	triggerPlayerLeaveLevel(player: mc.Player) {
		this.onPlayerLeaveLevel.forEach((func) => func(player));
	}

	triggerPlayerRespawn(player: mc.Player) {
		this.onPlayerRespawn.forEach((func) => func(player));
	}

	triggerPlayerDeath(player: mc.Player) {
		this.onPlayerDeath.forEach((func) => func(player));
	}
}

class EventsRegistry {
	private events: Events;

	constructor(events: Events) {
		this.events = events;
	}

	onLevelLoad(callback: () => void) {
		this.events.onLevelLoad.push(callback);
	}

	onLevelLoop(callback: () => void) {
		this.events.levelLoop.push(callback);
	}

	onLevelExit(callback: () => void) {
		this.events.onLevelExit.push(callback);
	}

	onPlayerJoinServer(callback: (player: mc.Player) => void) {
		this.events.onPlayerJoinServer.push(callback);
	}

	onPlayerLeaveServer(callback: (player: mc.Player) => void) {
		this.events.onPlayerLeaveServer.push(callback);
	}

	onPlayerJoinLevel(callback: (player: mc.Player) => void) {
		this.events.onPlayerJoinLevel.push(callback);
	}

	onPlayerLeaveLevel(callback: (player: mc.Player) => void) {
		this.events.onPlayerLeaveLevel.push(callback);
	}

	onPlayerRespawn(callback: (player: mc.Player) => void) {
		this.events.onPlayerRespawn.push(callback);
	}

	onPlayerDeath(callback: (player: mc.Player) => void) {
		this.events.onPlayerDeath.push(callback);
	}
}

export class Level {
	private branchIdentifier: string;
	private branchDatabase: BranchDatabase;

	public identifier: string;
	public levelIndex: number;
	public levelTick: number;
	public stateTick: number;

	public eventTrigger: Events;
	public events: EventsRegistry;

	constructor(identifier: string, branchIdentifier: string, levelIndex: number) {
		this.identifier = `${branchIdentifier}_${identifier}`;
		this.branchIdentifier = branchIdentifier;
		this.branchDatabase = BranchDatabase.getInstance();
		this.levelIndex = levelIndex;
		this.levelTick = 0;
		this.stateTick = 0;

		this.eventTrigger = new Events();
		this.events = new EventsRegistry(this.eventTrigger);
	}

	nextState() {
		let branch: BranchObject = this.branchDatabase.getObject(this.branchIdentifier)!;

		if (branch.levelState == levelState.END_LEVEL) {
			branch.levelState = levelState.COMPLETED;
		} else if (branch.levelState == levelState.LOOP) {
			branch.levelState = levelState.END_LEVEL;
		} else if (branch.levelState == levelState.INIT_LEVEL) {
			branch.levelState = levelState.LOOP;
		}

		branch.stateTick = 0;

		this.branchDatabase.updateObject(branch);
	}

	tick() {
		let branch: BranchObject = this.branchDatabase.getObject(this.branchIdentifier)!;

		branch.stateTick++;
		if (branch.levelState == levelState.INIT_LEVEL) {
			this.eventTrigger.triggerLevelLoad();
		} else if (branch.levelState == levelState.LOOP) {
			this.eventTrigger.triggerLevelLoop();
		} else if (branch.levelState == levelState.END_LEVEL) {
			this.eventTrigger.triggerLevelExit();
		}
		this.levelTick = branch.levelTick;
		this.stateTick = branch.stateTick;
		this.branchDatabase.updateObject(branch);
	}
}
