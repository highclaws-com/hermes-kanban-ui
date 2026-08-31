import { describe, expect, it } from 'vitest';
import { nextStatusForAction, statusLabel } from './status.js';
describe('status behavior',()=>{
 it('unblocks to ready',()=>expect(nextStatusForAction('blocked','continue')).toBe('ready'));
 it('approves review to done',()=>expect(nextStatusForAction('review','approve')).toBe('done'));
 it('has Chinese labels',()=>expect(statusLabel('running')).toBe('进行中'));
});