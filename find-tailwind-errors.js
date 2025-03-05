const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// First, let's create a temporary CSS file that will help us identify the issue
const tempCssContent = `
@tailwind base;
@tailwind components;
@tailwind utilities;

.test-bg-background { @apply bg-background; }
.test-text-foreground { @apply text-foreground; }
.test-bg-background-color { @apply bg-background-color; }
.test-text-foreground-color { @apply text-foreground-color; }
`;

try {
  // Create a temp file
  fs.writeFileSync('temp-test.css', tempCssContent, 'utf8');
  
  // Try to process it with tailwind CLI
  console.log('Testing Tailwind classes...');
  try {
    execSync('npx tailwindcss -i temp-test.css -o temp-output.css', { stdio: 'inherit' });
    console.log('Success! No errors found in the test file.');
  } catch (e) {
    console.log('Found Tailwind error in test file. This indicates which classes are problematic.');
  }

  // Now let's find all uses of potentially problematic classes in the codebase
  console.log('\nSearching for potential class issues in your codebase...');
  
  const problematicPatterns = [
    'bg-background', 
    'text-foreground',
    'border-border',
    'ring-ring'
  ];
  
  function searchFiles(dir, patterns, extensions) {
    const results = [];
    
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory() && file !== 'node_modules' && file !== 'dist') {
        results.push(...searchFiles(filePath, patterns, extensions));
      } else if (extensions.includes(path.extname(file).toLowerCase())) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        for (const pattern of patterns) {
          if (content.includes(pattern)) {
            results.push({
              file: filePath,
              pattern,
              line: content.split('\n').findIndex(line => line.includes(pattern)) + 1
            });
          }
        }
      }
    }
    
    return results;
  }
  
  const results = searchFiles(path.join(__dirname, 'src'), problematicPatterns, ['.js', '.jsx', '.ts', '.tsx', '.css']);
  
  if (results.length === 0) {
    console.log('No problematic class usage found.');
  } else {
    console.log('\nPotentially problematic class usage found:');
    results.forEach(result => {
      console.log(`• ${result.file} (line ${result.line}): ${result.pattern}`);
    });
    
    console.log('\nRecommended fixes:');
    console.log('1. Replace "bg-background" with "bg-background-color"');
    console.log('2. Replace "text-foreground" with "text-foreground-color"');
    console.log('3. Make sure tailwind.config.js has the proper color definitions');
  }
  
} catch (err) {
  console.error('Error:', err);
} finally {
  // Clean up
  try { 
    fs.unlinkSync('temp-test.css');
    if (fs.existsSync('temp-output.css')) {
      fs.unlinkSync('temp-output.css');
    }
  } catch (e) {
    // Ignore cleanup errors
  }
}
