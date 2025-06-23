/**
 * CarLang Parser
 * A recursive descent parser for the CarLang programming language
 * Based on the grammar defined in CarLang.ebnf
 */

class CarLangParser {
    constructor(mode = 'single', availableCars = []) {
        this.tokens = [];
        this.current = 0;
        this.errors = [];
        this.sourceLines = [];
        this.lineNumber = 1;
        this.mode = mode; // 'single' or 'oop'
        this.availableCars = availableCars; // Array of available car names
        this.userDefinedFunctions = new Set(); // Track user-defined functions
        if (typeof debug === 'function') {
            debug('CarLangParser constructor: mode =', mode);
            debug('CarLangParser constructor: availableCars =', availableCars);
        }
    }

    /**
     * Parse the input source code
     * @param {string} source - The source code to parse
     * @returns {Object} - The parsed AST (Abstract Syntax Tree)
     */
    parse(source) {
        this.sourceLines = source.split('\n');
        this.tokens = this.tokenize(source);
        this.current = 0;
        this.errors = [];
        this.lineNumber = 1;
        
        const program = this.parseProgram();
        
        const ast = {
            type: 'Program',
            body: program,
            errors: this.errors
        };
        
        // Validate syntax based on mode
        this.validateSyntax(ast);
        
        // Run enhanced validation for better error reporting
        const enhancedValidation = this.validateEnhanced(ast);
        
        // Combine all errors
        ast.errors = [...this.errors, ...enhancedValidation.errors];
        ast.warnings = enhancedValidation.warnings;
        ast.valid = this.errors.length === 0 && enhancedValidation.errors.length === 0;
        
        return ast;
    }

    /**
     * Tokenize the source code into tokens
     * @param {string} source - The source code
     * @returns {Array} - Array of tokens
     */
    tokenize(source) {
        const tokens = [];
        let current = 0;
        let lineNumber = 1;
        
        const keywords = [
            'if', 'else', 'while', 'for', 'switch', 'case', 'default',
            'try', 'catch', 'return', 'break', 'continue',
            'int', 'double', 'string', 'array', 'list', 'priorityList', 'queue', 'void',
            'true', 'false', 'null'
        ];
        
        const operators = [
            '==', '!=', '<=', '>=', '&&', '||',
            '+', '-', '*', '/', '%', '<', '>', '='
        ];

        while (current < source.length) {
            let char = source[current];

            // Track line numbers
            if (char === '\n') {
                lineNumber++;
            }

            // Skip whitespace
            if (/\s/.test(char)) {
                current++;
                continue;
            }

            // Comments
            if (char === '/' && source[current + 1] === '/') {
                let comment = '';
                current += 2;
                while (current < source.length && source[current] !== '\n') {
                    comment += source[current];
                    current++;
                }
                tokens.push({ type: 'COMMENT', value: comment, line: lineNumber });
                continue;
            }

            // Strings
            if (char === '"') {
                let string = '';
                current++;
                while (current < source.length && source[current] !== '"') {
                    if (source[current] === '\\') {
                        current++;
                        if (current < source.length) {
                            string += '\\' + source[current];
                        }
                    } else {
                        string += source[current];
                    }
                    current++;
                }
                if (current < source.length) {
                    current++; // consume closing quote
                    tokens.push({ type: 'STRING', value: string, line: lineNumber });
                } else {
                    this.errors.push(`Line ${lineNumber}: Unterminated string`);
                }
                continue;
            }

            // Numbers
            if (/\d/.test(char)) {
                let number = '';
                while (current < source.length && /\d/.test(source[current])) {
                    number += source[current];
                    current++;
                }
                if (source[current] === '.') {
                    number += '.';
                    current++;
                    while (current < source.length && /\d/.test(source[current])) {
                        number += source[current];
                        current++;
                    }
                }
                tokens.push({ type: 'NUMBER', value: parseFloat(number), line: lineNumber });
                continue;
            }

            // Identifiers and keywords
            if (/[a-zA-Z_]/.test(char)) {
                let identifier = '';
                while (current < source.length && /[a-zA-Z0-9_]/.test(source[current])) {
                    identifier += source[current];
                    current++;
                }
                
                if (keywords.includes(identifier)) {
                    tokens.push({ type: 'KEYWORD', value: identifier, line: lineNumber });
                } else {
                    tokens.push({ type: 'IDENTIFIER', value: identifier, line: lineNumber });
                }
                continue;
            }

            // Operators and punctuation
            let found = false;
            for (let op of operators) {
                if (source.substring(current, current + op.length) === op) {
                    tokens.push({ type: 'OPERATOR', value: op, line: lineNumber });
                    current += op.length;
                    found = true;
                    break;
                }
            }
            
            if (!found) {
                // Single character punctuation
                const punctuation = '(){}[];,.'.split('');
                if (punctuation.includes(char)) {
                    tokens.push({ type: 'PUNCTUATION', value: char, line: lineNumber });
                    current++;
                } else {
                    this.errors.push(`Line ${lineNumber}: Unexpected character: ${char}`);
                    current++;
                }
            }
        }

        tokens.push({ type: 'EOF', line: lineNumber });
        return tokens;
    }

