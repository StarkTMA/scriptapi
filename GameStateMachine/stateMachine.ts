import * as mc from "@minecraft/server";
import { BranchDatabase, PlayerDatabase } from "./database";
import { PlayerObject, levelState, playerState } from "./interfaces";
import { Branch } from "./branch";
import { NAMESPACE } from "../constants";
import { Level } from "./level";

const RESET_EVENT = `${NAMESPACE}:reset`;
const JUMP_EVENT = `${NAMESPACE}:jump`;

class StateMachineEvents {
	public resetFunctions: (() => void)[]; // Functions to call when the state machine is reset
	public tickFunctions: (() => void)[]; // Functions to call when the state machine ticks

	constructor() {
		this.resetFunctions = [];
		this.tickFunctions = [];
	}

	triggerReset() {
		this.resetFunctions.forEach((callback) => {
			callback();
		});
	}

	triggerTick() {
		this.tickFunctions.forEach((callback) => {
			callback();
		});
	}
}

class StateMachineEventRegister {
	private events: StateMachineEvents;

	constructor(events: StateMachineEvents) {
		this.events = events;
	}

	onReset(callback: () => void) {
		this.events.resetFunctions.push(callback);
	}

	onTick(callback: () => void) {
		this.events.tickFunctions.push(callback);
	}
}

class PlayerManager {
	private playerDatabase: PlayerDatabase = PlayerDatabase.getInstance();
	private players: Map<string, mc.Player> = new Map();

	/**
	 *
	 * Debug function to display the players' state in the action bar.
	 */
	private debugPlayers() {
		let data: { playerName: string; branch: string; level: string; state: string }[] = [];

		let longestPlayerName = 0;
		let longestBranchName = 0;
		let longestLevelName = 0;

		const players = mc.world.getAllPlayers();
		for (const player of players) {
			const playerObject = this.playerDatabase.getObject(player.id)!;
			data.push({
				playerName: player.nameTag,
				branch: playerObject.branch,
				level: playerObject.playerLevel,
				state: playerObject.playerState,
			});
			longestPlayerName = Math.max(longestPlayerName, player.nameTag.length);
			longestBranchName = Math.max(longestBranchName, playerObject.branch.length);
			longestLevelName = Math.max(longestLevelName, playerObject.playerLevel.length);
		}

		let formattedData = data.map((player) => {
			return `${player.playerName.padEnd(longestPlayerName)} | §a${player.branch.padEnd(longestBranchName)}§r | §6${player.level.padEnd(
				longestLevelName
			)}§r | §3${player.state}§r`;
		});
		mc.world.getDimension(mc.MinecraftDimensionTypes.overworld).runCommand(`title @a actionbar ${formattedData.join("\n")}`);
	}

	private registerNewPlayer(player: mc.Player) {
		if (!this.playerDatabase.hasObject(player.id)) {
			this.playerDatabase.addObject({
				id: player.id,
				branch: mainBranch.identifier,
				playerLevel: mainLevel0.identifier,
				playerState: playerState.SETUP_PLAYER,
			});
		}
	}

	private updatePlayerState(currentLevel: Level, player: mc.Player, playerObject: PlayerObject, branch: Branch) {
		if (playerObject.playerLevel === currentLevel.identifier && playerObject.playerState === playerState.SETUP_PLAYER) {
			currentLevel.eventTrigger.triggerPlayerJoinLevel(player);
			playerObject.playerState = playerState.EXIT_PLAYER;
		} else if (playerObject.playerLevel !== currentLevel.identifier) {
			const levels = Array.from(branch.getLevels());

			const currentIndex = currentLevel.levelIndex;
			const playerIndex = levels.findIndex((level) => level[0] === playerObject.playerLevel);

			if (currentIndex !== playerIndex) {
				for (let i = playerIndex; i < currentIndex; i++) {
					const levelToExit = branch.getLevel(levels[i][0]);
					const levelToEnter = branch.getLevel(levels[i + 1][0]);

					levelToExit?.eventTrigger.triggerPlayerLeaveLevel(player);
					levelToEnter?.eventTrigger.triggerPlayerJoinLevel(player);
				}
			} else {
				currentLevel.eventTrigger.triggerPlayerLeaveLevel(player);
			}
			playerObject.playerState = playerState.SETUP_PLAYER;
			playerObject.playerLevel = currentLevel.identifier;
		}
	}

