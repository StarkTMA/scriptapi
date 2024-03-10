import { PlayerObject, BranchObject } from "./interfaces";
import { SimpleDatabase } from "../PropertyDatabase/database";

export class BranchDatabase extends SimpleDatabase<BranchObject> {
	protected static instance: BranchDatabase;
	private constructor() {
		super("branchDatabase", undefined);
	}

	static getInstance(): BranchDatabase {
		if (!BranchDatabase.instance) {
			BranchDatabase.instance = new BranchDatabase();
		}
		return BranchDatabase.instance;
	}
}

export class PlayerDatabase extends SimpleDatabase<PlayerObject> {
	protected static instance: PlayerDatabase;
	private constructor() {
		super("playerDatabase", undefined);
	}

	static getInstance(): PlayerDatabase {
		if (!PlayerDatabase.instance) {
			PlayerDatabase.instance = new PlayerDatabase();
		}
		return PlayerDatabase.instance;
	}
}
