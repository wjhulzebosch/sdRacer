/**
 * Code Validator for CarLang
 * Provides validation through ONLY_USE_THIS_TO_VALIDATE
 */

import CarLangParser from './CarLang-parser.js';
import CarLangEngine from './carlang-engine.js';

export function ONLY_USE_THIS_TO_VALIDATE() {
    // Get the code from the textarea
    const code = window.getCodeValue();
    // Get the world object
    const world = window.world;
    // Get the game div

    return masterValidateCode(code, world, null);
}

/**
 * Master validation function: parses code, validates AST, returns result.
 * @param {string} code - The code to validate.
 * @param {object} world - The current world object (must have getMode() method).
 * @param {object} gameDiv - The game div (can be null for validation only).
 * @returns {object} { ast, parseErrors, validation, valid }
 */
export function masterValidateCode(code, world, gameDiv) {
    // Use world.getMode() as the single source of truth
    if (!world) {
        throw new Error('CRITICAL: masterValidateCode requires world parameter');
    }
    
    const mode = world.getMode();
    const carNames = world.getCarNames();
    
    const parser = new CarLangParser(world, carNames);
    const ast = parser.parse(code);
    const parseErrors = ast.errors || [];
    let validation = { valid: true, errors: [], warnings: [] };
    if (parseErrors.length === 0) {
        // Build a car map for validation (name -> dummy object)
        let carMap = {};
        if (mode === 'oop') {
            carNames.forEach(carName => {
                carMap[carName] = {}; // dummy object for validation
            });
        }
        const engine = new CarLangEngine(carMap, world, gameDiv);
        validation = engine.validate(ast);
    }
    return {
        ast,
        parseErrors,
        validation,
        valid: parseErrors.length === 0 && validation.valid
    };
} 