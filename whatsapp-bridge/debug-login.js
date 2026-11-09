// Headless reproduction of the login-flow errors against the live site.
const puppeteer = require('puppeteer');

const URL = process.argv[2] || 'https://allxchat-12a8b.web.app/login';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();

  const logs = [];
  page.on('console', (msg) => {
    const text = msg.text();
    if (/error|warn|CSP|firebase|auth/i.test(text)) logs.push(`[console.${msg.type()}] ${text}`);
  });
  page.on('pageerror', (err) => logs.push(`[pageerror] ${err.message}`));
  page.on('requestfailed', (req) => {
    logs.push(`[requestfailed] ${req.url()} :: ${(req.failure() || {}).errorText}`);
  });
  page.on('response', (res) => {
    const url = res.url();
    if (/identitytoolkit|securetoken|firebase|googleapis/i.test(url) && res.status() >= 400) {
      logs.push(`[http ${res.status()}] ${url}`);
    }
  });

  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 4000));

  const title = await page.evaluate(() => document.title);
  const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 400));

  console.log('PAGE TITLE:', title);
  console.log('PAGE BODY:', bodyText.replace(/\s+/g, ' ').slice(0, 300));

  const inputs = await page.$$eval('input', (els) =>
    els.map((el) => ({ type: el.type, name: el.name || el.placeholder || el.id })),
  );
  console.log('INPUTS:', JSON.stringify(inputs));

  const email = 'bridge@allxchat.local';
  const password = 'BridgeTmp123!';
  if (inputs.some((i) => i.type === 'email')) {
    await page.type('input[type=email]', email, { delay: 5 });
    await page.type('input[type=password]', password, { delay: 5 });
    const buttons = await page.$$('button');
    for (const btn of buttons) {
      const text = await btn.evaluate((b) => b.textContent || '');
      if (/sign in|log in/i.test(text)) {
        await btn.click();
        console.log('clicked submit:', text.trim());
        break;
      }
    }
    await new Promise((r) => setTimeout(r, 8000));
  }

  console.log('AFTER SUBMIT BODY:', (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(0, 600));
  console.log('URL:', page.url());
  console.log('--- LOGS ---');
  console.log(logs.join('\n') || '(no interesting logs)');

  await browser.close();
})().catch((e) => {
  console.error('SCRIPT ERROR:', e.message);
  process.exit(1);
});
