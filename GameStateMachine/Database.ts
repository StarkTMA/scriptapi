import { PlayerObject, BranchObject } from "./Interfaces";
import { SimpleDatabase, SimpleObject } from "../PropertyDatabase/Database";

export class StateMachineDatabase extends SimpleDatabase {
	constructor(name: string) {
		super(name, undefined);
	}

	addObject(object: BranchObject) {
		super.addObject(object);
	}

	updateObject(object: BranchObject) {
		super.updateObject(object);
	}
}

export class PlayerDatabase extends SimpleDatabase {
	constructor(name: string) {
		super(name, undefined);
	}

	addObject(object: PlayerObject) {
		super.addObject(object);
	}

	updateObject(object: PlayerObject) {
		super.updateObject(object);
	}
}