    // Helper methods
    peek() {
        return this.tokens[this.current];
    }

    advance() {
        if (this.current < this.tokens.length) {
            this.current++;
        }
        return this.tokens[this.current - 1];
    }

    check(type, value = null) {
        const token = this.peek();
        if (token.type !== type) return false;
        if (value !== null && token.value !== value) return false;
        return true;
    }

    match(type, value = null) {
        if (this.check(type, value)) {
            return this.advance();
        }
        const token = this.peek();
        const line = token.line || this.lineNumber;
        const context = this.getErrorContext(line);
        this.errors.push(`Line ${line}: Expected ${type}${value ? ` '${value}'` : ''}, got ${token.type} '${token.value || token.type}'${context}`);
        return null;
    }

    getErrorContext(lineNumber) {
        if (lineNumber > 0 && lineNumber <= this.sourceLines.length) {
            const line = this.sourceLines[lineNumber - 1];
            return `\n  Context: ${line.trim()}`;
        }
        return '';
    }

    // Grammar rules implementation
    parseProgram() {
        const lines = [];
        while (!this.check('EOF')) {
            const line = this.parseLine();
            if (line) {
                lines.push(line);
            }
        }
        return lines;
    }

    parseLine() {
        const statement = this.parseStatement();
        const comment = this.parseComment();
        
        if (statement || comment) {
            return {
                type: 'Line',
                statement: statement,
                comment: comment
            };
        }
        
        // If we get here, we couldn't parse anything on this line
        // Check if there are any tokens left that aren't whitespace or comments
        const currentToken = this.peek();
        if (currentToken && currentToken.type !== 'EOF') {
            // There's something on this line we couldn't parse - report an error
            const line = currentToken.line || this.lineNumber;
            const context = this.getErrorContext(line);
            this.errors.push(`Line ${line}: Unrecognized statement or syntax error${context}`);
            
            // Try to advance past the problematic token to continue parsing
            this.advance();
            
            // Return a placeholder line to indicate there was content
            return {
                type: 'Line',
                statement: {
                    type: 'Error',
                    message: `Unrecognized statement at line ${line}`
                },
                comment: null
            };
        }
        
        return null;
    }

    parseComment() {
        if (this.check('COMMENT')) {
            return this.advance();
        }
        return null;
    }