	/**
	 * Resets the player database.
	 */
	public reset() {
		this.playerDatabase.eraseAllObjects();

		mc.world.getAllPlayers().forEach((player) => {
			this.registerNewPlayer(player);
		});
	}

	/**
	 * Called when a player joins the server.
	 * If a player does not exist on the database, it will be added to the main branch.
	 * @param player The player that joined the server.
	 */
	public onPlayerJoinServer(player: mc.Player, branches: { branches: Map<string, Branch>; activeBranches: Set<Branch> }) {
		this.registerNewPlayer(player);

		this.players.set(player.id, player);

		const playerObject = this.playerDatabase.getObject(player.id)!;
		const branch = branches.branches.get(playerObject.branch)!;
		const currentLevel = branch.getActiveLevel();

		if (!currentLevel || !branches.activeBranches.has(branch)) {
			playerObject.branch = mainBranch.identifier;
			playerObject.playerLevel = mainLevel0.identifier;
			playerObject.playerState = playerState.SETUP_PLAYER;
			mainLevel0.eventTrigger.triggerPlayerJoinServer(player);
		} else {
			currentLevel.eventTrigger.triggerPlayerJoinServer(player);
			this.updatePlayerState(currentLevel, player, playerObject, branch);
		}
		this.playerDatabase.updateObject(playerObject);
	}

	/**
	 * Called when a player respawns.
	 * @param player The player that respawned.
	 */
	public onPlayerRespawn(player: mc.Player, branches: { branches: Map<string, Branch>; activeBranches: Set<Branch> }) {
		const playerObject = this.playerDatabase.getObject(player.id)!;
		const branch = branches.branches.get(playerObject.branch)!;
		const level = branch.getActiveLevel();

		if (level) {
			level.eventTrigger.triggerPlayerRespawn(player);
		}
	}

	/**
	 * Called when a player leaves the server.
	 * @param player The player that left the server.
	 */
	public onPlayerLeaveServer(player: mc.Player, branches: { branches: Map<string, Branch>; activeBranches: Set<Branch> }) {
		this.players.delete(player.id);

		const playerObject = this.playerDatabase.getObject(player.id)!;
		const branch = branches.branches.get(playerObject.branch)!;
		const level = branch.getActiveLevel();

		if (level) {
			level.eventTrigger.triggerPlayerLeaveServer(player);
		}
	}

	/**
	 * Called when a player dies.
	 * @param player The player that died.
	 */
	public onPlayerDeath(player: mc.Player, branches: { branches: Map<string, Branch>; activeBranches: Set<Branch> }) {
		const playerObject = this.playerDatabase.getObject(player.id)!;
		const branch = branches.branches.get(playerObject.branch)!;
		const level = branch.getActiveLevel();

		if (level) {
			level.eventTrigger.triggerPlayerDeath(player);
		}
	}

	public tick(activeBranches: Set<Branch>) {
		activeBranches.forEach((branch) => {
			this.playerDatabase
				.getAllObjects()
				.filter((player) => player.branch === branch.identifier)
				.forEach((player) => {
					const p = this.players.get(player.id);
					if (p) {
						this.updatePlayerState(branch.getActiveLevel()!, p, player, branch);
					}
				});
		});
	}
}

class StateMachine {
	private static instance: StateMachine;

	private playersManager: PlayerManager = new PlayerManager();

	private eventTrigger: StateMachineEvents = new StateMachineEvents();

	private branches: Map<string, Branch> = new Map();
	private activeBranches: Set<Branch> = new Set();
	private defaultActiveBranches: Set<Branch> = new Set();

	public events: StateMachineEventRegister = new StateMachineEventRegister(this.eventTrigger);

