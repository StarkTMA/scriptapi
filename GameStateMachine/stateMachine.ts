import * as mc from "@minecraft/server";
import { StateMachineDatabase, PlayerDatabase } from "./Database";
import { PlayerObject, levelState, playerState } from "./Interfaces";
import { Branch } from "./Branch";
import { Level } from "./Level";
import { NAMESPACE } from "../constants";

// TODO: add a migrate function to jump between branches and levels.

class StateMachine {
	private branchDB: StateMachineDatabase; // Tracks the branches registered in the world. Saved to world
	private playerDB: PlayerDatabase; // Tracks the levels state of the players. Saved to player
	private branches: Map<string, Branch>; // Registers branches in the world
	private activeBranches: Set<Branch>; // Tracks the active branches
	private defaultActiveBranches: Set<Branch>; // Tracks the default active branches

	private resetFunctions: (() => void)[]; // Functions to call when the state machine is reset
	private tickFunctions: (() => void)[]; // Functions to call when the state machine ticks

	private static readonly RESET_EVENT = `${NAMESPACE}:reset`;

	/**
	 * Resets the state machine.
	 */
	private reset() {
		this.branchDB.eraseAllObjects();
		this.playerDB.eraseAllObjects();
		this.activeBranches.clear();

		this.branches.forEach((branch) => {
			branch.resetBranch();
		});

		this.defaultActiveBranches.forEach((branch) => {
			this.activateBranch(branch);
		});

		mc.world.getAllPlayers().forEach((player) => {
			this.onPlayerJoinServer(player);
		});

		this.resetFunctions.forEach((callback) => {
			callback();
		});
	}

	/**
	 * Ticks the active branches.
	 * If a branch has no active levels, it is deactivated.
	 */
	private tick() {
		this.activeBranches.forEach((branch) => {
			branch.tick();
			const [activeLevel, activeLevelIdentifier] = branch.getActiveLevel();
			if (!activeLevel) {
				this.deactivateBranch(branch);
			} else {
				mc.world.getAllPlayers().forEach((player) => {
					if (activeLevel.levelState === levelState.INIT_LEVEL) {
						this.updatePlayerState(player, playerState.EXIT_PLAYER);
					} else if (activeLevel.levelState === levelState.COMPLETED) {
						this.updatePlayerState(player, playerState.SETUP_PLAYER);
					}
				});
			}
		});

		this.tickFunctions.forEach((callback) => {
			callback();
		});

		//this.debugPlayers();
		//this.debugBranches();
	}

	/**
	 * Called when a player joins the server.
	 * @param player The player that joined the server.
	 */
	private onPlayerJoinServer(player: mc.Player) {
		const playerObject = this.getPlayerObject(player.id);
		const branch = this.branches.get(playerObject.branch) ?? mainBranch;
		const [currentLevel, currentLevelID] = branch.getActiveLevel();

		if (!currentLevel || !this.activeBranches.has(branch)) {
			playerObject.branch = mainBranch.identifier;
			playerObject.playerLevel = mainLevel0.identifier;
			playerObject.playerState = playerState.SETUP_PLAYER;
			this.playerDB.updateObject(playerObject);
		} else {
			this.updatePlayerState(player, playerObject.playerLevel === currentLevelID ? playerState.EXIT_PLAYER : playerState.SETUP_PLAYER);
			currentLevel.events._triggerPlayerJoinServer(player);
		}
	}

	/**
	 * Called when a player leaves the server.
	 * @param player The player that left the server.
	 */
	private onPlayerLeaveServer(player: mc.Player) {
		const object = this.getPlayerObject(player.id);
		const branch = this.branches.get(object.branch);

		if (branch && this.activeBranches.has(branch)) {
			const [level, levelID] = branch.getActiveLevel();
			if (level) {
				level.events._triggerPlayerLeaveServer(player);
			}
		}

		this.playerDB.updateObject(object);
	}

	/**
	 * Called when a player respawns.
	 * @param player The player that respawned.
	 */
	private onPlayerRespawn(player: mc.Player) {
		const object = this.getPlayerObject(player.id);
		const branch = this.branches.get(object.branch);

		if (branch && this.activeBranches.has(branch)) {
			const [level, levelID] = branch.getActiveLevel();
			if (level) {
				level.events._triggerPlayerRespawn(player);
			}
		}

		this.playerDB.updateObject(object);
	}

	/**
	 * Called when a player dies.
	 * @param player The player that died.
	 */
	private onPlayerDied(player: mc.Player) {
		const object = this.getPlayerObject(player.id);
		const branch = this.branches.get(object.branch);

		if (branch && this.activeBranches.has(branch)) {
			const [level, levelID] = branch.getActiveLevel();
			if (level) {
				level.events._triggerPlayerDied(player);
			}
		}

		this.playerDB.updateObject(object);
	}

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
			const playerObject = this.getPlayerObject(player.id);
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

