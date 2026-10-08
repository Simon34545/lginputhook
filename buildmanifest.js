const fs = require('node:fs');
const crypto = require('node:crypto');

const appinfo = JSON.parse(fs.readFileSync('appinfo.json', 'UTF-8'));
const manifest = JSON.parse(fs.readFileSync('manifest.json', 'UTF-8'));
const ipk = `${appinfo.id}_${appinfo.version}_all.ipk`;

const out = {
  id: appinfo.id,
  version: appinfo.version,
  type: appinfo.type,
  title: appinfo.title,
  
  appDescription: manifest.appDescription,
  iconUri: manifest.iconUri,
  sourceUrl: manifest.sourceUrl,
  rootRequired: manifest.rootRequired,
  
  ipkUrl: ipk,
  ipkHash: {sha256: crypto.createHash('sha256').update(fs.readFileSync(ipk)).digest('hex')}
}

fs.writeFileSync(`${appinfo.id}.manifest.json`, JSON.stringify(out));