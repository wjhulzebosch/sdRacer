import Level from './level.js';
import World from './World.js';
import CarLangParser from './CarLang-parser.js';
import CarLangEngine from './carlang-engine.js';
import CommandableObject from './CommandableObject.js';
import { soundController } from './soundController.js';
import { ONLY_USE_THIS_TO_VALIDATE } from './code-validator.js';
import { validateCodeForUI } from './ui-code-validator.js';
import { debug, getLevelMode, getLevelDifficulty, getLevelCategory } from './commonFunctions.js';

const DEFAULT_CODE = `// Write your CarLang code here!`;

let saveBtn, loadBtn, playBtn, resetBtn;

let carRegistry = {};

let commandableObjectRegistry = {}; // New registry for CommandableObjects

let defaultCar = null; // For backward compatibility

let level = null;

let world = null; // New World instance

let currentLevelId = null;

let finishPos = null;

let allLevels = [];

let cows = []; // Array to store cow instances - will be replaced by World

let currentLevelData = null; // Track current level configuration

let currentCustomLevelData = null;

let isGameRunning = false; // Track if game is currently running

const _originalLoadLevel = loadLevel;
