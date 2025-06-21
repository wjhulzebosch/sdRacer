/**
 * CarLang Engine & Validator
 * Executes parsed CarLang AST by calling Car.js functions
 * Also validates AST for semantic errors
 */

class CarLangEngine {
    constructor(car, level, gameDiv) {
        this.car = car;
        this.level = level;
        this.gameDiv = gameDiv;
        this.variables = {};
        this.functions = {};
        
        // Execution state
        this.ast = null;
        this.executionStack = []; // Stack of execution contexts
        this.currentContext = null;
        this.isExecuting = false;
        
        // Commands that should have a visual delay (car movement/rotation)
        this.delayedCommands = [
            'moveForward',
            'moveBackward',
            'turnRight',
            'turnLeft',
            'honk'
            // Add more visual commands here as needed
        ];
        
        // Map CarLang function names to Car.js methods
        this.functionMap = {
            'moveForward': () => this.car.moveForward(this.level, this.gameDiv),
            'moveBackward': () => this.car.moveBackward(this.level, this.gameDiv),
            'turnRight': () => this.car.turnRight(this.gameDiv),
            'turnLeft': () => this.car.turnLeft(this.gameDiv),
            'explode': () => this.car.crash(this.gameDiv),
            'isRoadAhead': () => this.car.isRoadAhead(this.level),
            'isCowAhead': () => this.car.isCowAhead(),
            'honk': () => this.honk()
        };
        
        // Function validation rules
        this.functionValidation = {
            'moveForward': { args: 0, description: 'Move car forward one tile' },
            'moveBackward': { args: 0, description: 'Move car backward one tile' },
            'turnRight': { args: 0, description: 'Turn car right by 90 degrees' },
            'turnLeft': { args: 0, description: 'Turn car left by 90 degrees' },
            'explode': { args: 0, description: 'Make car crash' },
            'isRoadAhead': { args: 0, description: 'Check if there is a road ahead (ignores cows)' },
            'isCowAhead': { args: 0, description: 'Check if there is a cow ahead (ignores roads)' },
            'honk': { args: 0, description: 'Honk the car horn' }
        };
    }

    /**
     * Initialize execution with an AST
     * @param {Object} ast - The parsed AST from CarLangParser
     */
    initializeExecution(ast) {
        this.ast = ast;
        this.executionStack = [];
        this.variables = {};
        this.functions = {};
        this.isExecuting = true;
        
        // Filter out lines that have no statements (only comments)
        const statementsWithContent = ast.body.filter(line => line.statement !== null);
        
        // Separate function declarations from other statements
        const functionDeclarations = [];
        const otherStatements = [];
        
        for (const line of statementsWithContent) {
            if (line.statement && line.statement.type === 'FunctionDeclaration') {
                functionDeclarations.push(line);
            } else {
                otherStatements.push(line);
            }
        }
        
        // Reorder: function declarations first, then other statements
        const reorderedStatements = [...functionDeclarations, ...otherStatements];
        
        // Create initial execution context for the main body
        this.currentContext = {
            type: 'main',
            statements: reorderedStatements,
            currentIndex: 0,
            parent: null
        };
    }