    parseStatement() {
        const token = this.peek();
        if (typeof debug === 'function') {
            debug('parseStatement: token =', token);
            debug('parseStatement: mode =', this.mode);
            debug('parseStatement: availableCars =', this.availableCars);
        }
        
        if (this.check('KEYWORD', 'int') || this.check('KEYWORD', 'double') || 
            this.check('KEYWORD', 'string') || this.check('KEYWORD', 'array') ||
            this.check('KEYWORD', 'list') || this.check('KEYWORD', 'priorityList') ||
            this.check('KEYWORD', 'queue') || this.check('KEYWORD', 'void')) {
            // Check if this is a function declaration (next token after type is identifier, then '(')
            const nextToken = this.tokens[this.current + 1];
            const nextNextToken = this.tokens[this.current + 2];
            if (nextToken && nextToken.type === 'IDENTIFIER' && nextNextToken && nextNextToken.value === '(') {
                return this.parseFunctionDeclaration();
            } else {
                return this.parseVariableDeclaration();
            }
        }
        
        if (this.check('IDENTIFIER')) {
            const nextToken = this.tokens[this.current + 1];
            if (typeof debug === 'function') {
                debug('parseStatement: IDENTIFIER nextToken =', nextToken);
            }
            if (nextToken && nextToken.value === '=') {
                return this.parseAssignment();
            } else if (nextToken && nextToken.value === '(') {
                return this.parseFunctionCallStatement();
            } else if (this.mode === 'oop' && nextToken && nextToken.value === '.') {
                if (typeof debug === 'function') {
                    debug('parseStatement: Detected OOP method call', {
                        current: this.current,
                        token,
                        nextToken,
                        mode: this.mode,
                        availableCars: this.availableCars
                    });
                }
                // This is a method call (object.method)
                return this.parseFunctionCallStatement();
            }
        }
        
        if (this.check('KEYWORD', 'if')) {
            return this.parseIfStatement();
        }
        
        if (this.check('KEYWORD', 'while')) {
            return this.parseWhileStatement();
        }
        
        if (this.check('KEYWORD', 'for')) {
            return this.parseForStatement();
        }
        
        if (this.check('KEYWORD', 'switch')) {
            return this.parseSwitchStatement();
        }
        
        if (this.check('KEYWORD', 'try')) {
            return this.parseTryCatch();
        }
        
        if (this.check('KEYWORD', 'return')) {
            return this.parseReturnStatement();
        }
        
        if (this.check('KEYWORD', 'break')) {
            return this.parseBreakStatement();
        }
        
        if (this.check('KEYWORD', 'continue')) {
            return this.parseContinueStatement();
        }
        
        return null;
    }

    parseVariableDeclaration() {
        const type = this.match('KEYWORD');
        const identifier = this.match('IDENTIFIER');
        this.match('OPERATOR', '=');
        const expression = this.parseExpression();
        this.match('PUNCTUATION', ';');
        
        return {
            type: 'VariableDeclaration',
            varType: type.value,
            name: identifier.value,
            value: expression,
            line: type.line
        };
    }

    parseAssignment() {
        const identifier = this.match('IDENTIFIER');
        this.match('OPERATOR', '=');
        const expression = this.parseExpression();
        this.match('PUNCTUATION', ';');
        
        return {
            type: 'Assignment',
            name: identifier.value,
            value: expression,
            line: identifier.line
        };
    }

    parseFunctionCall() {
        let objectName = null;
        let functionName;
        if (typeof debug === 'function') {
            debug('parseFunctionCall: mode =', this.mode);
            debug('parseFunctionCall: current token =', this.peek());
            debug('parseFunctionCall: availableCars =', this.availableCars);
        }
        // Check if this is a method call (object.method)
        if (this.mode === 'oop' && this.check('IDENTIFIER')) {
            const firstIdentifier = this.peek();
            const nextToken = this.tokens[this.current + 1];
            if (typeof debug === 'function') {
                debug('parseFunctionCall: OOP check', { firstIdentifier, nextToken });
            }
            // If next token is a dot, this is a method call
            if (nextToken && nextToken.value === '.') {
                objectName = this.advance().value;
                this.advance(); // consume the dot
                if (typeof debug === 'function') {
                    debug('parseFunctionCall: OOP method call objectName =', objectName);
                }
                // Validate car name
                if (!this.availableCars.includes(objectName)) {
                    const line = firstIdentifier.line || this.lineNumber;
                    const context = this.getErrorContext(line);
                    this.errors.push(`Line ${line}: Unknown car '${objectName}'. Available cars: ${this.availableCars.join(', ')}${context}`);
                }
            }
        }
        
        // Parse the function name
        const nameToken = this.match('IDENTIFIER');
        functionName = nameToken.value;
        
        this.match('PUNCTUATION', '(');
        
        const args = [];
        if (!this.check('PUNCTUATION', ')')) {
            args.push(this.parseExpression());
            while (this.check('PUNCTUATION', ',')) {
                this.advance();
                args.push(this.parseExpression());
            }
        }
        
        this.match('PUNCTUATION', ')');
        
        // Return different AST structure based on mode
        if (objectName) {
            return {
                type: 'MethodCall',
                object: objectName,
                method: functionName,
                arguments: args,
                line: nameToken.line
            };
        } else {
            return {
                type: 'FunctionCall',
                name: functionName,
                arguments: args,
                line: nameToken.line
            };
        }
    }

