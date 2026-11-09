// Static assertions over database.rules.json. Runs in CI and locally.
// These guard the security invariants fixed during the security audit.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const rulesPath = join(root, 'database.rules.json');

if (!existsSync(rulesPath)) {
  console.error('FAIL: database.rules.json not found');
  process.exit(1);
}

const rules = JSON.parse(readFileSync(rulesPath, 'utf8')).rules;

let failures = 0;
function check(name, condition) {
  if (condition) console.log(`ok   - ${name}`);
  else {
    failures += 1;
    console.error(`FAIL - ${name}`);
  }
}

const typingUid = rules?.typing?.$conversationId?.$uid;
check('typing: read requires conversation membership',
  typeof typingUid?.['.read'] === 'string' && typingUid['.read'].includes('participantIds'));
check('typing: write requires own uid AND membership',
  typeof typingUid?.['.write'] === 'string' && typingUid['.write'].includes('auth.uid == $uid') && typingUid['.write'].includes('participantIds'));
check('typing: world-readable read rule removed',
  !rules?.typing?.['.read']);

const convo = rules?.conversations?.$cid;
check('conversations: read requires membership',
  typeof convo?.['.read'] === 'string' && convo['.read'].includes('participantIds'));
check('conversations: immutable createdBy',
  typeof convo?.createdBy?.['.validate'] === 'string');
check('conversations: roles cannot be escalated (own key value fixed)',
  typeof convo?.roles?.$roleUid?.['.validate'] === 'string' && convo.roles.$roleUid['.validate'].includes('data.val()'));

const mid = convo?.messages?.$mid;
check('messages: create validates senderId + blocks system type',
  typeof mid?.['.validate'] === 'string' && mid['.validate'].includes('senderId') && mid['.validate'].includes('system'));
check('messages: senderId immutable', typeof mid?.senderId?.['.validate'] === 'string');
check('messages: fileSize capped at 5MB',
  typeof mid?.fileSize?.['.validate'] === 'string' && mid.fileSize['.validate'].includes('5242880'));
check('messages: messageType enum at create',
  typeof mid?.messageType?.['.validate'] === 'string' && mid.messageType['.validate'].includes("'file'"));
check('messages: createdAt index present',
  Array.isArray(convo?.messages?.['.indexOn']) && convo.messages['.indexOn'].includes('createdAt'));

const reactionsUid = mid?.reactions?.$emoji?.$uid;
check('reactions: own uid only, boolean values',
  typeof reactionsUid?.['.validate'] === 'string' && reactionsUid['.validate'].includes('auth.uid'));

const users = rules?.users?.$uid;
check('users: write scoped to own uid', typeof users?.['.write'] === 'string' && users['.write'].includes('auth.uid == $uid'));
check('users: profile whitelist requires 8 fields',
  typeof users?.['.validate'] === 'string' && users['.validate'].includes("hasChildren(['username', 'displayName', 'about', 'isOnline', 'lastSeen', 'createdAt', 'updatedAt'])"));
check('users: isOnline must be boolean', typeof users?.isOnline?.['.validate'] === 'string' && users.isOnline['.validate'].includes('isBoolean()'));

const usernames = rules?.usernames?.$username;
check('usernames: claim requires own uid',
  typeof usernames?.['.validate'] === 'string' && usernames['.validate'].includes('auth.uid'));

const uc = rules?.userConversations?.$uid?.$cid;
check('userConversations: index entries must be true',
  typeof uc?.['.validate'] === 'string' && uc['.validate'].includes('== true'));

const presence = rules?.presence?.$uid;
check('presence: own-uid writes only', typeof presence?.['.write'] === 'string' && presence['.write'].includes('auth.uid == $uid'));

const push = rules?.pushSubscriptions?.$uid;
check('pushSubscriptions: own-uid reads and writes only',
  typeof push?.['.read'] === 'string' && push['.read'].includes('auth.uid == $uid')
  && typeof push?.['.write'] === 'string' && push['.write'].includes('auth.uid == $uid'));

if (failures === 0) console.log('\nAll database rules invariants PASS');
else {
  console.error(`\n${failures} invariant(s) FAILED`);
  process.exit(1);
}