    /**
     * Execute the next command in the AST
     * @returns {Object} - Execution status with details
     */
    executeNext() {
        if (!this.isExecuting || !this.currentContext) {
            return { status: 'COMPLETE' };
        }

        try {
            // Get current statement
            let currentStatement = this.currentContext.statements[this.currentContext.currentIndex];
            
            // Check if we're in a while context and have finished the loop body
            if (this.currentContext.type === 'while' && this.currentContext.currentIndex >= this.currentContext.statements.length) {
                const condition = this.evaluateExpression(this.currentContext.loopStatement.condition);
                if (condition) {
                    // Continue loop, reset to beginning of loop body
                    this.currentContext.currentIndex = 0;
                    // Continue with the first statement in the reset loop
                    const firstStatement = this.currentContext.statements[0];
                    // Update currentStatement to the first statement in the reset loop
                    currentStatement = firstStatement;
                    // Don't return, continue with execution
                } else {
                    // Loop finished, pop back to parent
                    return this.popExecutionContext();
                }
            }
            
            // Check if we're in a for context and have finished the loop body
            if (this.currentContext.type === 'for' && this.currentContext.currentIndex >= this.currentContext.statements.length) {
                // Loop body finished, execute increment and check condition
                this.executeAssignment(this.currentContext.loopStatement.increment);
                const condition = this.evaluateExpression(this.currentContext.loopStatement.condition);
                if (condition) {
                    // Continue loop, reset to beginning of loop body
                    this.currentContext.currentIndex = 0;
                    // Continue with the first statement in the reset loop
                    const firstStatement = this.currentContext.statements[0];
                    // Update currentStatement to the first statement in the reset loop
                    currentStatement = firstStatement;
                    // Don't return, continue with execution
                } else {
                    // Loop finished, pop back to parent
                    return this.popExecutionContext();
                }
            }
            
            // Check if we're in a function context and have finished the function body
            if (this.currentContext.type === 'function' && this.currentContext.currentIndex >= this.currentContext.statements.length) {
                // Function finished, pop back to parent context
                return this.popExecutionContext();
            }
            
            if (!currentStatement) {
                // No more statements in current context, pop stack
                return this.popExecutionContext();
            }

            // Capture old context values BEFORE executing the statement
            const oldContextType = this.currentContext.type;
            const oldContextIndex = this.currentContext.currentIndex;

            // Execute the current statement
            const result = currentStatement.statement ? this.executeStatement(currentStatement.statement) : null;
            
            // Move to next statement only if we didn't create a new context
            // Check if this was a delayed command
            if (currentStatement.statement && this.shouldDelay(currentStatement.statement)) {
                // Only increment if we're still in the same context
                if (this.currentContext.type === oldContextType && this.currentContext.currentIndex === oldContextIndex) {
                    this.currentContext.currentIndex++;
                }
                return { 
                    status: 'PAUSED', 
                    currentLine: currentStatement.statement ? currentStatement.statement.line : null,
                    blockStartLine: this.currentContext.blockStartLine,
                    contextType: this.currentContext.type,
                    commandType: currentStatement.statement ? currentStatement.statement.type : null,
                    functionName: currentStatement.statement && currentStatement.statement.type === 'FunctionCall' ? currentStatement.statement.name : null,
                    result: result 
                };
            }
            
            // Only increment if we're still in the same context
            if (this.currentContext.type === oldContextType && this.currentContext.currentIndex === oldContextIndex) {
                this.currentContext.currentIndex++;
            }
            return { 
                status: 'CONTINUE', 
                currentLine: currentStatement.statement ? currentStatement.statement.line : null,
                blockStartLine: this.currentContext.blockStartLine,
                contextType: this.currentContext.type,
                commandType: currentStatement.statement ? currentStatement.statement.type : null,
                functionName: currentStatement.statement && currentStatement.statement.type === 'FunctionCall' ? currentStatement.statement.name : null,
                result: result 
            };
            
        } catch (error) {
            this.isExecuting = false;
            return { 
                status: 'ERROR', 
                error: error.message 
            };
        }
    }

    /**
     * Pop execution context and return to parent
     */
    popExecutionContext() {
        if (this.currentContext.parent) {
            // Advance the parent's currentIndex so we don't re-execute the same statement
            this.currentContext.parent.currentIndex++;
            this.currentContext = this.currentContext.parent;
            return { status: 'CONTINUE' };
        } else {
            // No more contexts, execution complete
            this.isExecuting = false;
            return { status: 'COMPLETE' };
        }
    }

    /**
     * Reset execution state
     */
    reset() {
        this.ast = null;
        this.executionStack = [];
        this.currentContext = null;
        this.isExecuting = false;
        this.variables = {};
        this.functions = {};
    }

