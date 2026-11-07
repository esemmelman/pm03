import {createHash} from 'node:crypto';
import {mkdir,copyFile,readFile,writeFile} from 'node:fs/promises';
await mkdir('dist',{recursive:true});
for(const file of ['index.html','style.css','contrast.css','app.js','tutorial.js','gantt.js','scheduler.js','dayflow-config.js','dayflow-live.js','dayflow-editor.js','workspace-sync.js','capture.js','platform.js','android-home.js']) await copyFile(file,`dist/${file}`);

await mkdir('dist/vendor',{recursive:true});await copyFile('vendor/supabase.js','dist/vendor/supabase.js');
await copyFile('vendor/supabase-LICENSE.txt','dist/vendor/supabase-LICENSE.txt');

for(const file of ['chrono-en.min.js','chrono-LICENSE.txt'])await copyFile('vendor/'+file,'dist/vendor/'+file);

// Changed assets get new URLs so browsers cannot reuse a previous release's scripts.
const html=await readFile('index.html','utf8');
const assets=[...html.matchAll(/(?:src|href)="([^"?#]+\.(?:js|css))"/g)];
let published=html;
for(const [,asset] of assets){const hash=createHash('sha256').update(await readFile(asset)).digest('hex').slice(0,12);published=published.replaceAll('"'+asset+'"','"'+asset+'?v='+hash+'"')}
await writeFile('dist/index.html',published);
