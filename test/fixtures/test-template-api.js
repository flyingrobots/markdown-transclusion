const { createTransclusionStream } = require('../dist/index.js');
const fs = require('fs');
const path = require('path');

// Example of using the API with function-based template variables
async function processTemplate() {
  const inputFile = path.join(__dirname, 'template.md');
  
  // Create the transclusion stream with template variables including functions
  const stream = createTransclusionStream({
    basePath: __dirname,
    templateVariables: {
      title: 'API Generated Document',
      author: 'API User',
      // Function that returns current date
      date: () => new Date().toISOString().split('T')[0],
      // Function that returns current time
      time: () => new Date().toTimeString().split(' ')[0],
      // Function that generates dynamic content
      content: () => `Generated at ${new Date().toISOString()}`
    }
  });
  
  // Process the template
  const input = fs.createReadStream(inputFile);
  
  console.log('Processing template with function-based variables:\n');
  
  input.pipe(stream).pipe(process.stdout);
  
  stream.on('end', () => {
    console.log('\n\nDone!');
  });
}

processTemplate().catch(console.error);