# Database Management in Minecraft: TypeScript Edition

PropertyDatabase is a TypeScript-based database management system designed for use within Minecraft. The system consists of two main classes: `DatabaseManager` and `SimpleDatabase`, which handle JSON database operations in the Minecraft world.

## Features

- **Entity & World Targeting**: Ability to target either an entity or the Minecraft world for storing data.
- **JSON Database Operations**: Supports basic CRUD (Create, Read, Update, Delete) operations for JSON databases.
- **Custom Object Management**: Facilitates storing and managing custom objects with unique IDs.

## Installation
1. Ensure you have the Minecraft server set up with the appropriate scripting API support.
2. Clone or download this repository.
3. Place the PropertyDatabase module in your server's script directory or in the assets/javascript directory if you're using Anvil.

## Usage

### DatabaseManager Class

Handles JSON databases in Minecraft's world properties. Can target an entity or the world itself.

#### Methods:

- `hasJSONDatabase(databaseName: string)`: Checks if a database exists.
- `addJSONDatabase(databaseName: string, database: object)`: Adds a new database.
- `removeJSONDatabase(databaseName: string)`: Removes a database.
- `getJSONDatabase(databaseName: string)`: Retrieves a database.

### SimpleDatabase Class

A base class for managing databases of custom objects.

#### Methods:

- `addObject(object: SimpleObject)`: Adds a new object to the database.
- `updateObject(object: SimpleObject)`: Updates an existing object.
- `hasObject(id: string)`: Checks if an object exists.
- `getObject(id: string)`: Retrieves an object by ID.
- `removeObject(id: string)`: Removes an object.
- `getAllObjects()`: Retrieves all objects.
- `eraseAllObjects()`: Clears the database.
- `forEach(callback: Function)`: Iterates over objects.

### SimpleObject Interface

A basic interface for objects managed by `SimpleDatabase`. Must include an `id` property.

## Examples

### Creating a Custom Database

```typescript
class MyDatabase extends SimpleDatabase {
	constructor() {
		super("my_database");
	}

	addObject(object: MyObject) {
		super.addObject(object);
	}

	// Additional custom methods...
}
```