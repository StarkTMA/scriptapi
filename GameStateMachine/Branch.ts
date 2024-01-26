import { StateMachineDatabase } from "./Database";
import { Level } from "./Level";
import { BranchObject, PlayerObject, levelState } from "./Interfaces";

export class Branch {
	private database: StateMachineDatabase;
	private levels: Map<string, Level>;

	private branchId: string;
	private activeLevel!: string;
	private levelState!: levelState;
	private levelTick!: number;
	private stateTick!: number;

	private getBranchState() {
		const branchState: BranchObject | undefined = this.database.getObject(this.branchId);
		if (branchState) {
			this.activeLevel = branchState.activeLevel;
			this.levelState = branchState.levelState;
			this.levelTick = branchState.levelTick;
			this.stateTick = branchState.stateTick;
		} else {
			this.resetBranch();
		}
	}

	private updateBranchState() {
		this.database.updateObject({
			id: this.branchId,
			activeLevel: this.activeLevel,
			levelState: this.levelState,
			levelTick: this.levelTick,
			stateTick: this.stateTick,
		});
	}

	constructor(name: string, database: StateMachineDatabase) {
		this.branchId = name;
		this.database = database;
		this.levels = new Map();
		this.getBranchState();
	}

	get identifier(): string {
		return this.branchId;
	}

	getLevel(levelId: string) {
		return this.levels.get(levelId);
	}

	getActiveLevel(): [Level | undefined, string] {
		return [this.levels.get(this.activeLevel), this.activeLevel];
	}

	addLevel() {
		const levelId = this.branchId + "_" + this.levels.size;
		const level = new Level(levelId, this.branchId, this.database, this.levels.size);
		this.levels.set(levelId, level);
		return level;
	}

	tick() {
		const level = this.levels.get(this.activeLevel);

		if (level) {
			level.tick();
			this.levelTick++;
			if (this.levelState == levelState.COMPLETED) {
				const nextLevelID = this.branchId + "_" + (parseInt(this.activeLevel.split("_").pop()!) + 1);
				const nextLevel = this.levels.get(nextLevelID);
				if (nextLevel) {
					this.database.updateObject({
						id: this.branchId,
						activeLevel: nextLevelID,
						levelState: levelState.INIT_LEVEL,
						levelTick: 0,
						stateTick: 0,
					});
				} else {
					this.database.updateObject({
						id: this.branchId,
						activeLevel: "completed",
						levelState: levelState.COMPLETED,
						levelTick: 0,
						stateTick: 0,
					});
				}
			}
		}

		this.getBranchState();
	}

	resetBranch() {
		this.activeLevel = this.branchId + "_0";
		this.levelState = levelState.INIT_LEVEL;
		this.levelTick = 0;
		this.stateTick = 0;
		this.updateBranchState();
	}
}