    parseFunctionCallStatement() {
        const functionCall = this.parseFunctionCall();
        this.match('PUNCTUATION', ';');
        return functionCall;
    }

    parseIfStatement() {
        const ifKeyword = this.match('KEYWORD', 'if');
        this.match('PUNCTUATION', '(');
        const condition = this.parseExpression();
        this.match('PUNCTUATION', ')');
        const thenBlock = this.parseBlock();
        
        const elseIfs = [];
        while (this.check('KEYWORD', 'else') && this.tokens[this.current + 1]?.value === 'if') {
            this.advance(); // consume 'else'
            this.advance(); // consume 'if'
            this.match('PUNCTUATION', '(');
            const elseIfCondition = this.parseExpression();
            this.match('PUNCTUATION', ')');
            const elseIfBlock = this.parseBlock();
            elseIfs.push({
                condition: elseIfCondition,
                body: elseIfBlock
            });
        }
        
        let elseBlock = null;
        if (this.check('KEYWORD', 'else')) {
            this.advance();
            elseBlock = this.parseBlock();
        }
        
        return {
            type: 'IfStatement',
            condition: condition,
            thenBody: thenBlock,
            elseIfs: elseIfs,
            elseBody: elseBlock,
            line: ifKeyword.line
        };
    }

    parseWhileStatement() {
        const whileKeyword = this.match('KEYWORD', 'while');
        this.match('PUNCTUATION', '(');
        const condition = this.parseExpression();
        this.match('PUNCTUATION', ')');
        const body = this.parseBlock();
        
        return {
            type: 'WhileStatement',
            condition: condition,
            body: body,
            line: whileKeyword.line
        };
    }

    parseForStatement() {
        const forKeyword = this.match('KEYWORD', 'for');
        this.match('PUNCTUATION', '(');
        const init = this.parseVariableDeclaration();
        const condition = this.parseExpression();
        this.match('PUNCTUATION', ';');
        
        // Parse increment as an assignment without requiring semicolon
        const increment = this.parseForIncrement();
        this.match('PUNCTUATION', ')');
        const body = this.parseBlock();
        
        return {
            type: 'ForStatement',
            initialization: init,
            condition: condition,
            increment: increment,
            body: body,
            line: forKeyword.line
        };
    }

    parseForIncrement() {
        const identifier = this.match('IDENTIFIER');
        this.match('OPERATOR', '=');
        const expression = this.parseExpression();
        
        return {
            type: 'Assignment',
            name: identifier.value,
            value: expression,
            line: identifier.line
        };
    }

    parseBlock() {
        this.match('PUNCTUATION', '{');
        
        const statements = [];
        while (!this.check('PUNCTUATION', '}') && !this.check('EOF')) {
            const line = this.parseLine();
            if (line) {
                statements.push(line);
            } else {
                // If we can't parse a line, we might be at the end of the block
                if (this.check('PUNCTUATION', '}')) {
                    break;
                }
                // Skip tokens until we find a statement or closing brace
                this.advance();
            }
        }
        
        this.match('PUNCTUATION', '}');
        
        return {
            type: 'Block',
            statements: statements
        };
    }

    parseExpression() {
        let left = this.parsePrimary();
        
        while (this.check('OPERATOR')) {
            const operator = this.advance();
            const right = this.parsePrimary();
            
            left = {
                type: 'BinaryExpression',
                operator: operator.value,
                left: left,
                right: right
            };
        }
        
        return left;
    }

