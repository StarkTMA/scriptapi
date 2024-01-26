import { Entity, world, World } from "@minecraft/server";
import { NAMESPACE } from "../constants";

/**
 * DatabaseManager is a class that manages JSON databases stored in Minecraft's world properties.
 */
class DatabaseManager {
	private target: Entity | World;

	constructor(target: Entity | undefined) {
		if (target instanceof Entity){
			this.target = target;
		}
		else {
			this.target = world;
		}
	}

	/**
	 * Checks if a JSON database with the given name exists.
	 * @param databaseName The name of the database.
	 * @returns True if the database exists, false otherwise.
	 */
	hasJSONDatabase(databaseName: string) {
		return this.target.getDynamicProperty(NAMESPACE + ":" + databaseName) !== undefined;
	}

	/**
	 * Adds a new JSON database with the given name and data.
	 * @param databaseName The name of the database.
	 * @param database The data to be stored in the database.
	 */
	addJSONDatabase(databaseName: string, database: object) {
		this.target.setDynamicProperty(NAMESPACE + ":" + databaseName, JSON.stringify(database));
	}

	/**
	 * Removes a JSON database with the given name.
	 * @param databaseName The name of the database.
	 */
	removeJSONDatabase(databaseName: string) {
		if (this.hasJSONDatabase(databaseName)) {
			this.target.setDynamicProperty(NAMESPACE + ":" + databaseName, undefined);
		}
	}

	/**
	 * Retrieves a JSON database with the given name.
	 * @param databaseName The name of the database.
	 * @returns The data stored in the database.
	 * @throws An error if the database does not exist.
	 */
	getJSONDatabase(databaseName: string) {
		if (this.hasJSONDatabase(databaseName)) {
			return JSON.parse(this.target.getDynamicProperty(NAMESPACE + ":" + databaseName) as string);
		} else {
			throw new Error("Database does not exist");
		}
	}
}

/**
 * SimpleObject is an interface for objects with an id property.
 */
export interface SimpleObject {
	id: string;
}

/**
 * SimpleDatabase is a base class for databases that store custom objects with an id property.
 * This class is not meant to be used directly, but rather extended.
 * @example
 * MyObject extends SimpleObject {
 *  id: string;
 *  name: string;
 *  location: number[];
 * }
 *
 * class MyDatabase extends SimpleDatabase {
 *    constructor() {
 *       super("my_database");
 *    }
 *    addObject(object: MyObject) {
 *       super.addObject(object);
 *    }
 * }
 */
export class SimpleDatabase {
	private databaseName: string;
	private mainDB: DatabaseManager;
	private localDB: SimpleObject[] | any[];

	/**
	 * The constructor initializes the local database and syncs it with the main database.
	 * @param databaseName The name of the database.
	 * @param target The target entity to store the database in. If undefined, the database is stored in the world.
	 */
	constructor(databaseName: string, target: Entity | undefined) {
		this.mainDB = new DatabaseManager(target)
		this.databaseName = databaseName;

		if (this.mainDB.hasJSONDatabase(this.databaseName)) {
			this.localDB = this.getMainDB();
		} else {
			this.localDB = [];
			this.updateMainDB();
		}
	}

	/**
	 * Updates the main database with the local database.
	 * This method is called automatically when an object is added, updated or removed.
	 * @private
	 */
	private updateMainDB() {
		this.mainDB.addJSONDatabase(this.databaseName, this.localDB);
	}

	/**
	 * Retrieves the main database.
	 * @private
	 * @returns The main database.
	 */
	private getMainDB() {
		return this.mainDB.getJSONDatabase(this.databaseName);
	}

	/**
	 * Adds an object to the local database and updates the main database.
	 * @param object The object to be added.
	 */
	protected addObject(object: SimpleObject) {
		this.localDB.push(object);
		this.updateMainDB();
	}

	/**
	 * Updates an object in the local database and the main database.
	 * If the object does not exist, it is added.
	 * @param object The object to be updated.
	 */
	protected updateObject(object: SimpleObject) {
		if (this.hasObject(object.id)) {
			this.removeObject(object.id);
		}
		this.addObject(object);
	}

	/**
	 * Checks if an object with the given id exists in the local database.
	 * @param id The id of the object.
	 * @returns True if the object exists, false otherwise.
	 */
	hasObject(id: string) {
		return this.localDB.map((object) => object.id).includes(id);
	}

	/**
	 * Retrieves an object with the given id from the local database.
	 * @param id The id of the object.
	 * @returns The object if it exists, undefined otherwise.
	 */
	getObject(id: string) {
		return this.localDB.filter((object) => object.id === id)[0];
	}

	/**
	 * Removes an object with the given id from the local database and updates the main database.
	 * @param id The id of the object.
	 */
	removeObject(id: string) {
		this.localDB = this.localDB.filter((object) => object.id !== id);
		this.updateMainDB();
	}

	/**
	 * Retrieves all objects from the local database.
	 * @returns An array of all objects in the local database.
	 */
	getAllObjects() {
		return this.localDB;
	}

	/**
	 * Removes all objects from the local database and updates the main database.
	 */
	eraseAllObjects() {
		this.localDB = [];
		this.updateMainDB();
	}

	/**
	 * Iterates over all objects in the local database.
	 * @param callback The function to be called for each object.
	 */
	forEach(callback: (object: SimpleObject, index: number) => void) {
		this.localDB.forEach((object, index) => callback(object, index));
	}
}
