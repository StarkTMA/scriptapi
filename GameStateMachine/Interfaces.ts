export enum levelState {
	INIT_LEVEL = "INIT_LEVEL",
	LOOP = "LOOP",
	END_LEVEL = "END_LEVEL",
	COMPLETED = "COMPLETED",
}

export enum playerState {
	SETUP_PLAYER = "INIT_PLAYER",
	EXIT_PLAYER = "EXIT_PLAYER",
}

export interface BranchObject {
	id: string;
	activeLevel: string;
	levelState: levelState;
	levelTick: number;
	stateTick: number;
}

export interface PlayerObject {
	id: string;
	branch: string;
	playerLevel: string;
	playerState: playerState;
}