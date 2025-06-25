/**
 * Code Validator for CarLang
 * Provides validation through ONLY_USE_THIS_TO_VALIDATE
 */

import CarLangParser from './CarLang-parser.js';
import CarLangEngine from './carlang-engine.js';
import CommandableObject from './CommandableObject.js';

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
    
    // Use long names with "Car" suffix for cleaner syntax
    const availableCars = carNames.map(carName => carName + 'Car');
    
    const parser = new CarLangParser(world, availableCars);
    const ast = parser.parse(code);
    const parseErrors = ast.errors || [];
    let validation = { valid: true, errors: [], warnings: [] };
    if (parseErrors.length === 0) {
        // Build a commandable object map for validation (name -> dummy commandable object)
        let commandableObjectMap = {};
        if (mode === 'oop') {
            availableCars.forEach(carName => {
                // Create a dummy commandable object for validation
                const dummyEntity = { carType: carName.replace('Car', '') };
                commandableObjectMap[carName] = new CommandableObject(dummyEntity);
            });
        }
        const engine = new CarLangEngine(commandableObjectMap, world, gameDiv);
        validation = engine.validate(ast);
    }
    return {
        ast,
        parseErrors,
        validation,
        valid: parseErrors.length === 0 && validation.valid
    };
} 