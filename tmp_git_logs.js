const { execSync } = require('child_process');
const commits = ['c08b1f1', '0854cba', '3732d59', '0ad43dc'];
const out = commits.map(c => {
  try {
    return `${c}:\n${execSync(`git log --format="%B" -n 1 ${c}`).toString().trim()}`;
  } catch (e) {
    return `${c}: Error fetching log`;
  }
});
require('fs').writeFileSync('tmp_git_logs.txt', out.join('\n\n'));
console.log('Logs written.');
