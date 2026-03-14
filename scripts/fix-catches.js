const fs = require('fs');
const path = require('path');

const targetDirs = ['app', 'components', 'lib', 'pages', 'services', 'utils', 'features'];
const root = 'f:/bimasakhi-next';

let count = 0;

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const f of files) {
        const fullPath = path.join(dir, f);
        if (fs.statSync(fullPath).isDirectory()) {
            if (!f.startsWith('.') && f !== 'node_modules') {
                processDir(fullPath);
            }
        } else if (f.endsWith('.js') || f.endsWith('.jsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            // Match catch (e) { } or catch (error) { } or catch(err) {} 
            // Avoid matching those containing console.error or throw
            let original = content;
            
            content = content.replace(/catch\s*\(\s*([a-zA-Z0-9_]+)\s*\)\s*{\s*}(?!\s*console\.error)/g, 
                'catch ($1) {\n            console.error("Runtime Error:", $1);\n        }');

            // Also match blocks containing only comments
            content = content.replace(/catch\s*\(\s*([a-zA-Z0-9_]+)\s*\)\s*{\s*\/\*.*?\*\/\s*}/g, 
                'catch ($1) {\n            console.error("Runtime Error:", $1);\n        }');

            if (content !== original) {
                fs.writeFileSync(fullPath, content, 'utf8');
                count++;
                console.log('Modified:', fullPath);
            }
        }
    }
}

targetDirs.forEach(d => processDir(path.join(root, d)));
console.log(`Updated ${count} files.`);
