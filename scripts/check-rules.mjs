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
check('conversations: read requires membership (or non-exist)',
  typeof convo?.['.read'] === 'string' && convo['.read'].includes('participantIds') && convo['.read'].includes('!data.exists()'));
check('conversations: createdBy immutable',
  typeof convo?.createdBy?.['.validate'] === 'string');
check('conversations: write requires auth',
  typeof convo?.['.write'] === 'string' && convo['.write'].includes('auth != null'));

const mid = convo?.messages?.$mid;
check('messages: create validates senderId + blocks system type',
  typeof mid?.['.validate'] === 'string' && mid['.validate'].includes('senderId') && mid['.validate'].includes('system'));
check('messages: senderId required', typeof mid?.senderId?.['.validate'] === 'string');
check('messages: fileSize capped at 10MB',
  typeof mid?.fileSize?.['.validate'] === 'string' && mid.fileSize['.validate'].includes('10485760'));
check('messages: messageType enum includes call',
  typeof mid?.messageType?.['.validate'] === 'string' && mid.messageType['.validate'].includes("'call'"));
check('messages: createdAt index present',
  Array.isArray(convo?.messages?.['.indexOn']) && convo.messages['.indexOn'].includes('createdAt'));

const reactionsUid = mid?.reactions?.$emoji?.$uid;
check('reactions: own uid only',
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

const calls = rules?.calls?.$conversationId?.$callId;
check('calls: read requires conversation membership',
  typeof calls?.['.read'] === 'string' && calls['.read'].includes('participantIds'));
check('calls: write requires conversation membership',
  typeof calls?.['.write'] === 'string' && calls['.write'].includes('participantIds'));
check('calls: type enum (voice/video)',
  typeof calls?.type?.['.validate'] === 'string' && calls.type['.validate'].includes("'video'"));
check('calls: status enum',
  typeof calls?.status?.['.validate'] === 'string' && calls.status['.validate'].includes("'ringing'"));

if (failures === 0) console.log('\nAll database rules invariants PASS');
else {
  console.error(`\n${failures} invariant(s) FAILED`);
  process.exit(1);
}