    parsePrimary() {
        if (typeof debug === 'function') {
            debug('parsePrimary: current token =', this.peek());
            debug('parsePrimary: mode =', this.mode);
            debug('parsePrimary: availableCars =', this.availableCars);
        }
        if (this.check('NUMBER')) {
            return this.parseLiteral();
        }
        
        if (this.check('STRING')) {
            return this.parseLiteral();
        }
        
        if (this.check('KEYWORD', 'true') || this.check('KEYWORD', 'false') || this.check('KEYWORD', 'null')) {
            return this.parseLiteral();
        }
        
        if (this.check('IDENTIFIER')) {
            const nextToken = this.tokens[this.current + 1];
            if (typeof debug === 'function') {
                debug('parsePrimary: IDENTIFIER nextToken =', nextToken);
            }
            if (nextToken && nextToken.value === '(') {
                return this.parseFunctionCall();
            } else if (nextToken && nextToken.value === '.') {
                if (typeof debug === 'function') {
                    debug('parsePrimary: Detected OOP method call', {
                        current: this.current,
                        token: this.peek(),
                        nextToken,
                        mode: this.mode,
                        availableCars: this.availableCars
                    });
                }
                // Handle method calls: object.method()
                const objectName = this.advance().value;
                this.advance(); // consume the dot
                if (typeof debug === 'function') {
                    debug('parsePrimary: OOP method call objectName =', objectName);
                }
                // Validate car name if in OOP mode
                if (this.mode === 'oop' && !this.availableCars.includes(objectName)) {
                    const line = this.peek().line || this.lineNumber;
                    const context = this.getErrorContext(line);
                    this.errors.push(`Line ${line}: Unknown car '${objectName}'. Available cars: ${this.availableCars.join(', ')}${context}`);
                }
                const methodName = this.match('IDENTIFIER');
                this.match('PUNCTUATION', '(');
                const args = [];
                if (!this.check('PUNCTUATION', ')')) {
                    args.push(this.parseExpression());
                    while (this.check('PUNCTUATION', ',')) {
                        this.advance();
                        args.push(this.parseExpression());
                    }
                }
                this.match('PUNCTUATION', ')');
                return {
                    type: 'MethodCall',
                    object: objectName,
                    method: methodName.value,
                    arguments: args,
                    line: methodName.line
                };
            } else {
                return this.parseIdentifier();
            }
        }
        
        if (this.check('PUNCTUATION', '(')) {
            this.advance();
            const expression = this.parseExpression();
            this.match('PUNCTUATION', ')');
            return expression;
        }
        
        const token = this.peek();
        const line = token.line || this.lineNumber;
        const context = this.getErrorContext(line);
        this.errors.push(`Line ${line}: Unexpected token: ${token.type} '${token.value || token.type}'${context}`);
        return null;
    }

    parseLiteral() {
        const token = this.advance();
        
        return {
            type: 'Literal',
            value: token.value,
            literalType: token.type === 'NUMBER' ? 'number' : 
                        token.type === 'STRING' ? 'string' : 'boolean'
        };
    }

    parseIdentifier() {
        const token = this.match('IDENTIFIER');
        
        return {
            type: 'Identifier',
            name: token.value
        };
    }

    // Additional parsing methods for remaining grammar rules
    parseSwitchStatement() {
        const switchKeyword = this.match('KEYWORD', 'switch');
        this.match('PUNCTUATION', '(');
        const expression = this.parseExpression();
        this.match('PUNCTUATION', ')');
        this.match('PUNCTUATION', '{');
        
        const cases = [];
        while (this.check('KEYWORD', 'case')) {
            this.advance();
            const caseValue = this.parseLiteral();
            this.match('PUNCTUATION', ':');
            
            const statements = [];
            while (!this.check('KEYWORD', 'break') && !this.check('KEYWORD', 'case') && 
                   !this.check('KEYWORD', 'default') && !this.check('PUNCTUATION', '}')) {
                const stmt = this.parseStatement();
                if (stmt) statements.push(stmt);
            }
            
            if (this.check('KEYWORD', 'break')) {
                this.advance();
                this.match('PUNCTUATION', ';');
            }
            
            cases.push({
                value: caseValue,
                statements: statements
            });
        }
        
        let defaultCase = null;
        if (this.check('KEYWORD', 'default')) {
            this.advance();
            this.match('PUNCTUATION', ':');
            
            const statements = [];
            while (!this.check('PUNCTUATION', '}')) {
                const stmt = this.parseStatement();
                if (stmt) statements.push(stmt);
            }
            
            defaultCase = {
                statements: statements
            };
        }
        
        this.match('PUNCTUATION', '}');
        
        return {
            type: 'SwitchStatement',
            expression: expression,
            cases: cases,
            defaultCase: defaultCase,
            line: switchKeyword.line
        };
    }

