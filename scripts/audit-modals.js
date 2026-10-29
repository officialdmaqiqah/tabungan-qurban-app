const fs = require('fs');
const path = require('path');

function searchFiles(dir) {
  let results = [];
  for (const item of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, item);
    if (item === 'node_modules' || item === '.next' || item === '.git') continue;
    if (fs.statSync(fullPath).isDirectory()) {
      results = results.concat(searchFiles(fullPath));
    } else if (item.endsWith('.tsx') || item.endsWith('.ts')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        if (
          line.includes('fixed inset-0') ||
          line.includes('toast.') ||
          line.includes('Toaster') ||
          line.includes('window.confirm') ||
          line.includes('alert(') ||
          (line.includes('isOpen') && line.includes('useState')) ||
          line.includes('z-50')
        ) {
          results.push({ file: fullPath, lineNum: index + 1, line: line.trim() });
        }
      });
    }
  }
  return results;
}

const found = searchFiles('.');
console.log('Total matches:', found.length);
const fileMap = {};
found.forEach(item => {
  if (!fileMap[item.file]) fileMap[item.file] = [];
  fileMap[item.file].push(item);
});

for (const [file, items] of Object.entries(fileMap)) {
  console.log(`\n=== ${file} (${items.length} occurrences) ===`);
  items.slice(0, 10).forEach(i => console.log(`  Line ${i.lineNum}: ${i.line.slice(0, 100)}`));
}
