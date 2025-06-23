import { masterValidateCode } from './code-validator.js';

/**
 * Validate code and update the UI with errors/warnings and AST.
 * Always targets the #parser-display div for output.
 * @param {string} code - The code to validate.
 * @param {object} parserConfig - { mode, availableCars }
 * @param {object} carRegistry - The car registry object.
 * @param {object} level - The current level object (can be null for validation only).
 * @param {object} gameDiv - The game div (can be null for validation only).
 */
export function validateAndShowInUI(code, parserConfig, carRegistry, level, gameDiv) {
    const parserDisplay = document.getElementById('parser-display');
    const result = masterValidateCode(code, parserConfig, carRegistry, level, gameDiv);
    let displayHTML = '';
    if (result.parseErrors.length > 0) {
        displayHTML += `<div class="validation-error" style="margin-bottom: 10px; font-weight: bold;">Parse Errors:</div>`;
        for (const error of result.parseErrors) {
            displayHTML += `<div class="validation-error">• ${error}</div>`;
            console.error('Parse Error:', error);
        }
    }
    if (result.validation.errors && result.validation.errors.length > 0) {
        displayHTML += `<div class="validation-error" style="margin-bottom: 10px; font-weight: bold;">Validation Errors:</div>`;
        for (const error of result.validation.errors) {
            displayHTML += `<div class="validation-error">• ${error}</div>`;
            console.error('Validation Error:', error);
        }
    }
    if (result.validation.warnings && result.validation.warnings.length > 0) {
        displayHTML += `<div class="validation-warning" style="margin-bottom: 10px; font-weight: bold;">Warnings:</div>`;
        for (const warning of result.validation.warnings) {
            displayHTML += `<div class="validation-warning">• ${warning}</div>`;
            console.warn('Validation Warning:', warning);
        }
    }
    if (result.valid) {
        displayHTML += `<div class="validation-success">Code is valid!</div>`;
    }
    // Always show AST if parsing succeeded
    if (result.ast && result.parseErrors.length === 0) {
        displayHTML += `<div style="color: #9ca3af; margin: 20px 0; border-top: 1px solid #444; padding-top: 10px; font-weight: bold;">Abstract Syntax Tree (AST):</div>`;
        displayHTML += `<pre style="background: #1a1e22; color: #e0e0e0; padding: 10px; border-radius: 4px; overflow-x: auto; font-size: 0.8rem; margin-top: 10px;">${escapeHtml(JSON.stringify(result.ast, null, 2))}</pre>`;
    }
    if (parserDisplay) parserDisplay.innerHTML = displayHTML;
    return result;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
