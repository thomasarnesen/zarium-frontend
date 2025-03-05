const fs = require('fs');
const path = require('path');

// Function to search for text in files
function searchInFiles(dir, searchText, extensions) {
  const results = [];
  
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // If it's a directory, recursively search it
      results.push(...searchInFiles(filePath, searchText, extensions));
    } else {
      // If it's a file with the right extension
      if (extensions.includes(path.extname(file).toLowerCase())) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        if (content.includes(searchText)) {
          results.push({
            file: filePath,
            line: content.split('\n').findIndex(line => line.includes(searchText)) + 1
          });
        }
      }
    }
  }
  
  return results;
}

// Search for bg-background in all JS, JSX, TS, TSX, and CSS files
const srcDir = path.join(__dirname, 'src');
const searchResults = searchInFiles(srcDir, 'bg-background', ['.js', '.jsx', '.ts', '.tsx', '.css']);

console.log('Files containing "bg-background":');
if (searchResults.length === 0) {
  console.log('No matches found.');
} else {
  searchResults.forEach(result => {
    console.log(`${result.file} (line ${result.line})`);
  });
}

// Search for text-background as well
const textResults = searchInFiles(srcDir, 'text-background', ['.js', '.jsx', '.ts', '.tsx', '.css']);

console.log('\nFiles containing "text-background":');
if (textResults.length === 0) {
  console.log('No matches found.');
} else {
  textResults.forEach(result => {
    console.log(`${result.file} (line ${result.line})`);
  });
}