    /**
     * Validate parsed CarLang code without executing
     * @param {Object} ast - The parsed AST from CarLangParser
     * @returns {Object} - Validation result with errors and warnings
     */
    validate(ast) {
        const errors = [];
        const warnings = [];
        
        if (!ast || !ast.body) {
            errors.push('Invalid AST structure');
            return { errors, warnings, valid: false };
        }
        
        // Track function definitions for user functions
        const functionDefinitions = new Set();
        
        // First pass: collect function definitions
        this.collectFunctionDefinitions(ast.body, functionDefinitions);
        
        // Get all valid functions (built-in + user-defined)
        const allValidFunctions = [
            ...Object.keys(this.functionMap),
            ...Array.from(functionDefinitions)
        ];
        
        // Second pass: validate all statements
        this.validateStatements(ast.body, errors, warnings, allValidFunctions);
        
        return {
            errors,
            warnings,
            valid: errors.length === 0
        };
    }

    /**
     * Execute parsed CarLang code
     * @param {Object} ast - The parsed AST from CarLangParser
     * @returns {Promise} - Promise that resolves when execution is complete
     */
    async execute(ast) {
        if (ast.errors && ast.errors.length > 0) {
            throw new Error(`Parse errors: ${ast.errors.join(', ')}`);
        }

        for (const line of ast.body) {
            if (line.statement) {
                await this.executeStatement(line.statement);
                // Only delay if the statement was a delayed command
                if (this.shouldDelay(line.statement)) {
                    await this.sleep(this.stepDelay);
                }
            }
        }
    }

    /**
     * Execute a single statement
     * @param {Object} statement - The statement AST node
     */
    executeStatement(statement) {
        switch (statement.type) {
            case 'VariableDeclaration':
                return this.executeVariableDeclaration(statement);
            case 'Assignment':
                return this.executeAssignment(statement);
            case 'FunctionDeclaration':
                return this.executeFunctionDeclaration(statement);
            case 'FunctionCall':
                return this.executeFunctionCall(statement);
            case 'IfStatement':
                return this.executeIfStatement(statement);
            case 'WhileStatement':
                return this.executeWhileStatement(statement);
            case 'ForStatement':
                return this.executeForStatement(statement);
            case 'ReturnStatement':
                return this.executeReturnStatement(statement);
            case 'BreakStatement':
                return this.executeBreakStatement(statement);
            case 'ContinueStatement':
                return this.executeContinueStatement(statement);
            default:
                console.warn(`Unknown statement type: ${statement.type}`);
        }
    }

    /**
     * Execute variable declaration
     */
    executeVariableDeclaration(statement) {
        const value = this.evaluateExpression(statement.value);
        
        // Store variable in current context (function scope or global scope)
        if (this.currentContext && this.currentContext.type === 'function') {
            this.currentContext[statement.name] = {
                type: statement.varType,
                value: value
            };
        } else {
            this.variables[statement.name] = {
                type: statement.varType,
                value: value
            };
        }
    }

    /**
     * Execute assignment
     */
    executeAssignment(statement) {
        const value = this.evaluateExpression(statement.value);
        
        // Store variable in current context (function scope or global scope)
        if (this.currentContext && this.currentContext.type === 'function') {
            this.currentContext[statement.name] = {
                type: 'auto',
                value: value
            };
        } else {
            this.variables[statement.name] = {
                type: 'auto',
                value: value
            };
        }
    }

    /**
     * Execute function declaration (store function definition)
     */
    executeFunctionDeclaration(statement) {
        // Store the function definition for later execution
        this.functions[statement.name] = {
            returnType: statement.returnType,
            parameters: statement.parameters,
            body: statement.body,
            line: statement.line
        };
    }

    /**
     * Execute function call
     */
    executeFunctionCall(statement) {
        const args = statement.arguments.map(arg => this.evaluateExpression(arg));
        
        // Check if it's a built-in function
        if (this.functionMap[statement.name]) {
            return this.functionMap[statement.name](...args);
        }
        
        // Check if it's a user-defined function
        if (this.functions[statement.name]) {
            return this.executeUserDefinedFunction(statement.name, args);
        }
        
        console.warn(`Unknown function: ${statement.name}`);
        return null;
    }

