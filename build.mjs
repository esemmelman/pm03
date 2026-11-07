import {mkdir,copyFile} from 'node:fs/promises';
await mkdir('dist',{recursive:true});
for(const file of ['index.html','style.css','contrast.css','app.js','tutorial.js','gantt.js','scheduler.js','dayflow-config.js','dayflow-live.js']) await copyFile(file,`dist/${file}`);

await mkdir('dist/vendor',{recursive:true});await copyFile('vendor/supabase.js','dist/vendor/supabase.js');
await copyFile('vendor/supabase-LICENSE.txt','dist/vendor/supabase-LICENSE.txt');