    parseTryCatch() {
        const tryKeyword = this.match('KEYWORD', 'try');
        const tryBlock = this.parseBlock();
        this.match('KEYWORD', 'catch');
        this.match('PUNCTUATION', '(');
        const errorVar = this.match('IDENTIFIER');
        this.match('PUNCTUATION', ')');
        const catchBlock = this.parseBlock();
        
        return {
            type: 'TryCatch',
            tryBody: tryBlock,
            errorVariable: errorVar.value,
            catchBody: catchBlock,
            line: tryKeyword.line
        };
    }

    parseReturnStatement() {
        const returnKeyword = this.match('KEYWORD', 'return');
        let value = null;
        if (!this.check('PUNCTUATION', ';')) {
            value = this.parseExpression();
        }
        this.match('PUNCTUATION', ';');
        
        return {
            type: 'ReturnStatement',
            value: value,
            line: returnKeyword.line
        };
    }

    parseBreakStatement() {
        const breakKeyword = this.match('KEYWORD', 'break');
        this.match('PUNCTUATION', ';');
        
        return {
            type: 'BreakStatement',
            line: breakKeyword.line
        };
    }

    parseContinueStatement() {
        const continueKeyword = this.match('KEYWORD', 'continue');
        this.match('PUNCTUATION', ';');
        
        return {
            type: 'ContinueStatement',
            line: continueKeyword.line
        };
    }

    parseFunctionDeclaration() {
        const returnType = this.match('KEYWORD');
        const name = this.match('IDENTIFIER');
        
        // Add function name to the set of user-defined functions
        this.userDefinedFunctions.add(name.value);
        
        this.match('PUNCTUATION', '(');
        
        const parameters = [];
        if (!this.check('PUNCTUATION', ')')) {
            parameters.push(this.parseParameter());
            while (this.check('PUNCTUATION', ',')) {
                this.advance();
                parameters.push(this.parseParameter());
            }
        }
        
        this.match('PUNCTUATION', ')');
        const body = this.parseBlock();
        
        return {
            type: 'FunctionDeclaration',
            returnType: returnType.value,
            name: name.value,
            parameters: parameters,
            body: body,
            line: returnType.line
        };
    }

    parseParameter() {
        const type = this.match('KEYWORD');
        const name = this.match('IDENTIFIER');
        
        return {
            type: type.value,
            name: name.value
        };
    }

    /**
     * Validate syntax based on parser mode
     * @param {Object} ast - The parsed AST
     */
    validateSyntax(ast) {
        this.validateStatements(ast.body);
    }
    
    validateStatements(statements) {
        for (const line of statements) {
            if (line.statement) {
                this.validateStatement(line.statement);
            }
        }
    }
    
    validateStatement(statement) {
        if (statement.type === 'FunctionCall') {
            this.validateFunctionCall(statement);
        } else if (statement.type === 'MethodCall') {
            this.validateMethodCall(statement);
        } else if (statement.type === 'IfStatement') {
            this.validateStatements(statement.thenBody.statements);
            for (const elseIf of statement.elseIfs) {
                this.validateStatements(elseIf.body.statements);
            }
            if (statement.elseBody) {
                this.validateStatements(statement.elseBody.statements);
            }
        } else if (statement.type === 'WhileStatement') {
            this.validateStatements(statement.body.statements);
        } else if (statement.type === 'ForStatement') {
            this.validateStatements(statement.body.statements);
        } else if (statement.type === 'FunctionDeclaration') {
            this.validateStatements(statement.body.statements);
        }
    }
    
