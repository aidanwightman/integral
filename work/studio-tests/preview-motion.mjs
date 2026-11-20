import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const code = fs.readFileSync('outputs/production-site/site-src/preview-motion.js', 'utf8');
let reduced = false;
const animations = [];
const updates = [];
const node = {
  animate(frames, options) {
    let resolve, reject;
    const finished = new Promise((yes, no) => { resolve = yes; reject = no; });
    const animation = {
      frames, options, finished, resolve, cancelled: false,
      cancel() { this.cancelled = true; reject(Error('cancelled')); }
    };
    animations.push(animation);
    return animation;
  }
};
const ctx = vm.createContext({matchMedia: () => ({matches: reduced})});
vm.runInContext(code, ctx);
const run = (name, animated = true) =>
  ctx.transitionPreview('preview', [node], () => updates.push(name), animated);

run('initial', false);
assert.equal(animations.length, 0);
run('finance');
run('people');
assert.deepEqual(updates, ['initial', 'finance', 'people']);
assert.equal(animations[0].cancelled, true);
assert.ok(animations[1].frames.every(frame => frame.opacity > 0 && !frame.transform));
animations[1].resolve();
await new Promise(resolve => setImmediate(resolve));
assert.equal(vm.runInContext('previewTransitions.size', ctx), 0);
run('operations');
reduced = true;
const count = animations.length;
run('sales');
assert.equal(animations.length, count);
assert.equal(animations.at(-1).cancelled, true);
assert.equal(updates.at(-1), 'sales');
console.log('PASS: immediate selection, interrupted reveal, settled cleanup, and reduced motion.');