    /**
     * Execute a user-defined function
     */
    executeUserDefinedFunction(functionName, args) {
        const functionDef = this.functions[functionName];
        
        // Validate argument count
        if (args.length !== functionDef.parameters.length) {
            throw new Error(`Function '${functionName}' expects ${functionDef.parameters.length} argument(s), got ${args.length}`);
        }
        
        // Create new execution context for function
        const functionContext = {
            type: 'function',
            functionName: functionName,
            statements: functionDef.body.statements,
            currentIndex: 0,
            parent: this.currentContext,
            blockStartLine: functionDef.line,
            returnValue: null,
            hasReturned: false
        };
        
        // Set up parameter variables in the function scope
        for (let i = 0; i < functionDef.parameters.length; i++) {
            const param = functionDef.parameters[i];
            functionContext[param.name] = {
                type: param.type,
                value: args[i]
            };
        }
        
        // Switch to function context
        this.currentContext = functionContext;
        
        return null; // Function execution will continue in executeNext()
    }

    /**
     * Honk the car horn
     */
    honk() {
        console.log('HONK: Starting honk method');
        
        // Play honk sound immediately
        if (typeof soundController !== 'undefined') {
            soundController.playCarHorn();
        }
        
        // Get car's current position
        const carX = this.car.currentPosition.x;
        const carY = this.car.currentPosition.y;
        console.log('HONK: Car position:', { x: carX, y: carY });
        
        // Check for cows in orthogonally adjacent tiles
        const adjacentPositions = [
            { x: carX, y: carY - 1 }, // North
            { x: carX + 1, y: carY }, // East
            { x: carX, y: carY + 1 }, // South
            { x: carX - 1, y: carY }  // West
        ];
        console.log('HONK: Checking adjacent positions:', adjacentPositions);
        
        // Get cows from the global cows array (defined in game.js)
        const globalCows = window.cows || [];
        console.log('HONK: Found cows:', globalCows.length, globalCows);
        
        // Check each adjacent position for cows
        adjacentPositions.forEach((pos, index) => {
            console.log(`HONK: Checking position ${index}:`, pos);
            globalCows.forEach((cow, cowIndex) => {
                console.log(`HONK: Checking cow ${cowIndex}:`, cow);
                console.log(`HONK: Cow position:`, { x: cow.currentX, y: cow.currentY });
                console.log(`HONK: Is cow at position?`, cow.isAtPosition(pos.x, pos.y));
                if (cow.isAtPosition(pos.x, pos.y)) {
                    console.log(`HONK: Found cow at position ${index}, calling GetHonked()`);
                    cow.GetHonked();
                }
            });
        });
        
        console.log('HONK: Honk method completed');
    }

    /**
     * Execute if statement
     */
    executeIfStatement(statement) {
        const condition = this.evaluateExpression(statement.condition);
        
        if (condition) {
            // Create new execution context for then block
            this.currentContext = {
                type: 'if-then',
                statements: statement.thenBody.statements,
                currentIndex: 0,
                parent: this.currentContext,
                blockStartLine: statement.line
            };
        } else {
            // Check else-if conditions
            for (const elseIf of statement.elseIfs) {
                const elseIfCondition = this.evaluateExpression(elseIf.condition);
                if (elseIfCondition) {
                    // Create new execution context for else-if block
                    this.currentContext = {
                        type: 'if-elseif',
                        statements: elseIf.body.statements,
                        currentIndex: 0,
                        parent: this.currentContext,
                        blockStartLine: statement.line
                    };
                    return;
                }
            }
            
            // Execute else block if it exists
            if (statement.elseBody) {
                this.currentContext = {
                    type: 'if-else',
                    statements: statement.elseBody.statements,
                    currentIndex: 0,
                    parent: this.currentContext,
                    blockStartLine: statement.line
                };
            }
        }
    }

    /**
     * Execute while statement
     */
    executeWhileStatement(statement) {
        // Check if we're already in this loop
        if (this.currentContext.type === 'while' && this.currentContext.loopStatement === statement) {
            // We're continuing the loop, check if we've finished the loop body
            if (this.currentContext.currentIndex >= this.currentContext.statements.length) {
                // Loop body finished, check condition again
                const condition = this.evaluateExpression(statement.condition);
                if (condition) {
                    // Continue loop, reset to beginning of loop body
                    this.currentContext.currentIndex = 0;
                } else {
                    // Loop finished, pop back to parent and continue from next statement
                    this.currentContext = this.currentContext.parent;
                    // Don't re-execute the while statement, just continue
                    return;
                }
            }
            // If we haven't finished the loop body yet, just continue normally
        } else {
            // Starting new loop
            const condition = this.evaluateExpression(statement.condition);
            if (condition) {
                // Create new execution context for loop body
                this.currentContext = {
                    type: 'while',
                    statements: statement.body.statements,
                    currentIndex: 0,
                    parent: this.currentContext,
                    loopStatement: statement,
                    iterations: 0,
                    blockStartLine: statement.line
                };
            }
        }
    }