	/**
	 * Creates a new branch.
	 * @param name The branch name to create.
	 * @param activate Whether to activate the branch or not.
	 * @returns
	 */
	public createBranch(name: string, activate: boolean = false): Branch {
		const branchIdentifier = `${NAMESPACE}:${name}`;
		if (this.branches.has(branchIdentifier)) {
			throw new Error(`Branch with name ${branchIdentifier} already exists. Error at StateMachine.createBranch`);
		}
		const branch = new Branch(name);
		this.branches.set(branchIdentifier, branch);

		if (activate) {
			this.activateBranch(branch);
			this.defaultActiveBranches.add(branch);
		}
		return branch;
	}

	/**
	 * Activates a branch.
	 * @param branch The branch to activate.
	 */
	public activateBranch(branch: Branch) {
		this.activeBranches.add(branch);
	}

	/**
	 * Deactivates a branch.
	 * @param branch The branch to deactivate.
	 */
	public deactivateBranch(branch: Branch) {
		this.activeBranches.delete(branch);
	}

	public static getInstance(): StateMachine {
		if (!StateMachine.instance) {
			StateMachine.instance = new StateMachine();
		}
		return StateMachine.instance;
	}

	private constructor() {
		mc.system.runInterval(() => this.tick());

		mc.world.afterEvents.playerSpawn.subscribe((event) => {
			if (event.initialSpawn) {
				this.playersManager.onPlayerJoinServer(event.player, { branches: this.branches, activeBranches: this.activeBranches });
			} else {
				this.playersManager.onPlayerRespawn(event.player, { branches: this.branches, activeBranches: this.activeBranches });
			}
		});

		mc.world.beforeEvents.playerLeave.subscribe((event) => {
			this.playersManager.onPlayerLeaveServer(event.player, { branches: this.branches, activeBranches: this.activeBranches });
		});

		mc.world.afterEvents.entityDie.subscribe(
			(event) => {
				this.playersManager.onPlayerDeath(event.deadEntity as mc.Player, { branches: this.branches, activeBranches: this.activeBranches });
			},
			{ entityTypes: ["minecraft:player"] }
		);

		mc.system.afterEvents.scriptEventReceive.subscribe((event) => {
			if (event.id === RESET_EVENT) {
				this.reset();
			}
		});
	}

	/**
	 * Debug function to display the branches' state in the action bar.
	 */
	private debugBranches() {
		let data: { branch: string; level: string; state: string }[] = [];

		let longestBranchName = 0;
		let longestLevelName = 0;

		this.branches.forEach((branch) => {
			const level = branch.getActiveLevel();

			data.push({
				branch: branch.identifier,
				level: level?.identifier ?? "No active levels",
				state: branch.levelState,
			});
			longestBranchName = Math.max(longestBranchName, branch.identifier.length);
			longestLevelName = Math.max(longestLevelName, level?.identifier.length ?? 0);
		});

		let formattedData = data.map((branch) => {
			return `§a${branch.branch.padEnd(longestBranchName)}§r | §6${branch.level.padEnd(longestLevelName)}§r | §3${branch.state}§r`;
		});
		mc.world.getDimension(mc.MinecraftDimensionTypes.overworld).runCommand(`title @a actionbar ${formattedData.join("\n")}`);
	}

	/**
	 * Resets the state machine.
	 */
	private reset() {
		this.activeBranches.clear();
		this.branches.forEach((branch) => {
			branch.resetBranch();
		});
		this.defaultActiveBranches.forEach((branch) => {
			this.activateBranch(branch);
		});
		this.playersManager.reset();
		this.eventTrigger.triggerReset();
	}

	/**
	 * Ticks the active branches.
	 * If a branch has no active levels, it is deactivated.
	 */
	private tick() {
		this.branches.forEach((branch) => {
			if (!branch.getActiveLevel()) {
				this.deactivateBranch(branch);
			}
			branch.tick();
		});
		this.playersManager.tick(this.activeBranches);
		this.eventTrigger.triggerTick();
		this.debugBranches();
	}
}

export const stateMachine = StateMachine.getInstance();
export const mainBranch = stateMachine.createBranch("mainBranch", true);
export const mainLevel0 = mainBranch.addLevel("mainLevel0", true);
