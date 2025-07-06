const { createTransclusionStream } = require('../dist/index.js');
const fs = require('fs');
const path = require('path');

// Test all template variable types
async function testAllTypes() {
  const inputFile = path.join(__dirname, 'test-all-types.md');
  
  // Create test date objects
  const testDate1 = new Date('2025-07-05T10:30:00Z');
  const testDate2 = new Date('2025-07-06T15:45:00Z');
  
  // Create the transclusion stream with all variable types
  const stream = createTransclusionStream({
    basePath: __dirname,
    templateVariables: {
      // String values
      title: 'Test Document',
      author: 'Test Author',
      
      // Number values
      count: 42,
      price: 19.99,
      year: 2025,
      notANumber: NaN,
      infinity: Infinity,
      
      // Boolean values
      published: true,
      draft: false,
      active: true,
      
      // Null and undefined
      deletedBy: null,
      optional: undefined,
      // missingField is intentionally not defined
      
      // Date values
      createdDate: testDate1,
      modifiedDate: testDate2,
      customDate: new Date(),
      
      // Function values
      dynamicCount: () => Math.floor(Math.random() * 100),
      currentTime: () => new Date().toTimeString().split(' ')[0],
      randomId: () => Math.random().toString(36).substr(2, 9),
      throwsError: () => { throw new Error('Test error'); },
      
      // Edge cases
      objectValue: { key: 'value' },
      arrayValue: [1, 2, 3],
      symbolValue: Symbol('test')
    }
  });
  
  console.log('Testing all template variable types:\n');
  console.log('=' + '='.repeat(79));
  
  const input = fs.createReadStream(inputFile);
  
  input.pipe(stream).pipe(process.stdout);
  
  stream.on('end', () => {
    console.log('\n' + '=' + '='.repeat(79));
    console.log('\nTest complete!');
    
    // Also test the direct substitution function
    testDirectSubstitution();
  });
  
  stream.on('error', (err) => {
    console.error('Stream error:', err);
  });
}

// Test the direct substituteTemplateVariables function
function testDirectSubstitution() {
  console.log('\n\nTesting direct substitution with edge cases:');
  console.log('=' + '='.repeat(79));
  
  const { substituteTemplateVariables } = require('../dist/utils/templateVariables.js');
  
  // Test various edge cases
  const testCases = [
    {
      name: 'Empty string value',
      template: 'Empty: {{empty}}',
      vars: { empty: '' }
    },
    {
      name: 'Zero value',
      template: 'Zero: {{zero}}',
      vars: { zero: 0 }
    },
    {
      name: 'False value',
      template: 'False: {{false}}',
      vars: { false: false }
    },
    {
      name: 'Nested braces',
      template: 'Nested: {{{nested}}}',
      vars: { nested: 'value' }
    },
    {
      name: 'Multiple same variable',
      template: '{{name}} and {{name}} again',
      vars: { name: 'Bob' }
    },
    {
      name: 'Special characters in variable name',
      template: 'Var: {{user.name}} and {{user-id}}',
      vars: { 'user.name': 'Alice', 'user-id': '123' }
    }
  ];
  
  testCases.forEach(({ name, template, vars }) => {
    console.log(`\n${name}:`);
    console.log(`  Template: "${template}"`);
    console.log(`  Result:   "${substituteTemplateVariables(template, { variables: vars })}"`);
  });
  
  console.log('\n' + '=' + '='.repeat(79));
}

// Run the tests
testAllTypes().catch(console.error);