	/**
	 * Debug function to display the branches' state in the action bar.
	 */
	private debugBranches() {
		let data: { branch: string; level: string; state: string }[] = [];

		let longestBranchName = 0;
		let longestLevelName = 0;

		this.branches.forEach((branch) => {
			const [level, levelID] = branch.getActiveLevel();
			data.push({
				branch: branch.identifier,
				level: levelID,
				state: level?.levelState ?? "No active levels",
			});
			longestBranchName = Math.max(longestBranchName, branch.identifier.length);
			longestLevelName = Math.max(longestLevelName, levelID.length);
		});

		let formattedData = data.map((branch) => {
			return `§a${branch.branch.padEnd(longestBranchName)}§r | §6${branch.level.padEnd(longestLevelName)}§r | §3${branch.state}§r`;
		});
		mc.world.getDimension(mc.MinecraftDimensionTypes.overworld).runCommand(`title @a actionbar ${formattedData.join("\n")}`);
	}

	/**
	 * Gets the player object from the playerDB using the player's id.
	 * @param id The player's id.
	 * @returns The player object.
	 */
	private getPlayerObject(id: string): PlayerObject {
		const pDB = this.playerDB.getObject(id);
		if (!pDB) {
			this.playerDB.addObject({
				id: id,
				branch: mainBranch.identifier,
				playerLevel: mainLevel0.identifier,
				playerState: playerState.SETUP_PLAYER,
			});
		}
		return this.playerDB.getObject(id);
	}

	private updatePlayerState(player: mc.Player, newState: playerState) {
		const playerObject = this.getPlayerObject(player.id);
		const branch = this.branches.get(playerObject.branch) ?? mainBranch;
		const [currentLevel, currentLevelID] = branch.getActiveLevel();

		if (currentLevel) {
			if (newState === playerState.EXIT_PLAYER && playerObject.playerState !== newState) {
				currentLevel.events._triggerPlayerJoinLevel(player);
			} else if (newState === playerState.SETUP_PLAYER) {
				const currentIndex = parseInt(currentLevel.identifier.split(":")[1].split("_")[1]);
				const playerIndex = parseInt(playerObject.playerLevel.split(":")[1].split("_")[1]);

				if (currentIndex !== playerIndex) {
					for (let i = playerIndex; i < currentIndex; i++) {
						const levelToExit = branch.getLevel(`${branch.identifier}_${i}`);
						const levelToEnter = branch.getLevel(`${branch.identifier}_${i + 1}`);

						levelToExit?.events._triggerPlayerLeaveLevel(player);
						levelToEnter?.events._triggerPlayerJoinLevel(player);
					}
				} else {
					currentLevel.events._triggerPlayerLeaveLevel(player);
				}
			}

			playerObject.playerState = newState;
			playerObject.playerLevel = currentLevelID;
		}

		this.playerDB.updateObject(playerObject);
	}

	constructor() {
		this.branches = new Map();
		this.activeBranches = new Set();
		this.branchDB = new StateMachineDatabase("stateMachine");
		this.playerDB = new PlayerDatabase("playerDB");
		this.defaultActiveBranches = new Set();
		this.resetFunctions = [];
		this.tickFunctions = [];

		mc.system.runInterval(() => this.tick());
		mc.system.afterEvents.scriptEventReceive.subscribe((event) => {
			if (event.id == StateMachine.RESET_EVENT) {
				this.reset();
			}
		});
		mc.world.beforeEvents.playerLeave.subscribe((event) => {
			this.onPlayerLeaveServer(event.player);
		});
		mc.world.afterEvents.playerSpawn.subscribe((event) => {
			if (event.initialSpawn) {
				this.onPlayerJoinServer(event.player);
			} else {
				this.onPlayerRespawn(event.player);
			}
		});
		mc.world.afterEvents.entityDie.subscribe(
			(event) => {
				this.onPlayerDied(event.deadEntity as mc.Player);
			},
			{ entityTypes: ["minecraft:player"] }
		);
	}

	/**
	 * Creates a new branch.
	 * @param name The branch name to create.
	 * @param activate Whether to activate the branch or not.
	 * @returns
	 */
	createBranch(name: string, activate: boolean = false): Branch {
		name = NAMESPACE + ":" + name;
		if (this.branches.has(name)) {
			throw new Error(`Branch with name ${name} already exists.`);
		}
		const branch = new Branch(name, this.branchDB);
		this.branches.set(name, branch);
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
	activateBranch(branch: Branch) {
		this.activeBranches.add(branch);
	}

	/**
	 * Deactivates a branch.
	 * @param branch The branch to deactivate.
	 */
	deactivateBranch(branch: Branch) {
		this.activeBranches.delete(branch);
	}

	/**
	 * Registers a function to call when the state machine is reset.
	 * @param callback The function to call when the state machine is reset.
	 */
	onReset(callback: () => void) {
		this.resetFunctions.push(callback);
	}

	/**
	 * Registers a function to call when the state machine ticks.
	 * @param callback The function to call when the state machine ticks.
	 */
	onTick(callback: () => void) {
		this.tickFunctions.push(callback);
	}
}

export const stateMachine = new StateMachine();
export const mainBranch = stateMachine.createBranch("mainBranch", true);
export const mainLevel0 = mainBranch.addLevel();