    validateFunctionCall(statement) {
        if (this.mode === 'oop') {
            const line = statement.line || this.lineNumber;
            const context = this.getErrorContext(line);
            this.errors.push(`Line ${line}: Cannot use '${statement.name}()' without specifying a car in OOP mode. Use 'carName.${statement.name}()' instead.${context}`);
        }
        
        // Validate function name in both modes
        const validFunctions = [
            'moveForward', 'moveBackward', 'turnLeft', 'turnRight', 
            'honk', 'isRoadAhead', 'isCowAhead', 'isAtFinish'
        ];
        
        // Allow user-defined functions
        if (!validFunctions.includes(statement.name) && !this.userDefinedFunctions.has(statement.name)) {
            const line = statement.line || this.lineNumber;
            const context = this.getErrorContext(line);
            const allFunctions = [...validFunctions, ...Array.from(this.userDefinedFunctions)];
            this.errors.push(`Line ${line}: Unknown function '${statement.name}()'. Available functions: ${allFunctions.join(', ')}.${context}`);
        }
    }
    
    validateMethodCall(statement) {
        if (this.mode === 'single') {
            const line = statement.line || this.lineNumber;
            const context = this.getErrorContext(line);
            this.errors.push(`Line ${line}: Cannot use '${statement.object}.${statement.method}()' in single-car mode. Use '${statement.method}()' instead.${context}`);
            return;
        }
        
        // Validate car name in OOP mode
        if (!this.availableCars.includes(statement.object)) {
            const line = statement.line || this.lineNumber;
            const context = this.getErrorContext(line);
            const availableCarsList = this.availableCars.length > 0 ? this.availableCars.join(', ') : 'none';
            this.errors.push(`Line ${line}: Unknown car '${statement.object}'. Available cars: ${availableCarsList}.${context}`);
            return;
        }
        
        // Validate method name
        const validMethods = [
            'moveForward', 'moveBackward', 'turnLeft', 'turnRight', 
            'honk', 'isRoadAhead', 'isCowAhead', 'isAtFinish'
        ];
        
        if (!validMethods.includes(statement.method)) {
            const line = statement.line || this.lineNumber;
            const context = this.getErrorContext(line);
            this.errors.push(`Line ${line}: Unknown method '${statement.method}()' for car '${statement.object}'. Available methods: ${validMethods.join(', ')}.${context}`);
        }
    }
    
    /**
     * Enhanced validation for better error reporting
     */
    validateEnhanced(ast) {
        const enhancedErrors = [];
        const warnings = [];
        
        // Check for common programming mistakes
        this.checkForCommonMistakes(ast, enhancedErrors, warnings);
        
        // Check for OOP-specific issues
        if (this.mode === 'oop') {
            this.checkOOPIssues(ast, enhancedErrors, warnings);
        }
        
        // Check for single-car mode issues
        if (this.mode === 'single') {
            this.checkSingleCarIssues(ast, enhancedErrors, warnings);
        }
        
        // Add enhanced errors and warnings to the AST
        ast.enhancedErrors = enhancedErrors;
        ast.warnings = warnings;
        
        return {
            valid: enhancedErrors.length === 0,
            errors: enhancedErrors,
            warnings: warnings
        };
    }
    
    checkForCommonMistakes(ast, errors, warnings) {
        this.traverseAST(ast, (node) => {
            // Check for missing semicolons in function calls
            if (node.type === 'FunctionCall' && !node.hasSemicolon) {
                const line = node.line || this.lineNumber;
                const context = this.getErrorContext(line);
                errors.push(`Line ${line}: Missing semicolon after '${node.name}()'.${context}`);
            }
            
            // Check for missing semicolons in method calls
            if (node.type === 'MethodCall' && !node.hasSemicolon) {
                const line = node.line || this.lineNumber;
                const context = this.getErrorContext(line);
                errors.push(`Line ${line}: Missing semicolon after '${node.object}.${node.method}()'.${context}`);
            }
            
            // Check for empty blocks
            if (node.type === 'Block' && (!node.statements || node.statements.length === 0)) {
                const line = node.line || this.lineNumber;
                warnings.push(`Line ${line}: Empty block detected. Consider adding some code or removing the block.`);
            }
            
            // Check for infinite loops
            if (node.type === 'WhileStatement' && node.condition && 
                (node.condition.type === 'Literal' && node.condition.value === true)) {
                const line = node.line || this.lineNumber;
                warnings.push(`Line ${line}: Infinite loop detected with 'while(true)'. Make sure you have a way to break out of the loop.`);
            }
        });
    }
    
