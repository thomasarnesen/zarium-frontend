const fs = require('fs');
const path = require('path');

// Function to replace text in files
function replaceInFiles(dir, searchText, replaceText, extensions) {
  const files = fs.readdirSync(dir);
  let replacementCount = 0;
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // If it's a directory, recursively search it
      replacementCount += replaceInFiles(filePath, searchText, replaceText, extensions);
    } else {
      // If it's a file with the right extension
      if (extensions.includes(path.extname(file).toLowerCase())) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        if (content.includes(searchText)) {
          const newContent = content.replace(new RegExp(searchText, 'g'), replaceText);
          fs.writeFileSync(filePath, newContent);
          
          const count = (content.match(new RegExp(searchText, 'g')) || []).length;
          replacementCount += count;
          console.log(`Replaced ${count} occurrences in ${filePath}`);
        }
      }
    }
  }
  
  return replacementCount;
}

// Replace all occurrences
const srcDir = path.join(__dirname, 'src');
const replacements = [
  { search: 'bg-background', replace: 'bg-background-color' },
  { search: 'text-background', replace: 'text-background-color' },
  { search: 'text-foreground', replace: 'text-foreground-color' }
];

let totalReplacements = 0;

replacements.forEach(({ search, replace }) => {
  console.log(`\nReplacing "${search}" with "${replace}"...`);
  const count = replaceInFiles(
    srcDir, 
    search, 
    replace, 
    ['.js', '.jsx', '.ts', '.tsx', '.css']
  );
  console.log(`Total: ${count} replacements made for "${search}"`);
  totalReplacements += count;
});

console.log(`\nTotal replacements across all patterns: ${totalReplacements}`);
