import fs from 'node:fs/promises';
import readline from 'node:readline';
// Terminal-only secret entry. Never pass the key on a command line or into chat.
if(!process.stdin.isTTY)throw Error('Run this in your own interactive terminal.');
const rl=readline.createInterface({input:process.stdin,output:process.stdout});
process.stdout.write('Enter Sarvam API key (hidden): ');
rl._writeToOutput=()=>{};
const key=await new Promise(resolve=>rl.question('',resolve));
rl.close();process.stdout.write('\n');
if(typeof key!=='string'||key.trim().length<10||/[\r\n]/.test(key))throw Error('Invalid key.');
await fs.writeFile('.dev.vars',`SARVAM_API_KEY=${JSON.stringify(key.trim())}\n`,{mode:0o600});
await fs.chmod('.dev.vars',0o600);
process.stdout.write('Saved server-only local secret to ignored .dev.vars. Restart the preview. Do not commit it.\n');
