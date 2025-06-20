// Interpreter supports:
// - Single-line commands: moveForward();, rotate(90);
// - Single-line if: if (cond) moveForward();
// - Single-line while: while (cond) moveForward();
// - Single-line for: for (let i=0;i<3;i++) moveForward();
// - Single-line variable assignment: let i = 0;
// It does NOT support multi-line blocks, nested statements, or full JS syntax.

// This interpreter should be able to interpret the following commands:
// moveForward();
// moveBackward();
// rotate(degree); (degree must be a multiple of 90)
// explode();

// These are the commands that are not yet implemented:
// def functionName(args);
// call functionName(args);
// if condition;
// else;
// while condition;
// for (let i = 0; i < 10; i++) {
//     // code
// }
// return;
// explode();

class Interpreter {
    constructor(car, level, gameDiv) {
        this.car = car;
        this.level = level;
        this.gameDiv = gameDiv;
        this.commands = {
            moveForward: () => this.car.moveForward(this.level, this.gameDiv),
            rotate: (deg) => this.car.rotate(deg, this.gameDiv),
            // Add more commands here as needed
        };
        this.vars = {};
        this.stepDelay = 1000; // ms
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    evalExpr(expr) {
        // Only allow numbers, vars, <, >, <=, >=, ==, !=, +, -, *, /, (, )
        // This is a very basic and unsafe evaluator for demo purposes
        try {
            // Replace variable names with their values
            let safeExpr = expr.replace(/[a-zA-Z_][a-zA-Z0-9_]*/g, v => (this.vars[v] !== undefined ? this.vars[v] : v));
            // eslint-disable-next-line no-eval
            return eval(safeExpr);
        } catch {
            return false;
        }
    }

    async runLine(line) {
        if (line.startsWith('//')) return;
        // for loop: for (let i=0;i<3;i++) moveForward();
        let forMatch = line.match(/^for\s*\(([^;]+);([^;]+);([^\)]+)\)\s*(\w+)\s*\(([^)]*)\)\s*;?$/);
        if (forMatch) {
            let [_, init, cond, inc, cmd, argStr] = forMatch;
            eval(init);
            while (this.evalExpr(cond)) {
                if (this.commands[cmd]) {
                    if (argStr) {
                        this.commands[cmd](parseInt(argStr));
                    } else {
                        this.commands[cmd]();
                    }
                }
                await this.sleep(this.stepDelay);
                eval(inc);
            }
            return;
        }
        // while loop: while (cond) moveForward();
        let whileMatch = line.match(/^while\s*\(([^\)]+)\)\s*(\w+)\s*\(([^)]*)\)\s*;?$/);
        if (whileMatch) {
            let [_, cond, cmd, argStr] = whileMatch;
            let guard = 0;
            while (this.evalExpr(cond) && guard++ < 1000) {
                if (this.commands[cmd]) {
                    if (argStr) {
                        this.commands[cmd](parseInt(argStr));
                    } else {
                        this.commands[cmd]();
                    }
                }
                await this.sleep(this.stepDelay);
            }
            return;
        }
        // if statement: if (cond) moveForward();
        let ifMatch = line.match(/^if\s*\(([^\)]+)\)\s*(\w+)\s*\(([^)]*)\)\s*;?$/);
        if (ifMatch) {
            let [_, cond, cmd, argStr] = ifMatch;
            if (this.evalExpr(cond)) {
                if (this.commands[cmd]) {
                    if (argStr) {
                        this.commands[cmd](parseInt(argStr));
                    } else {
                        this.commands[cmd]();
                    }
                }
                await this.sleep(this.stepDelay);
            }
            return;
        }
        // Assignment: let i = 0;
        let assignMatch = line.match(/^let\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*([^;]+);?$/);
        if (assignMatch) {
            let [_, v, val] = assignMatch;
            this.vars[v] = eval(val);
            return;
        }
        // Command: moveForward(); or rotate(90);
        const match = line.match(/^(\w+)\s*\(([^)]*)\)\s*;?$/);
        if (match) {
            const cmd = match[1];
            const argStr = match[2];
            if (this.commands[cmd]) {
                if (argStr) {
                    this.commands[cmd](parseInt(argStr));
                } else {
                    this.commands[cmd]();
                }
                await this.sleep(this.stepDelay);
            } else {
                console.error('Unknown command:', cmd);
            }
        } else {
            console.error('Invalid command syntax:', line);
        }
    }

    async run(code) {
        const lines = code.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        for (let line of lines) {
            await this.runLine(line);
        }
    }
}