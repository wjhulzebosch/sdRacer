/**
 * CarLang Parser
 * A recursive descent parser for the CarLang programming language
 * Based on the grammar defined in CarLang.ebnf
 */

class CarLangParser {
    constructor() {
        this.tokens = [];
        this.current = 0;
        this.errors = [];
        this.sourceLines = [];
        this.lineNumber = 1;
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
        
        return {
            type: 'Program',
            body: program,
            errors: this.errors
        };
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
                const punctuation = '(){}[];,'.split('');
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
        
        if (this.check('KEYWORD', 'int') || this.check('KEYWORD', 'double') || 
            this.check('KEYWORD', 'string') || this.check('KEYWORD', 'array') ||
            this.check('KEYWORD', 'list') || this.check('KEYWORD', 'priorityList') ||
            this.check('KEYWORD', 'queue') || this.check('KEYWORD', 'void')) {
            return this.parseVariableDeclaration();
        }
        
        if (this.check('IDENTIFIER')) {
            const nextToken = this.tokens[this.current + 1];
            if (nextToken && nextToken.value === '=') {
                return this.parseAssignment();
            } else if (nextToken && nextToken.value === '(') {
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
            value: expression
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
            value: expression
        };
    }

    parseFunctionCall() {
        const name = this.match('IDENTIFIER');
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
            type: 'FunctionCall',
            name: name.value,
            arguments: args
        };
    }

    parseFunctionCallStatement() {
        const functionCall = this.parseFunctionCall();
        this.match('PUNCTUATION', ';');
        return functionCall;
    }

    parseIfStatement() {
        this.match('KEYWORD', 'if');
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
            elseBody: elseBlock
        };
    }

    parseWhileStatement() {
        this.match('KEYWORD', 'while');
        this.match('PUNCTUATION', '(');
        const condition = this.parseExpression();
        this.match('PUNCTUATION', ')');
        const body = this.parseBlock();
        
        return {
            type: 'WhileStatement',
            condition: condition,
            body: body
        };
    }

    parseForStatement() {
        this.match('KEYWORD', 'for');
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
            body: body
        };
    }

    parseForIncrement() {
        const identifier = this.match('IDENTIFIER');
        this.match('OPERATOR', '=');
        const expression = this.parseExpression();
        
        return {
            type: 'Assignment',
            name: identifier.value,
            value: expression
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
            if (nextToken && nextToken.value === '(') {
                return this.parseFunctionCall();
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
        this.match('KEYWORD', 'switch');
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
            defaultCase: defaultCase
        };
    }

    parseTryCatch() {
        this.match('KEYWORD', 'try');
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
            catchBody: catchBlock
        };
    }

    parseReturnStatement() {
        this.match('KEYWORD', 'return');
        let value = null;
        if (!this.check('PUNCTUATION', ';')) {
            value = this.parseExpression();
        }
        this.match('PUNCTUATION', ';');
        
        return {
            type: 'ReturnStatement',
            value: value
        };
    }

    parseBreakStatement() {
        this.match('KEYWORD', 'break');
        this.match('PUNCTUATION', ';');
        
        return {
            type: 'BreakStatement'
        };
    }

    parseContinueStatement() {
        this.match('KEYWORD', 'continue');
        this.match('PUNCTUATION', ';');
        
        return {
            type: 'ContinueStatement'
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CarLangParser;
} 