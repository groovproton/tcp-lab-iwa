import fs from 'node:fs';
import crypto from 'node:crypto';

const [bundlePath, keyPath, packageDir] = process.argv.slice(2);
if (!bundlePath || !keyPath || !packageDir) throw new Error('usage: verify-v2.mjs BUNDLE KEY WBN_SIGN_PACKAGE_DIR');
const { SignedWebBundle, parsePemKey, WebBundleId, getRawPublicKey } =
  await import(`${packageDir}/lib/wbn-sign.js`);
const { IntegrityBlockSigner } = await import(`${packageDir}/lib/signers/integrity-block-signer.js`);
const { encode } = await import(`${packageDir}/../cborg/cborg.js`);
const { Bundle } = await import(`${packageDir}/../wbn/lib/wbn.js`);

const bytes = fs.readFileSync(bundlePath);
const signed = SignedWebBundle.fromBytes(bytes); // validates V2 and its 4 top-level CBOR elements
const key = parsePemKey(fs.readFileSync(keyPath, 'utf8'));
const signingPublicKey = crypto.createPublicKey(key);
const expectedId = new WebBundleId(key).serialize();
if (signed.getWebBundleId() !== expectedId) throw new Error('webBundleId does not match keys/tcp-lab-ed25519.pem');

const block = signed.getIntegrityBlock();
const signatures = block.getSignatureStack();
if (signatures.length < 1) throw new Error('V2 integrity block has no signatures');
const signer = new IntegrityBlockSigner(signed.pureWebBundle, block, []);
const stripped = block.toStrippedCbor();
const hash = signer.calcWebBundleHash();
const publicKeyPrefix = Buffer.from('302a300506032b6570032100', 'hex');
let verified = 0;
for (const entry of signatures) {
  const [attrName, rawKey] = Object.entries(entry.signatureAttributes)[0];
  if (attrName !== 'ed25519PublicKey' || rawKey.length !== 32) throw new Error('unsupported or malformed signature key');
  const attrCbor = encode({ [attrName]: rawKey });
  const data = signer.generateDataToBeSigned(hash, stripped, attrCbor);
  const publicKey = crypto.createPublicKey({ key: Buffer.concat([publicKeyPrefix, Buffer.from(rawKey)]), format: 'der', type: 'spki' });
  if (!crypto.verify(null, data, publicKey, entry.signature)) throw new Error('cryptographic signature verification failed');
  if (Buffer.from(rawKey).equals(Buffer.from(getRawPublicKey(signingPublicKey)))) verified++;
}
if (verified !== 1) throw new Error('the preserved signing identity is not present in the signature stack');
const webBundle = new Bundle(signed.pureWebBundle);
const expectedOrigin = `isolated-app://${expectedId}/`;
if (webBundle.version !== 'b2') throw new Error(`expected Web Bundle b2, got ${webBundle.version}`);
if (webBundle.primaryURL !== null) throw new Error(`Primary URL must be absent, got ${webBundle.primaryURL}`);
const urls = webBundle.urls;
if (urls.length === 0 || urls.some((url) => !url.startsWith(expectedOrigin))) {
  throw new Error(`bundled resources must use ${expectedOrigin}`);
}
const manifestURL = `${expectedOrigin}.well-known/manifest.webmanifest`;
if (!urls.includes(manifestURL)) throw new Error(`missing ${manifestURL}`);
const manifest = JSON.parse(new TextDecoder().decode(webBundle.getResponse(manifestURL).body));
const requiredIcons = new Map([
  ['/icons/icon-192.png', [192, 192]],
  ['/icons/icon-512.png', [512, 512]],
]);
if (!Array.isArray(manifest.icons)) throw new Error('manifest icons array is missing');
for (const [path, [width, height]] of requiredIcons) {
  const icon = manifest.icons.find((candidate) => candidate.src === path);
  if (!icon || icon.sizes !== `${width}x${height}` || icon.type !== 'image/png' || icon.purpose !== 'any') {
    throw new Error(`manifest icon entry is invalid: ${path}`);
  }
  const iconURL = `${expectedOrigin}${path.slice(1)}`;
  if (!urls.includes(iconURL)) throw new Error(`missing bundled icon ${iconURL}`);
  const body = webBundle.getResponse(iconURL).body;
  const pngSignature = '89504e470d0a1a0a';
  if (Buffer.from(body.subarray(0, 8)).toString('hex') !== pngSignature) throw new Error(`invalid PNG signature: ${path}`);
  const view = new DataView(body.buffer, body.byteOffset, body.byteLength);
  if (view.getUint32(16) !== width || view.getUint32(20) !== height) throw new Error(`invalid PNG dimensions: ${path}`);
}
console.log(`Verified V2 integrity block, ${signatures.length} signature(s), and webBundleId ${expectedId}`);
console.log(`Verified b2 metadata: no primary URL, ${urls.length} ${expectedOrigin} resource(s), manifest and icons present`);
