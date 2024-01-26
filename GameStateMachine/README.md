
# StateMachine for Minecraft Add-on

## Overview
The StateMachine module is a comprehensive Minecraft system designed for dynamically managing game states, player interactions, and level progression within custom Minecraft maps and add-ons. It leverages the Minecraft scripting API to offer a robust framework for creating complex gameplay mechanics.

The StateMachine is still under development.

## Features
- **Branch Management:** Facilitates the creation and management of multiple game branches, each representing a unique pathway or storyline within the game world.
- **Level Progression:** Each branch can contain multiple levels, with a system to manage player progression through these levels.
- **Dynamic Player State Handling:** Tracks and updates player states based on their interactions and progress within the game.
- **Event-Driven Architecture:** Utilizes custom events for player actions like joining/leaving the server, respawning, or dying, and level-specific events such as level load, loop, and exit.

## Installation
1. Ensure you have the Minecraft server set up with the appropriate scripting API support.
2. Clone or download this repository.
3. Place the StateMachine module in your server's script directory or in the assets/javascript directory if you're using Anvil.

## Usage
Import the StateMachine at the beginning of your server script:

```typescript
import { stateMachine, mainBranch, mainLevel0 } from 'path/to/StateMachine';
```

Use the provided methods to create and manage branches and levels, and to handle player states and events.

### Example
```typescript
// Create a new branch
const myBranch = stateMachine.createBranch("myCustomBranch");

// Add levels to the branch
const level1 = myBranch.addLevel();
const level2 = myBranch.addLevel();

// Set up event listeners for player actions
level1.events.onPlayerJoinLevel((player) => {
    // Custom logic when a player joins level 1
});
```

## API Reference
Detailed documentation of classes, methods, and their usage can be found in the respective TypeScript files within the module.

- **StateMachine**: Core class for managing branches, levels, and player states.
- **Branch**: Class representing a game branch, capable of holding multiple levels.
- **Level**: Class for individual levels within a branch, with its own lifecycle and events.
- **PlayerDatabase & StateMachineDatabase**: Classes for managing persistent data related to players and game states.