    /**
     * Execute for statement
     */
    executeForStatement(statement) {
        // Check if we're already in this loop
        if (this.currentContext.type === 'for' && this.currentContext.loopStatement === statement) {
            // We're continuing the loop, check if we've finished the loop body
            if (this.currentContext.currentIndex >= this.currentContext.statements.length) {
                // Loop body finished, execute increment and check condition
                this.executeAssignment(statement.increment);
                const condition = this.evaluateExpression(statement.condition);
                if (condition) {
                    // Continue loop, reset to beginning of loop body
                    this.currentContext.currentIndex = 0;
                } else {
                    // Loop finished, pop back to parent
                    this.currentContext = this.currentContext.parent;
                }
            }
            // If we haven't finished the loop body yet, just continue normally
        } else {
            // Starting new loop
            this.executeVariableDeclaration(statement.initialization);
            const condition = this.evaluateExpression(statement.condition);
            if (condition) {
                // Create new execution context for loop body
                this.currentContext = {
                    type: 'for',
                    statements: statement.body.statements,
                    currentIndex: 0,
                    parent: this.currentContext,
                    loopStatement: statement,
                    iterations: 0,
                    blockStartLine: statement.line
                };
            }
            // If condition is false, don't create context (loop body won't execute)
        }
    }

    /**
     * Execute block of statements
     */
    async executeBlock(block) {
        for (const line of block.statements) {
            if (line.statement) {
                await this.executeStatement(line.statement);
                // Only delay if the statement was a delayed command
                if (this.shouldDelay(line.statement)) {
                    await this.sleep(this.stepDelay);
                }
            }
        }
    }

    /**
     * Evaluate expression
     */
    evaluateExpression(expression) {
        switch (expression.type) {
            case 'Literal':
                return expression.value;
            case 'Identifier':
                // Look for variable in function scope first, then global scope
                if (this.currentContext && this.currentContext.type === 'function' && 
                    this.currentContext[expression.name]) {
                    return this.currentContext[expression.name].value;
                }
                return this.variables[expression.name]?.value;
            case 'BinaryExpression':
                const left = this.evaluateExpression(expression.left);
                const right = this.evaluateExpression(expression.right);
                return this.evaluateBinaryExpression(left, expression.operator, right);
            case 'FunctionCall':
                return this.executeFunctionCall(expression);
            default:
                console.warn(`Unknown expression type: ${expression.type}`);
                return null;
        }
    }

    /**
     * Evaluate binary expression
     */
    evaluateBinaryExpression(left, operator, right) {
        switch (operator) {
            case '+': return left + right;
            case '-': return left - right;
            case '*': return left * right;
            case '/': return left / right;
            case '%': return left % right;
            case '==': return left == right;
            case '!=': return left != right;
            case '<': return left < right;
            case '<=': return left <= right;
            case '>': return left > right;
            case '>=': return left >= right;
            case '&&': return left && right;
            case '||': return left || right;
            default:
                console.warn(`Unknown operator: ${operator}`);
                return null;
        }
    }

    /**
     * Execute return statement
     */
    executeReturnStatement(statement) {
        let returnValue = undefined;
        if (statement.value) {
            returnValue = this.evaluateExpression(statement.value);
        }
        
        // If we're in a function context, set the return value and mark as returned
        if (this.currentContext && this.currentContext.type === 'function') {
            this.currentContext.returnValue = returnValue;
            this.currentContext.hasReturned = true;
            // Pop back to parent context
            this.currentContext = this.currentContext.parent;
        }
        
        return returnValue;
    }

