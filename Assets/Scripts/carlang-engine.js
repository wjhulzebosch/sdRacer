/**
 * CarLang Engine & Validator
 * Executes parsed CarLang AST by calling Car.js functions
 * Also validates AST for semantic errors
 */

class CarLangEngine {
    constructor(commandableObjectRegistry, world, gameDiv) {
        // If commandableObjectRegistry is missing or empty, try to get from game helpers
        let registryToUse = commandableObjectRegistry;
        if (!registryToUse || (typeof registryToUse === 'object' && Object.keys(registryToUse).length === 0)) {
            if (typeof getCommandableObjectRegistry === 'function') {
                registryToUse = getCommandableObjectRegistry();
            }
        }
        this.commandableObjectRegistry = registryToUse || {};
        this.carRegistry = {}; // Keep for backward compatibility
        this.defaultCommandableObject = null; // For backward compatibility
        this.world = world; // Store world reference
        this.gameDiv = gameDiv;
        this.variables = {};
        this.functions = {};
        this.customMethods = {}; // Store custom methods defined in Class Car

        // Set default commandable object for backward compatibility
        if (this.commandableObjectRegistry && typeof this.commandableObjectRegistry === 'object') {
            if (Array.isArray(this.commandableObjectRegistry)) {
                // If passed as array, use first commandable object
                this.defaultCommandableObject = this.commandableObjectRegistry[0] || null;
            } else {
                // If passed as object, use first commandable object or mainCar or default
                this.defaultCommandableObject = this.commandableObjectRegistry.mainCar || this.commandableObjectRegistry.default || this.commandableObjectRegistry[Object.keys(this.commandableObjectRegistry)[0]] || null;
            }
        } else {
            // Legacy support: if passed single commandable object
            this.defaultCommandableObject = this.commandableObjectRegistry;
        }
        
        if (!this.defaultCommandableObject && typeof getCommandableObjectRegistry === 'function') {
            const registry = getCommandableObjectRegistry();
            this.defaultCommandableObject = registry.mainCar || registry[Object.keys(registry)[0]] || null;
        }
        
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
        
        // Map CarLang function names to CommandableObject methods (for single-car mode)
        this.functionMap = {
            'moveForward': () => this.defaultCommandableObject.moveForward(),
            'moveBackward': () => this.defaultCommandableObject.moveBackward(),
            'turnRight': () => this.defaultCommandableObject.turnRight(),
            'turnLeft': () => this.defaultCommandableObject.turnLeft(),
            'explode': () => this.defaultCommandableObject.crash(),
            'isRoadAhead': () => this.defaultCommandableObject.isRoadAhead(),
            'isCowAhead': () => this.defaultCommandableObject.isCowAhead(),
            'honk': () => this.honk(),
            'not': (value) => !value,
            'GetDirectionToFinish': () => this.defaultCommandableObject.getDirectionToFinish(),
            'GetCurrentDirection': () => this.defaultCommandableObject.getCurrentDirection(),
            'output': (string) => this.defaultCommandableObject.output(string)
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
            'honk': { args: 0, description: 'Honk the car horn' },
            'GetDirectionToFinish': { args: 0, description: 'Get direction to finish line (North, East, South, West, or null if no path)' },
            'GetCurrentDirection': { args: 0, description: 'Get current car direction (North, East, South, West)' },
            'output': { args: 1, description: 'Output a string to the console' }
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
        this.customMethods = {};
        this.isExecuting = true;
        
        // Filter out lines that have no statements (only comments)
        const statementsWithContent = ast.body.filter(line => line.statement !== null);
        
        // Separate declarations from other statements
        const functionDeclarations = [];
        const classDeclarations = [];
        const otherStatements = [];
        
        for (const line of statementsWithContent) {
            if (line.statement && line.statement.type === 'FunctionDeclaration') {
                functionDeclarations.push(line);
            } else if (line.statement && line.statement.type === 'ClassDeclaration') {
                classDeclarations.push(line);
            } else {
                otherStatements.push(line);
            }
        }
        
        // Reorder: class declarations first, then function declarations, then other statements
        const reorderedStatements = [...classDeclarations, ...functionDeclarations, ...otherStatements];
        
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
        debug('executeNext called', null, 'log');
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
            
            // Check if we're in a method context and have finished the method body
            if (this.currentContext.type === 'method' && this.currentContext.currentIndex >= this.currentContext.statements.length) {
                // Method finished, pop back to parent context
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
            
            // Check if the command indicated completion (all cars crashed)
            if (result && result.status === 'COMPLETE') {
                debug(`[executeNext] Command returned COMPLETE status, ending execution`);
                this.isExecuting = false;
                return { status: 'COMPLETE' };
            }
            
            // Move to next statement only if we didn't create a new context
            // Check if this was a delayed command
            if (currentStatement.statement && this.shouldDelay(currentStatement.statement)) {
                // Only increment if we're still in the same context
                if (this.currentContext.type === oldContextType && this.currentContext.currentIndex === oldContextIndex) {
                    this.currentContext.currentIndex++;
                }
                
                // Get function name for tracking
                let functionName = null;
                if (currentStatement.statement.type === 'FunctionCall') {
                    functionName = currentStatement.statement.name;
                } else if (currentStatement.statement.type === 'MethodCall') {
                    functionName = currentStatement.statement.method;
                }
                
                return { 
                    status: 'PAUSED', 
                    currentLine: currentStatement.statement ? currentStatement.statement.line : null,
                    blockStartLine: this.currentContext.blockStartLine,
                    contextType: this.currentContext.type,
                    commandType: currentStatement.statement ? currentStatement.statement.type : null,
                    functionName: functionName,
                    result: result 
                };
            }
            
            // Only increment if we're still in the same context
            if (this.currentContext.type === oldContextType && this.currentContext.currentIndex === oldContextIndex) {
                this.currentContext.currentIndex++;
            }
            
            // Get function name for tracking
            let functionName = null;
            if (currentStatement.statement && currentStatement.statement.type === 'FunctionCall') {
                functionName = currentStatement.statement.name;
            } else if (currentStatement.statement && currentStatement.statement.type === 'MethodCall') {
                functionName = currentStatement.statement.method;
            }
            
            return { 
                status: 'CONTINUE', 
                currentLine: currentStatement.statement ? currentStatement.statement.line : null,
                blockStartLine: this.currentContext.blockStartLine,
                contextType: this.currentContext.type,
                commandType: currentStatement.statement ? currentStatement.statement.type : null,
                functionName: functionName,
                result: result 
            };
            
        } catch (error) {
            debug('CRITICAL ERROR in executeNext:', error, 'error');
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
        this.isExecuting = false;
        this.executionStack = [];
        this.currentContext = null;
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
        
        // First pass: collect function definitions and process class declarations
        this.collectFunctionDefinitions(ast.body, functionDefinitions);
        
        // Process class declarations to populate customMethods
        for (const line of ast.body) {
            if (line.statement && line.statement.type === 'ClassDeclaration') {
                this.executeClassDeclaration(line.statement);
            }
        }
        
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
            case 'ClassDeclaration':
                return this.executeClassDeclaration(statement);
            case 'FunctionCall':
                return this.executeFunctionCall(statement);
            case 'MethodCall':
                return this.executeMethodCall(statement);
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
     * Execute class declaration (store method definitions)
     */
    executeClassDeclaration(statement) {
        // Store all method definitions for later execution
        for (const method of statement.methods) {
            this.customMethods[method.name] = {
                returnType: method.returnType,
                parameters: method.parameters,
                body: method.body,
                line: method.line
            };
        }
    }

    /**
     * Check if all cars are crashed
     */
    areAllCarsCrashed() {
        debug(`[areAllCarsCrashed] commandableObjectRegistry keys: ${Object.keys(this.commandableObjectRegistry).join(', ')}`);
        debug(`[areAllCarsCrashed] commandableObjectRegistry values:`, Object.values(this.commandableObjectRegistry));
        
        const commandableObjects = Object.values(this.commandableObjectRegistry);
        const crashedCars = commandableObjects.filter(commandableObject => commandableObject.entity.crashed);
        const allCrashed = commandableObjects.length > 0 && commandableObjects.every(commandableObject => commandableObject.entity.crashed);
        
        debug(`[areAllCarsCrashed] Total cars: ${commandableObjects.length}, Crashed cars: ${crashedCars.length}, All crashed: ${allCrashed}`);
        
        return allCrashed;
    }

    /**
     * Execute function call
     */
    executeFunctionCall(statement) {
        const args = statement.arguments.map(arg => this.evaluateExpression(arg));
        
        // Get the target commandable object - if we're in a method context, use that commandable object, otherwise use default
        let targetCommandableObject = this.defaultCommandableObject;
        if (this.currentContext && this.currentContext.type === 'method' && this.currentContext.commandableObject) {
            targetCommandableObject = this.currentContext.commandableObject;
        }
        
        // Check if all cars are crashed - if so, end execution
        if (this.areAllCarsCrashed()) {
            return { status: 'COMPLETE' };
        }
        
        // For single-car mode, check if the target car is crashed
        if (targetCommandableObject && targetCommandableObject.entity.crashed) {
            // Skip the command but continue execution
            // Check if all cars are now crashed
            if (this.areAllCarsCrashed()) {
                return { status: 'COMPLETE' };
            }
            return null;
        }
        
        // Check if it's a built-in function
        let result = null;
        if (this.functionMap[statement.name]) {
            // For method context, we need to create a custom function map that uses the target commandable object
            if (this.currentContext && this.currentContext.type === 'method') {
                const methodFunctionMap = {
                    'moveForward': () => targetCommandableObject.moveForward(),
                    'moveBackward': () => targetCommandableObject.moveBackward(),
                    'turnRight': () => targetCommandableObject.turnRight(),
                    'turnLeft': () => targetCommandableObject.turnLeft(),
                    'explode': () => targetCommandableObject.crash(),
                    'isRoadAhead': () => targetCommandableObject.isRoadAhead(),
                    'isCowAhead': () => targetCommandableObject.isCowAhead(),
                    'honk': () => this.honkForCar(targetCommandableObject),
                    'not': (value) => !value
                };
                result = methodFunctionMap[statement.name](...args);
            } else {
                result = this.functionMap[statement.name](...args);
            }
        } else if (this.functions[statement.name]) {
            // Check if it's a user-defined function
            result = this.executeUserDefinedFunction(statement.name, args);
        } else {
            console.warn(`Unknown function: ${statement.name}`);
        }
        
        // Check if all cars are crashed after executing the function
        if (this.areAllCarsCrashed()) {
            return { status: 'COMPLETE' };
        }
        
        return result;
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
        debug('HONK: Starting honk method');
        if (typeof soundController !== 'undefined') {
            soundController.playCarHorn();
        }
        const car = this.defaultCommandableObject.entity;
        const carX = car.x;
        const carY = car.y;
        debug('HONK: Car position:', { x: carX, y: carY });
        // Only check the tile in front of the car
        let frontX = carX;
        let frontY = carY;
        switch (car.direction) {
            case 'N': frontY -= 1; break;
            case 'E': frontX += 1; break;
            case 'S': frontY += 1; break;
            case 'W': frontX -= 1; break;
        }
        const frontPos = { x: frontX, y: frontY };
        debug('HONK: Checking front position:', frontPos);
        const globalCows = window.cows || [];
        debug('HONK: Found cows:', globalCows.length, globalCows);
        globalCows.forEach((cow, cowIndex) => {
            debug(`HONK: Checking cow ${cowIndex}:`, cow);
            debug(`HONK: Cow position:`, { x: cow.currentX, y: cow.currentY });
            debug(`HONK: Is cow at front position?`, cow.isAtPosition(frontPos.x, frontPos.y));
            if (cow.isAtPosition(frontPos.x, frontPos.y)) {
                debug(`HONK: Found cow at front position, calling GetHonked(window.world)`);
                cow.GetHonked(window.world);
            }
        });
        debug('HONK: Honk method completed');
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
                blockStartLine: statement.line,
                car: this.currentContext.car // Preserve car reference from parent context
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
                        blockStartLine: statement.line,
                        car: this.currentContext.car // Preserve car reference from parent context
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
                    blockStartLine: statement.line,
                    car: this.currentContext.car // Preserve car reference from parent context
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
            case 'MethodCall':
                return this.executeMethodCall(expression);
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
     * Collect function definitions from statements
     */
    collectFunctionDefinitions(statements, functionDefinitions) {
        for (const line of statements) {
            if (line.statement) {
                this.collectFunctionDefinitionsFromStatement(line.statement, functionDefinitions);
            }
        }
    }
    
    /**
     * Collect function definitions from a single statement
     */
    collectFunctionDefinitionsFromStatement(statement, functionDefinitions) {
        if (statement.type === 'FunctionDeclaration') {
            functionDefinitions.add(statement.name);
        } else if (statement.type === 'ClassDeclaration') {
            // Collect method names from class declarations
            for (const method of statement.methods) {
                functionDefinitions.add(method.name);
            }
        } else if (statement.type === 'IfStatement') {
            this.collectFunctionDefinitions(statement.thenBody.statements, functionDefinitions);
            for (const elseIf of statement.elseIfs) {
                this.collectFunctionDefinitions(elseIf.body.statements, functionDefinitions);
            }
            if (statement.elseBody) {
                this.collectFunctionDefinitions(statement.elseBody.statements, functionDefinitions);
            }
        } else if (statement.type === 'WhileStatement') {
            this.collectFunctionDefinitions(statement.body.statements, functionDefinitions);
        } else if (statement.type === 'ForStatement') {
            this.collectFunctionDefinitions(statement.body.statements, functionDefinitions);
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
            case 'MethodCall':
                this.validateMethodCall(statement, errors, line, allValidFunctions);
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
            case 'MethodCall':
                this.validateMethodCall(expression, errors, null, allValidFunctions);
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
        if (statement.type === 'MethodCall') {
            return this.delayedCommands.includes(statement.method);
        }
        return false;
    }

    /**
     * Execute method call (car.method() or self.method())
     */
    executeMethodCall(statement) {
        const args = statement.arguments.map(arg => this.evaluateExpression(arg));
        
        // Get the target commandable object
        let commandableObject;
        if (statement.object === 'self') {
            // "self" refers to the current commandable object instance in method context
            // Search for commandable object reference in current context and parent contexts
            let context = this.currentContext;
            while (context) {
                if (context.commandableObject) {
                    commandableObject = context.commandableObject;
                    debug(`[executeMethodCall] Using self in context: ${context.type}, commandableObject: ${commandableObject.entity.carType}`);
                    break;
                }
                context = context.parent;
            }
            
            if (!commandableObject) {
                debug(`[executeMethodCall] ERROR: Cannot use 'self' outside of method context. Current context:`, this.currentContext);
                throw new Error(`Cannot use 'self' outside of a method context`);
            }
        } else {
            // Regular commandable object instance method call
            const carName = statement.object;
            commandableObject = this.commandableObjectRegistry[carName];
            
            if (!commandableObject) {
                throw new Error(`Unknown car: ${carName}`);
            }
        }
        
        // Get the underlying car for crash checking
        const car = commandableObject.entity;
        debug(`[executeMethodCall] Executing ${statement.object}.${statement.method}() - Car crashed: ${car.crashed}`);
        
        // Check if the car is crashed - if so, skip the command
        if (car.crashed) {
            debug(`[executeMethodCall] Skipping command for crashed car: ${statement.object}`);
            // Even if this car is crashed, check if all cars are now crashed
            if (this.areAllCarsCrashed()) {
                debug(`[executeMethodCall] All cars crashed, ending execution`);
                return { status: 'COMPLETE' };
            }
            return null;
        }
        
        // Map method names to commandable object methods
        const methodMap = {
            'moveForward': () => commandableObject.moveForward(),
            'moveBackward': () => commandableObject.moveBackward(),
            'turnRight': () => commandableObject.turnRight(),
            'turnLeft': () => commandableObject.turnLeft(),
            'explode': () => commandableObject.crash(),
            'isRoadAhead': () => commandableObject.isRoadAhead(),
            'isCowAhead': () => commandableObject.isCowAhead(),
            'honk': () => this.honkForCar(commandableObject),
            'GetDirectionToFinish': () => commandableObject.getDirectionToFinish(),
            'GetCurrentDirection': () => commandableObject.getCurrentDirection()
        };
        
        // Execute the method
        let result = null;
        if (methodMap[statement.method]) {
            debug(`[executeMethodCall] Executing built-in method: ${statement.method}`);
            result = methodMap[statement.method](...args);
            debug(`[executeMethodCall] Method executed, car crashed: ${car.crashed}`);
        } else if (this.customMethods[statement.method]) {
            debug(`[executeMethodCall] Executing custom method: ${statement.method}`);
            result = this.executeCustomMethod(statement.method, commandableObject, args);
            debug(`[executeMethodCall] Custom method executed, car crashed: ${car.crashed}`);
        } else {
            console.warn(`Unknown method: ${statement.method}`);
        }
        
        // Check if all cars are crashed after executing the method
        if (this.areAllCarsCrashed()) {
            debug(`[executeMethodCall] All cars crashed after method execution, ending execution`);
            return { status: 'COMPLETE' };
        }
        
        return result;
    }

    /**
     * Honk the car horn for a specific commandable object
     */
    honkForCar(commandableObject) {
        debug('HONK: Starting honk method for specific commandable object');
        
        // Play honk sound immediately
        if (typeof soundController !== 'undefined') {
            soundController.playCarHorn();
        }
        
        // Get car's current position from the underlying entity
        const car = commandableObject.entity;
        const carX = car.x;
        const carY = car.y;
        debug('HONK: Car position:', { x: carX, y: carY });
        
        // Check for cows in orthogonally adjacent tiles
        const adjacentPositions = [
            { x: carX, y: carY - 1 }, // North
            { x: carX + 1, y: carY }, // East
            { x: carX, y: carY + 1 }, // South
            { x: carX - 1, y: carY }  // West
        ];
        debug('HONK: Checking adjacent positions:', adjacentPositions);
        
        // Get cows from the global cows array (defined in game.js)
        const globalCows = window.cows || [];
        debug('HONK: Found cows:', globalCows.length, globalCows);
        
        // Check each adjacent position for cows
        adjacentPositions.forEach((pos, index) => {
            debug(`HONK: Checking position ${index}:`, pos);
            globalCows.forEach((cow, cowIndex) => {
                debug(`HONK: Checking cow ${cowIndex}:`, cow);
                debug(`HONK: Cow position:`, { x: cow.currentX, y: cow.currentY });
                debug(`HONK: Is cow at position?`, cow.isAtPosition(pos.x, pos.y));
                if (cow.isAtPosition(pos.x, pos.y)) {
                    debug(`HONK: Found cow at front position, calling GetHonked()`);
                    cow.GetHonked(window.world);
                }
            });
        });
        debug('HONK: Honk method completed');
    }

    /**
     * Validate a method call
     */
    validateMethodCall(methodCall, errors, line, allValidFunctions) {
        const methodName = methodCall.method;
        const objectName = methodCall.object;
        
        // Check if the object (car) exists in the registry or is "self"
        if (objectName !== 'self' && !this.commandableObjectRegistry[objectName]) {
            const lineNumber = this.getLineNumber(line);
            errors.push(`Line ${lineNumber}: Unknown car '${objectName}'`);
            return;
        }
        
        // Check if it's a valid method - allow both built-in and custom methods
        const isBuiltIn = Object.keys(this.functionMap).includes(methodName);
        const isCustom = Object.keys(this.customMethods).includes(methodName);
        
        if (!isBuiltIn && !isCustom) {
            const lineNumber = this.getLineNumber(line);
            const allMethods = [...Object.keys(this.functionMap), ...Object.keys(this.customMethods)];
            errors.push(`Line ${lineNumber}: Undefined method '${methodName}' for car '${objectName}'. Available methods: ${allMethods.join(', ')}`);
        }
        
        // Validate arguments based on function validation rules (only for built-in methods)
        if (isBuiltIn) {
            this.validateMethodArguments(methodCall, errors, line);
        }
    }
    
    /**
     * Validate method arguments
     */
    validateMethodArguments(methodCall, errors, line) {
        const methodName = methodCall.method;
        const args = methodCall.arguments;
        const validation = this.functionValidation[methodName];
        
        if (validation) {
            if (args.length !== validation.args) {
                const lineNumber = this.getLineNumber(line);
                errors.push(`Line ${lineNumber}: '${methodCall.object}.${methodName}' expects ${validation.args} argument(s), got ${args.length}`);
            }
        }
    }

    /**
     * Execute a custom method defined in Class Car
     */
    executeCustomMethod(methodName, commandableObject, args) {
        const methodDef = this.customMethods[methodName];
        
        // Validate argument count
        if (args.length !== methodDef.parameters.length) {
            throw new Error(`Method '${methodName}' expects ${methodDef.parameters.length} argument(s), got ${args.length}`);
        }
        
        // Create new execution context for method
        const methodContext = {
            type: 'method',
            methodName: methodName,
            statements: methodDef.body.statements,
            currentIndex: 0,
            parent: this.currentContext,
            blockStartLine: methodDef.line,
            returnValue: null,
            hasReturned: false,
            commandableObject: commandableObject // Store the commandable object instance for method execution
        };
        
        // Set up parameter variables in the method scope
        for (let i = 0; i < methodDef.parameters.length; i++) {
            const param = methodDef.parameters[i];
            methodContext[param.name] = {
                type: param.type,
                value: args[i]
            };
        }
        
        // Switch to method context
        this.currentContext = methodContext;
        
        return null; // Method execution will continue in executeNext()
    }

    stop() {
        debug('Stopping game');
        this.isExecuting = false;
    }
}

// Export for use in other modules
export default CarLangEngine;