    checkOOPIssues(ast, errors, warnings) {
        const usedCars = new Set();
        const carUsageCount = {};
        
        this.traverseAST(ast, (node) => {
            if (node.type === 'MethodCall') {
                usedCars.add(node.object);
                carUsageCount[node.object] = (carUsageCount[node.object] || 0) + 1;
            }
        });
        
        // Check for unused cars
        this.availableCars.forEach(carName => {
            if (!usedCars.has(carName)) {
                warnings.push(`Car '${carName}' is available but not used in your code.`);
            }
        });
        
        // Check for overused cars (potential optimization)
        Object.entries(carUsageCount).forEach(([carName, count]) => {
            if (count > 10) {
                warnings.push(`Car '${carName}' is used ${count} times. Consider using loops to reduce repetition.`);
            }
        });
        
        // Check for mixed syntax (function calls in OOP mode)
        let hasFunctionCalls = false;
        let hasMethodCalls = false;
        
        this.traverseAST(ast, (node) => {
            if (node.type === 'FunctionCall') hasFunctionCalls = true;
            if (node.type === 'MethodCall') hasMethodCalls = true;
        });
        
        if (hasFunctionCalls && hasMethodCalls) {
            warnings.push('Mixed syntax detected: You are using both function calls and method calls. In OOP mode, it\'s recommended to use method calls consistently.');
        }
    }
    
    checkSingleCarIssues(ast, errors, warnings) {
        // Check for method calls in single-car mode
        let hasMethodCalls = false;
        
        this.traverseAST(ast, (node) => {
            if (node.type === 'MethodCall') {
                hasMethodCalls = true;
                const line = node.line || this.lineNumber;
                const context = this.getErrorContext(line);
                errors.push(`Line ${line}: Cannot use '${node.object}.${node.method}()' in single-car mode. Use '${node.method}()' instead.${context}`);
            }
        });
        
        if (hasMethodCalls) {
            warnings.push('This level uses single-car mode. Use function calls like moveForward() instead of carName.moveForward().');
        }
    }
    
    traverseAST(node, callback) {
        if (!node || typeof node !== 'object') return;
        
        callback(node);
        
        // Recursively traverse child nodes
        if (node.body) {
            if (Array.isArray(node.body)) {
                node.body.forEach(child => this.traverseAST(child, callback));
            } else {
                this.traverseAST(node.body, callback);
            }
        }
        
        if (node.statements) {
            node.statements.forEach(child => this.traverseAST(child, callback));
        }
        
        if (node.thenBody) this.traverseAST(node.thenBody, callback);
        if (node.elseBody) this.traverseAST(node.elseBody, callback);
        if (node.elseIfs) {
            node.elseIfs.forEach(elseIf => this.traverseAST(elseIf.body, callback));
        }
        
        if (node.condition) this.traverseAST(node.condition, callback);
        if (node.expression) this.traverseAST(node.expression, callback);
        if (node.value) this.traverseAST(node.value, callback);
        
        if (node.cases) {
            node.cases.forEach(caseNode => {
                this.traverseAST(caseNode.value, callback);
                this.traverseAST(caseNode.statements, callback);
            });
        }
        
        if (node.defaultCase) this.traverseAST(node.defaultCase.statements, callback);
        if (node.tryBody) this.traverseAST(node.tryBody, callback);
        if (node.catchBody) this.traverseAST(node.catchBody, callback);
    }
}

export default CarLangParser; 