    /**
     * Execute break statement
     */
    executeBreakStatement(statement) {
        // This would need to be handled by the calling loop
        throw new Error('BREAK');
    }

    /**
     * Execute continue statement
     */
    executeContinueStatement(statement) {
        // This would need to be handled by the calling loop
        throw new Error('CONTINUE');
    }

    /**
     * Sleep utility
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get current variables state
     */
    getVariables() {
        return { ...this.variables };
    }

    /**
     * Set step delay
     */
    setStepDelay(delay) {
        this.stepDelay = delay;
    }

    /**
     * Collect all function definitions from the AST
     */
    collectFunctionDefinitions(statements, functionDefinitions) {
        for (const line of statements) {
            if (line.statement) {
                this.collectFunctionDefinitionsFromStatement(line.statement, functionDefinitions);
            }
        }
    }
    
    /**
     * Recursively collect function definitions from a statement
     */
    collectFunctionDefinitionsFromStatement(statement, functionDefinitions) {
        if (!statement) return;
        
        switch (statement.type) {
            case 'FunctionDeclaration':
                functionDefinitions.add(statement.name);
                break;
            case 'IfStatement':
                this.collectFunctionDefinitionsFromStatement(statement.thenBody, functionDefinitions);
                if (statement.elseBody) {
                    this.collectFunctionDefinitionsFromStatement(statement.elseBody, functionDefinitions);
                }
                for (const elseIf of statement.elseIfs) {
                    this.collectFunctionDefinitionsFromStatement(elseIf.body, functionDefinitions);
                }
                break;
            case 'WhileStatement':
                this.collectFunctionDefinitionsFromStatement(statement.body, functionDefinitions);
                break;
            case 'ForStatement':
                this.collectFunctionDefinitionsFromStatement(statement.body, functionDefinitions);
                break;
            case 'Block':
                this.collectFunctionDefinitions(statement.statements, functionDefinitions);
                break;
        }
    }
    
    /**
     * Validate all statements in the AST
     */
    validateStatements(statements, errors, warnings, allValidFunctions) {
        for (const line of statements) {
            if (line.statement) {
                this.validateStatement(line.statement, errors, warnings, line, allValidFunctions);
            }
        }
    }
    
    /**
     * Validate a single statement
     */
    validateStatement(statement, errors, warnings, line, allValidFunctions) {
        if (!statement) return;
        
        switch (statement.type) {
            case 'FunctionCall':
                this.validateFunctionCall(statement, errors, line, allValidFunctions);
                break;
            case 'FunctionDeclaration':
                this.validateFunctionDeclaration(statement, errors, warnings, allValidFunctions);
                break;
            case 'IfStatement':
                this.validateIfStatement(statement, errors, warnings, allValidFunctions);
                break;
            case 'WhileStatement':
                this.validateWhileStatement(statement, errors, warnings, allValidFunctions);
                break;
            case 'ForStatement':
                this.validateForStatement(statement, errors, warnings, allValidFunctions);
                break;
            case 'VariableDeclaration':
                this.validateVariableDeclaration(statement, errors, warnings);
                break;
            case 'Assignment':
                this.validateAssignment(statement, errors, warnings);
                break;
            case 'Block':
                this.validateStatements(statement.statements, errors, warnings, allValidFunctions);
                break;
            case 'Error':
                // Already an error node, no need to validate further
                break;
        }
    }
    
    /**
     * Validate a function call
     */
    validateFunctionCall(functionCall, errors, line, allValidFunctions) {
        const functionName = functionCall.name;
        
        // Check if it's a built-in function or user-defined function
        const isBuiltIn = Object.keys(this.functionMap).includes(functionName);
        const isUserDefined = allValidFunctions.includes(functionName);
        
        if (!isBuiltIn && !isUserDefined) {
            const lineNumber = this.getLineNumber(line);
            errors.push(`Line ${lineNumber}: Undefined function '${functionName}'`);
        }
        
        // Validate arguments based on function validation rules (only for built-in functions)
        if (isBuiltIn) {
            this.validateFunctionArguments(functionCall, errors, line);
        }
    }
    
