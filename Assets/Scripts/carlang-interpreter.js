/**
 * CarLang Interpreter
 * Executes parsed CarLang AST by calling Car.js functions
 */

class CarLangInterpreter {
    constructor(car, level, gameDiv) {
        this.car = car;
        this.level = level;
        this.gameDiv = gameDiv;
        this.variables = {};
        this.functions = {};
        this.stepDelay = 1000; // ms between steps
        
        // Map CarLang function names to Car.js methods
        this.functionMap = {
            'moveForward': () => this.car.moveForward(this.level, this.gameDiv),
            'moveBackward': () => this.car.MoveBackward(),
            'rotate': (degree) => this.car.rotate(degree, this.gameDiv),
            'explode': () => this.car.crash(this.gameDiv)
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
                await this.sleep(this.stepDelay);
            }
        }
    }

    /**
     * Execute a single statement
     * @param {Object} statement - The statement AST node
     */
    async executeStatement(statement) {
        switch (statement.type) {
            case 'VariableDeclaration':
                return this.executeVariableDeclaration(statement);
            case 'Assignment':
                return this.executeAssignment(statement);
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
        this.variables[statement.name] = {
            type: statement.varType,
            value: value
        };
        console.log(`Declared ${statement.varType} ${statement.name} = ${value}`);
    }

    /**
     * Execute assignment
     */
    executeAssignment(statement) {
        const value = this.evaluateExpression(statement.value);
        this.variables[statement.name] = {
            type: 'auto',
            value: value
        };
        console.log(`Assigned ${statement.name} = ${value}`);
    }

    /**
     * Execute function call
     */
    executeFunctionCall(statement) {
        const args = statement.arguments.map(arg => this.evaluateExpression(arg));
        
        if (this.functionMap[statement.name]) {
            console.log(`Calling ${statement.name}(${args.join(', ')})`);
            return this.functionMap[statement.name](...args);
        } else {
            console.warn(`Unknown function: ${statement.name}`);
        }
    }

    /**
     * Execute if statement
     */
    async executeIfStatement(statement) {
        const condition = this.evaluateExpression(statement.condition);
        
        if (condition) {
            await this.executeBlock(statement.thenBody);
        } else {
            // Check else-if conditions
            for (const elseIf of statement.elseIfs) {
                const elseIfCondition = this.evaluateExpression(elseIf.condition);
                if (elseIfCondition) {
                    await this.executeBlock(elseIf.body);
                    return;
                }
            }
            
            // Execute else block if it exists
            if (statement.elseBody) {
                await this.executeBlock(statement.elseBody);
            }
        }
    }

    /**
     * Execute while statement
     */
    async executeWhileStatement(statement) {
        let iterations = 0;
        const maxIterations = 1000; // Prevent infinite loops
        
        while (this.evaluateExpression(statement.condition) && iterations < maxIterations) {
            await this.executeBlock(statement.body);
            iterations++;
            await this.sleep(this.stepDelay);
        }
        
        if (iterations >= maxIterations) {
            console.warn('While loop exceeded maximum iterations');
        }
    }

    /**
     * Execute for statement
     */
    async executeForStatement(statement) {
        // Execute initialization
        this.executeVariableDeclaration(statement.initialization);
        
        let iterations = 0;
        const maxIterations = 1000; // Prevent infinite loops
        
        while (this.evaluateExpression(statement.condition) && iterations < maxIterations) {
            await this.executeBlock(statement.body);
            
            // Execute increment
            this.executeAssignment(statement.increment);
            
            iterations++;
            await this.sleep(this.stepDelay);
        }
        
        if (iterations >= maxIterations) {
            console.warn('For loop exceeded maximum iterations');
        }
    }

    /**
     * Execute block of statements
     */
    async executeBlock(block) {
        for (const line of block.statements) {
            if (line.statement) {
                await this.executeStatement(line.statement);
                await this.sleep(this.stepDelay);
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
        if (statement.value) {
            const value = this.evaluateExpression(statement.value);
            console.log(`Returning: ${value}`);
            return value;
        }
        console.log('Returning: undefined');
        return undefined;
    }

    /**
     * Execute break statement
     */
    executeBreakStatement(statement) {
        console.log('Breaking from loop');
        // This would need to be handled by the calling loop
        throw new Error('BREAK');
    }

    /**
     * Execute continue statement
     */
    executeContinueStatement(statement) {
        console.log('Continuing loop');
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
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CarLangInterpreter;
} 