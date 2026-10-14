const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'..');
let html=fs.readFileSync(path.join(root,'index.html'),'utf8');
html=html.replace('<link rel="stylesheet" href="style.css">',()=>'<style>\n'+fs.readFileSync(path.join(root,'style.css'),'utf8')+'\n</style>');
for(const file of ['physics.js','renderer.js','charts.js','app.js'])
 html=html.replace('<script src="'+file+'"></script>',()=>'<script>\n'+fs.readFileSync(path.join(root,file),'utf8')+'\n</script>');
fs.writeFileSync(path.join(root,'atwood-lab.html'),html);
console.log('Built atwood-lab.html (offline, single file)');
