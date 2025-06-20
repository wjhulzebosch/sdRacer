const CarLangParser = require('./Assets/Scripts/parser.js');

const testCode = `// Example CarLang code
int x = 5;
string message = "Hello World";

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
}`;

const parser = new CarLangParser();
const result = parser.parse(testCode);

console.log('=== Parser Test Results ===');
console.log('Errors found:', result.errors.length);
if (result.errors.length > 0) {
    console.log('\nErrors:');
    result.errors.forEach(error => console.log(error));
} else {
    console.log('\n✅ Parsing successful!');
    console.log('AST structure created successfully.');
} 