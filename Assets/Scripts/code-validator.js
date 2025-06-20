/**
 * Code Validator for CarLang
 * Provides syntax highlighting, error feedback, and AST display via manual check button
 */

class CodeValidator {
    constructor() {
        this.codeTextarea = null;
        this.parserDisplay = null;
        this.checkButton = null;
        this.parser = new CarLangParser();
        
        this.init();
    }
    
    init() {
        this.codeTextarea = document.getElementById('code');
        this.parserDisplay = document.getElementById('parser-display');
        this.checkButton = document.getElementById('checkCodeBtn');
        
        if (!this.codeTextarea || !this.parserDisplay || !this.checkButton) {
            console.error('Live parser: Required elements not found');
            return;
        }
        
        // Set up event listener for check button
        this.checkButton.addEventListener('click', () => this.checkCode());
        
        // Initial display
        this.parserDisplay.innerHTML = '<span class="unparsed">Click "Check Code" to analyze your CarLang code</span>';
    }
    
    checkCode() {
        const code = this.codeTextarea.value;
        
        if (!code.trim()) {
            this.parserDisplay.innerHTML = '<span class="unparsed">No code to check</span>';
            return;
        }
        
        this.updateDisplay(code);
    }
    
    updateDisplay(code) {
        try {
            // Parse the entire code once with the single parser instance
            const ast = this.parser.parse(code);
            const lines = code.split('\n');
            let displayHTML = '';
            
            // Check if there are any parsing errors
            const hasParseErrors = ast.errors && ast.errors.length > 0;
            
            // Create engine for validation (without car/level for now)
            const engine = new CarLangEngine(null, null, null);
            const validation = engine.validate(ast);
            const hasValidationErrors = validation.errors && validation.errors.length > 0;
            const hasWarnings = validation.warnings && validation.warnings.length > 0;
            
            // Display code with appropriate coloring
            if (!hasParseErrors && !hasValidationErrors) {
                // All good - show in green
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    if (!line.trim()) {
                        displayHTML += `<span class="unparsed">${this.escapeHtml(line)}</span>\n`;
                    } else {
                        displayHTML += `<span class="parsed">${this.escapeHtml(line)}</span>\n`;
                    }
                }
            } else {
                // There are errors - show error details
                if (hasParseErrors) {
                    displayHTML += `<div style="color: #f87171; margin-bottom: 10px; font-weight: bold;">Parse Errors:</div>`;
                    for (let i = 0; i < ast.errors.length; i++) {
                        const error = ast.errors[i];
                        displayHTML += `<div style="color: #f87171; margin-bottom: 5px;">• ${this.escapeHtml(error)}</div>`;
                    }
                }
                
                if (hasValidationErrors) {
                    displayHTML += `<div style="color: #f87171; margin-bottom: 10px; font-weight: bold;">Validation Errors:</div>`;
                    for (let i = 0; i < validation.errors.length; i++) {
                        const error = validation.errors[i];
                        displayHTML += `<div style="color: #f87171; margin-bottom: 5px;">• ${this.escapeHtml(error)}</div>`;
                    }
                }
                
                if (hasWarnings) {
                    displayHTML += `<div style="color: #fbbf24; margin-bottom: 10px; font-weight: bold;">Warnings:</div>`;
                    for (let i = 0; i < validation.warnings.length; i++) {
                        const warning = validation.warnings[i];
                        displayHTML += `<div style="color: #fbbf24; margin-bottom: 5px;">• ${this.escapeHtml(warning)}</div>`;
                    }
                }
                
                displayHTML += `<div style="color: #9ca3af; margin: 10px 0; border-top: 1px solid #444; padding-top: 10px;">Code:</div>`;
                
                // Show the code with errors highlighted
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    if (!line.trim()) {
                        displayHTML += `<span class="unparsed">${this.escapeHtml(line)}</span>\n`;
                    } else {
                        displayHTML += `<span class="error">${this.escapeHtml(line)}</span>\n`;
                    }
                }
            }
            
            // Add AST display section
            displayHTML += `<div style="color: #9ca3af; margin: 20px 0; border-top: 1px solid #444; padding-top: 10px; font-weight: bold;">Abstract Syntax Tree (AST):</div>`;
            displayHTML += `<pre style="background: #1a1e22; color: #e0e0e0; padding: 10px; border-radius: 4px; overflow-x: auto; font-size: 0.8rem; margin-top: 10px;">${this.escapeHtml(JSON.stringify(ast, null, 2))}</pre>`;
            
            this.parserDisplay.innerHTML = displayHTML;
        } catch (error) {
            // If parsing completely fails, show the error and mark all non-empty lines as errors
            const lines = code.split('\n');
            let displayHTML = '';
            
            displayHTML += `<div style="color: #f87171; margin-bottom: 10px; font-weight: bold;">Parse Error:</div>`;
            displayHTML += `<div style="color: #f87171; margin-bottom: 10px;">${this.escapeHtml(error.message)}</div>`;
            displayHTML += `<div style="color: #9ca3af; margin: 10px 0; border-top: 1px solid #444; padding-top: 10px;">Code:</div>`;
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                if (!line.trim()) {
                    displayHTML += `<span class="unparsed">${this.escapeHtml(line)}</span>\n`;
                } else {
                    displayHTML += `<span class="error">${this.escapeHtml(line)}</span>\n`;
                }
            }
            
            this.parserDisplay.innerHTML = displayHTML;
        }
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Method to get current parse status
    getParseStatus() {
        const code = this.codeTextarea.value;
        if (!code.trim()) {
            return { valid: true, errors: [] };
        }
        
        try {
            const ast = this.parser.parse(code);
            return {
                valid: !ast.errors || ast.errors.length === 0,
                errors: ast.errors || []
            };
        } catch (error) {
            return {
                valid: false,
                errors: [error.message]
            };
        }
    }
}

// Initialize live parser when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.liveParser = new CodeValidator();
}); 