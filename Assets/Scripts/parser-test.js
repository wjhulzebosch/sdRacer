/**
 * Test file for CarLang Parser
 * Demonstrates how to use the parser with various CarLang code examples
 */

// Example CarLang code to test
const testCode = `
// This is a comment
int x = 5;
string message = "Hello World";
double pi = 3.14159;

if (x > 3) {
    moveForward();
    rotate(90);
} else {
    moveBackward();
}

while (x > 0) {
    moveForward();
    x = x - 1;
}

for (int i = 0; i < 3; i = i + 1) {
    rotate(90);
    moveForward();
}

switch (x) {
    case 1:
        moveForward();
        break;
    case 2:
        rotate(90);
        break;
    default:
        moveBackward();
}

try {
    moveForward();
} catch (error) {
    rotate(180);
}

return;
`;

// Test the parser
function testParser() {
    const parser = new CarLangParser();
    const result = parser.parse(testCode);
    
    console.log('Parsing Result:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.errors.length > 0) {
        console.log('\nParsing Errors:');
        result.errors.forEach(error => console.log('- ' + error));
    } else {
        console.log('\n✅ Parsing completed successfully!');
    }
}

// Test individual components
function testTokenization() {
    const parser = new CarLangParser();
    const tokens = parser.tokenize('int x = 5; // comment');
    
    console.log('Tokenization Test:');
    console.log(tokens);
}

function testSimpleExpressions() {
    const parser = new CarLangParser();
    
    const expressions = [
        'x = 5;',
        'y = x + 3;',
        'z = (a + b) * 2;',
        'moveForward();',
        'rotate(90);'
    ];
    
    console.log('Expression Parsing Tests:');
    expressions.forEach(expr => {
        const result = parser.parse(expr);
        console.log(`\nExpression: ${expr}`);
        console.log('Result:', JSON.stringify(result, null, 2));
    });
}

// Run tests if this file is executed directly
if (typeof window !== 'undefined') {
    // Browser environment
    window.testParser = testParser;
    window.testTokenization = testTokenization;
    window.testSimpleExpressions = testSimpleExpressions;
} else {
    // Node.js environment
    testParser();
    testTokenization();
    testSimpleExpressions();
} 