    /**
     * Validate function arguments
     */
    validateFunctionArguments(functionCall, errors, line) {
        const functionName = functionCall.name;
        const args = functionCall.arguments;
        const validation = this.functionValidation[functionName];
        
        if (validation) {
            if (args.length !== validation.args) {
                const lineNumber = this.getLineNumber(line);
                errors.push(`Line ${lineNumber}: '${functionName}' expects ${validation.args} argument(s), got ${args.length}`);
            }
        }
    }
    
    /**
     * Validate function declaration
     */
    validateFunctionDeclaration(declaration, errors, warnings, allValidFunctions) {
        // Check for duplicate function names
        if (Object.keys(this.functionMap).includes(declaration.name)) {
            warnings.push(`Function '${declaration.name}' shadows a built-in function`);
        }
        
        // Validate function body
        if (declaration.body) {
            this.validateStatement(declaration.body, errors, warnings, null, allValidFunctions);
        }
    }
    
    /**
     * Validate if statement
     */
    validateIfStatement(statement, errors, warnings, allValidFunctions) {
        // Validate condition
        if (statement.condition) {
            this.validateExpression(statement.condition, errors, warnings, allValidFunctions);
        }
        
        // Validate then and else bodies
        if (statement.thenBody) {
            this.validateStatement(statement.thenBody, errors, warnings, null, allValidFunctions);
        }
        
        if (statement.elseBody) {
            this.validateStatement(statement.elseBody, errors, warnings, null, allValidFunctions);
        }
        
        // Validate else-if bodies
        for (const elseIf of statement.elseIfs) {
            this.validateExpression(elseIf.condition, errors, warnings, allValidFunctions);
            this.validateStatement(elseIf.body, errors, warnings, null, allValidFunctions);
        }
    }
    
    /**
     * Validate while statement
     */
    validateWhileStatement(statement, errors, warnings, allValidFunctions) {
        if (statement.condition) {
            this.validateExpression(statement.condition, errors, warnings, allValidFunctions);
        }
        
        if (statement.body) {
            this.validateStatement(statement.body, errors, warnings, null, allValidFunctions);
        }
    }
    
    /**
     * Validate for statement
     */
    validateForStatement(statement, errors, warnings, allValidFunctions) {
        if (statement.initialization) {
            this.validateStatement(statement.initialization, errors, warnings, null, allValidFunctions);
        }
        
        if (statement.condition) {
            this.validateExpression(statement.condition, errors, warnings, allValidFunctions);
        }
        
        if (statement.increment) {
            this.validateStatement(statement.increment, errors, warnings, null, allValidFunctions);
        }
        
        if (statement.body) {
            this.validateStatement(statement.body, errors, warnings, null, allValidFunctions);
        }
    }
    
    /**
     * Validate variable declaration
     */
    validateVariableDeclaration(declaration, errors, warnings) {
        // Check for duplicate variable names in scope
        // (This would require scope tracking for full implementation)
    }
    
    /**
     * Validate assignment
     */
    validateAssignment(assignment, errors, warnings) {
        // Check if variable is declared before use
        // (This would require scope tracking for full implementation)
    }
    
    /**
     * Validate expression
     */
    validateExpression(expression, errors, warnings, allValidFunctions) {
        if (!expression) return;
        
        switch (expression.type) {
            case 'BinaryExpression':
                this.validateExpression(expression.left, errors, warnings, allValidFunctions);
                this.validateExpression(expression.right, errors, warnings, allValidFunctions);
                break;
            case 'FunctionCall':
                this.validateFunctionCall(expression, errors, null, allValidFunctions);
                break;
            case 'Identifier':
                // Check if variable is declared
                // (This would require scope tracking for full implementation)
                break;
            case 'Literal':
                // Literals are always valid
                break;
        }
    }
    
    /**
     * Get line number from line object
     */
    getLineNumber(line) {
        // Try to get line number from various sources
        if (line.statement && line.statement.line) {
            return line.statement.line;
        }
        if (line.line) {
            return line.line;
        }
        return 'unknown';
    }

    /**
     * Check if a statement should have a delay
     */
    shouldDelay(statement) {
        if (statement.type === 'FunctionCall') {
            return this.delayedCommands.includes(statement.name);
        }
        return false;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CarLangEngine;
} 