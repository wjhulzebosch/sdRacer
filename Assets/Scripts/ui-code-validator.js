import { masterValidateCode } from './code-validator.js';

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Validate code from the textarea and show results in the #parser-display div.
 * Uses masterValidateCode for validation. Intended to be called when 'Check code' is pressed.
 */
export function validateCodeForUI() {
    debug('validateCodeForUI');
    const codeTextarea = document.getElementById('code');
    const parserDisplay = document.getElementById('parser-display');
    if (!codeTextarea || !parserDisplay) {
        debug('Required elements not found', null, 'error');
        return;
    }
    // Get the level instance from global context
    const level = (typeof window.level !== 'undefined') ? window.level : null;
    if (!level) {
        parserDisplay.innerHTML = '<div class="validation-error" style="margin-bottom: 10px; font-weight: bold;">ERROR: Level instance is missing. Validation aborted.</div>';
        debug('ERROR: Level instance is missing.', null, 'error');
        return;
    }
    if (typeof level.isSingleMode !== 'function') {
        parserDisplay.innerHTML = '<div class="validation-error" style="margin-bottom: 10px; font-weight: bold;">ERROR: Could not read mode/cars info from level instance. Validation aborted.</div>';
        debug('ERROR: Could not read mode/cars info from level instance.', null, 'error');
        return;
    }
    const code = codeTextarea.value;
    let parserConfig;
    if (level.isSingleMode()) {
        parserConfig = { mode: 'single', availableCars: [] };
    } else {
        // Try to get car names from level.cars
        const availableCars = Array.isArray(level.cars) ? level.cars.map(car => car.name) : [];
        parserConfig = { mode: 'oop', availableCars };
    }
    // --- DEBUG LOGS ---
    debug('level:', level);
    debug('level.cars:', level.cars);
    debug('parserConfig (from level):', parserConfig);
    const gameDiv = document.getElementById('game') || null;
    const result = masterValidateCode(code, parserConfig, level, gameDiv);
    let displayHTML = '';
    // Show parser config at the top
    displayHTML += `<div style="color: #60a5fa; margin-bottom: 10px; font-size: 0.95em;">` +
        `<b>Parser Settings:</b> mode = <code>${parserConfig.mode}</code>, availableCars = <code>${Array.isArray(parserConfig.availableCars) ? parserConfig.availableCars.join(', ') : ''}</code>` +
        `</div>`;
    if (result.parseErrors.length > 0) {
        displayHTML += `<div class="validation-error" style="margin-bottom: 10px; font-weight: bold;">Parse Errors:</div>`;
        for (const error of result.parseErrors) {
            displayHTML += `<div class="validation-error">• ${error}</div>`;
        }
    }
    if (result.validation.errors && result.validation.errors.length > 0) {
        displayHTML += `<div class="validation-error" style="margin-bottom: 10px; font-weight: bold;">Validation Errors:</div>`;
        for (const error of result.validation.errors) {
            displayHTML += `<div class="validation-error">• ${error}</div>`;
        }
    }
    if (result.validation.warnings && result.validation.warnings.length > 0) {
        displayHTML += `<div class="validation-warning" style="margin-bottom: 10px; font-weight: bold;">Warnings:</div>`;
        for (const warning of result.validation.warnings) {
            displayHTML += `<div class="validation-warning">• ${warning}</div>`;
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
    parserDisplay.innerHTML = displayHTML;
    return result;
}

document.addEventListener('DOMContentLoaded', () => {
    const checkBtn = document.getElementById('checkCodeBtn');
    if (checkBtn) {
        checkBtn.addEventListener('click', validateCodeForUI);
    }
});

