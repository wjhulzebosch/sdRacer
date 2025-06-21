/**
 * Code Validator for CarLang
 * Provides syntax highlighting, error feedback, and AST display via manual check button
 */

class CodeValidator {
    constructor() {
        this.codeTextarea = null;
        this.parserDisplay = null;
        this.checkButton = null;
        this.parser = null; // Will be initialized with proper config
        
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
        
        // Set up real-time validation with debouncing
        this.setupRealTimeValidation();
        
        // Initial display
        this.parserDisplay.innerHTML = '<span class="unparsed">Click "Check Code" to analyze your CarLang code</span>';
    }
    
    setupRealTimeValidation() {
        let debounceTimer;
        const debounceDelay = 1000; // 1 second delay
        
        this.codeTextarea.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                this.performRealTimeValidation();
            }, debounceDelay);
        });
        
        // Also validate on focus to show current status
        this.codeTextarea.addEventListener('focus', () => {
            this.performRealTimeValidation();
        });
    }
    
    performRealTimeValidation() {
        const code = this.codeTextarea.value;
        
        if (!code.trim()) {
            this.showRealTimeStatus('No code to validate', 'info');
            if (typeof updateValidationStatus === 'function') {
                updateValidationStatus('Ready', 'info');
            }
            return;
        }
        
        try {
            const parser = this.getParser();
            const ast = parser.parse(code);
            
            if (ast.errors && ast.errors.length > 0) {
                const errorCount = ast.errors.length;
                const warningCount = ast.warnings ? ast.warnings.length : 0;
                this.showRealTimeStatus(`${errorCount} error(s), ${warningCount} warning(s)`, 'error');
                if (typeof updateValidationStatus === 'function') {
                    updateValidationStatus(`${errorCount} error(s)`, 'error');
                }
            } else if (ast.warnings && ast.warnings.length > 0) {
                const warningCount = ast.warnings.length;
                this.showRealTimeStatus(`${warningCount} warning(s) - code is valid`, 'warning');
                if (typeof updateValidationStatus === 'function') {
                    updateValidationStatus(`${warningCount} warning(s)`, 'warning');
                }
            } else {
                this.showRealTimeStatus('Code is valid!', 'success');
                if (typeof updateValidationStatus === 'function') {
                    updateValidationStatus('Valid', 'success');
                }
            }
        } catch (error) {
            this.showRealTimeStatus('Parse error occurred', 'error');
            if (typeof updateValidationStatus === 'function') {
                updateValidationStatus('Parse Error', 'error');
            }
        }
    }
    
    showRealTimeStatus(message, type) {
        // Create or update status indicator
        let statusIndicator = document.getElementById('real-time-status');
        if (!statusIndicator) {
            statusIndicator = document.createElement('div');
            statusIndicator.id = 'real-time-status';
            statusIndicator.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 8px 16px;
                border-radius: 6px;
                font-size: 0.9rem;
                font-weight: 500;
                z-index: 1000;
                transition: all 0.3s ease;
                opacity: 0;
                transform: translateY(-10px);
            `;
            document.body.appendChild(statusIndicator);
        }
        
        // Set content and styling based on type
        statusIndicator.textContent = message;
        statusIndicator.className = `validation-${type}`;
        
        // Show the indicator
        setTimeout(() => {
            statusIndicator.style.opacity = '1';
            statusIndicator.style.transform = 'translateY(0)';
        }, 10);
        
        // Hide after 3 seconds
        setTimeout(() => {
            statusIndicator.style.opacity = '0';
            statusIndicator.style.transform = 'translateY(-10px)';
        }, 3000);
    }
    
    // Get parser with current configuration
    getParser() {
        if (typeof getParserConfig === 'function') {
            const config = getParserConfig();
            return new CarLangParser(config.mode, config.availableCars);
        } else {
            // Fallback for when game.js is not loaded
            return new CarLangParser('single', []);
        }
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
            // Get parser with current configuration
            const parser = this.getParser();
            
            // Parse the entire code once with the configured parser instance
            const ast = parser.parse(code);
            const lines = code.split('\n');
            let displayHTML = '';
            
            // Check if there are any parsing errors
            const hasParseErrors = ast.errors && ast.errors.length > 0;
            const hasWarnings = ast.warnings && ast.warnings.length > 0;
            
            // Try to get the actual car registry from the game if available
            let carRegistry = null;
            if (typeof getCarRegistry === 'function') {
                carRegistry = getCarRegistry();
            }
            
            // Create engine with actual car registry if available
            const engine = new CarLangEngine(carRegistry, null, null);
            const validation = engine.validate(ast);
            const hasValidationErrors = validation.errors && validation.errors.length > 0;
            
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
                    displayHTML += `<div class="validation-error" style="margin-bottom: 10px; font-weight: bold;">Parse Errors:</div>`;
                    for (let i = 0; i < ast.errors.length; i++) {
                        const error = ast.errors[i];
                        displayHTML += `<div class="validation-error">• ${this.escapeHtml(error)}</div>`;
                    }
                }
                
                if (hasValidationErrors) {
                    displayHTML += `<div class="validation-error" style="margin-bottom: 10px; font-weight: bold;">Validation Errors:</div>`;
                    for (let i = 0; i < validation.errors.length; i++) {
                        const error = validation.errors[i];
                        displayHTML += `<div class="validation-error">• ${this.escapeHtml(error)}</div>`;
                    }
                }
                
                if (hasWarnings) {
                    displayHTML += `<div class="validation-warning" style="margin-bottom: 10px; font-weight: bold;">Warnings:</div>`;
                    for (let i = 0; i < ast.warnings.length; i++) {
                        const warning = ast.warnings[i];
                        displayHTML += `<div class="validation-warning">• ${this.escapeHtml(warning)}</div>`;
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
            
            // Add mode-specific help section
            displayHTML += this.getModeSpecificHelp();
            
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
            
            // Add mode-specific help even on error
            displayHTML += this.getModeSpecificHelp();
            
            this.parserDisplay.innerHTML = displayHTML;
        }
    }
    
    getModeSpecificHelp() {
        const config = this.getParserConfig();
        let helpHTML = `<div style="color: #9ca3af; margin: 20px 0; border-top: 1px solid #444; padding-top: 10px; font-weight: bold;">Mode Information:</div>`;
        
        if (config.mode === 'oop') {
            helpHTML += `<div class="mode-info">`;
            helpHTML += `<div class="mode-info-title">OOP Mode (Multi-car)</div>`;
            helpHTML += `<div class="mode-info-content">Available cars: <span class="mode-info-example">${config.availableCars.join(', ')}</span></div>`;
            helpHTML += `<div class="mode-info-content">Use: <span class="mode-info-example">carName.methodName()</span></div>`;
            helpHTML += `<div class="mode-info-content">Example: <span class="mode-info-example">redCar.moveForward()</span>, <span class="mode-info-example">blueCar.turnRight()</span></div>`;
            helpHTML += `</div>`;
        } else {
            helpHTML += `<div class="mode-info">`;
            helpHTML += `<div class="mode-info-title">Single-car Mode</div>`;
            helpHTML += `<div class="mode-info-content">Use: <span class="mode-info-example">methodName()</span></div>`;
            helpHTML += `<div class="mode-info-content">Example: <span class="mode-info-example">moveForward()</span>, <span class="mode-info-example">turnRight()</span></div>`;
            helpHTML += `</div>`;
        }
        
        helpHTML += `<div class="syntax-help">`;
        helpHTML += `<div class="syntax-help-title">Available Methods:</div>`;
        helpHTML += `<div class="syntax-help-methods">moveForward(), moveBackward(), turnLeft(), turnRight()</div>`;
        helpHTML += `<div class="syntax-help-methods">honk(), isRoadAhead(), isCowAhead(), isAtFinish()</div>`;
        helpHTML += `</div>`;
        
        return helpHTML;
    }
    
    getParserConfig() {
        if (typeof getParserConfig === 'function') {
            return getParserConfig();
        } else {
            // Fallback for when game.js is not loaded
            return { mode: 'single', availableCars: [] };
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
            const parser = this.getParser();
            const ast = parser.parse(code);
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