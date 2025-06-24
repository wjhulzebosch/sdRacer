/**
 * Code Validator for CarLang
 * Provides validation through ONLY_USE_THIS_TO_VALIDATE
 */

import CarLangParser from './CarLang-parser.js';
import CarLangEngine from './carlang-engine.js';

export function ONLY_USE_THIS_TO_VALIDATE() {
    // Get the code from the textarea
    const code = window.getCodeValue();
    // Get the level object
    const level = window.level;
    // Get the game div

    return masterValidateCode(code, level, null);
}

/**
 * Master validation function: parses code, validates AST, returns result.
 * @param {string} code - The code to validate.
 * @param {object} level - The current level object (must have cars info for OOP mode).
 * @param {object} gameDiv - The game div (can be null for validation only).
 * @returns {object} { ast, parseErrors, validation, valid }
 */
export function masterValidateCode(code, level, gameDiv) {
    // Use level.isSingleMode() and level.cars as the single source of truth
    let mode = 'single';
    let carNames = [];
    if (level && typeof level.isSingleMode === 'function' && !level.isSingleMode()) {
        mode = 'oop';
        if (Array.isArray(level.cars)) {
            carNames = level.cars.map(car => car.name);
        }
    }
    const parser = new CarLangParser(mode, carNames);
    const ast = parser.parse(code);
    const parseErrors = ast.errors || [];
    let validation = { valid: true, errors: [], warnings: [] };
    if (parseErrors.length === 0) {
        // Build a car map for validation (name -> dummy object)
        let carMap = {};
        if (mode === 'oop' && Array.isArray(level.cars)) {
            for (const car of level.cars) {
                carMap[car.name] = {}; // dummy object for validation
            }
        }
        const engine = new CarLangEngine(carMap, level, gameDiv);
        validation = engine.validate(ast);
    }
    return {
        ast,
        parseErrors,
        validation,
        valid: parseErrors.length === 0 && validation.valid
    };
} 