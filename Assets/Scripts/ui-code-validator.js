import { masterValidateCode, ONLY_USE_THIS_TO_VALIDATE } from './code-validator.js';

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
    console.log('validateCodeForUI');
    const parserDisplay = document.getElementById('parser-display');
    if (!parserDisplay) {
        debug('Required elements not found', null, 'error');
        return;
    }
    // Use ONLY_USE_THIS_TO_VALIDATE for validation
    const result = ONLY_USE_THIS_TO_VALIDATE();
    let displayHTML = '';
    // Show parser config at the top (for debug)
    displayHTML += `<div style="color: #60a5fa; margin-bottom: 10px; font-size: 0.95em;">` +
        `<b>Parser Settings:</b> mode = <code>${result.ast && result.ast.mode ? result.ast.mode : ''}</code>, availableCars = <code>${result.ast && result.ast.availableCars ? result.ast.availableCars.join(', ') : ''}</code>` +
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

