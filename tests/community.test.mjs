import test from 'node:test';
import assert from 'node:assert/strict';
import {inviteUrl} from '../lib/community.ts';

test('accepts only HTTPS invitation links from the intended community service',()=>{
  assert.equal(inviteUrl('https://chat.whatsapp.com/ABCDEFG','whatsapp'),'https://chat.whatsapp.com/ABCDEFG');
  assert.equal(inviteUrl('https://discord.gg/arena','discord'),'https://discord.gg/arena');
  assert.equal(inviteUrl('https://discord.com/invite/arena','discord'),'https://discord.com/invite/arena');
  for(const link of ['javascript:alert(1)','http://discord.gg/arena','https://discord.gg.evil.test/arena','https://user:pass@discord.gg/arena','https://chat.whatsapp.com.evil.test/join']){
    assert.equal(inviteUrl(link,'discord'),null);
    assert.equal(inviteUrl(link,'whatsapp'),null);
  }
});
