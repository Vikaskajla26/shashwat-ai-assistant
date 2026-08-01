import { chromium } from 'playwright';

async function diagnosePage() {
  console.log('Launching Playwright Chromium to inspect http://localhost:3000/...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleLogs = [];
  const pageErrors = [];

  page.on('console', (msg) => {
    consoleLogs.push(`[Console ${msg.type().toUpperCase()}] ${msg.text()}`);
  });

  page.on('pageerror', (err) => {
    pageErrors.push(`[PageError] ${err.stack || err.message}`);
  });

  try {
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 10000 });
  } catch (e) {
    console.log('Navigation warning:', e.message);
  }

  console.log('--- BROWSER CONSOLE LOGS ---');
  console.log(consoleLogs.join('\n') || '(No console logs)');

  console.log('--- UNCAUGHT PAGE ERRORS ---');
  console.log(pageErrors.join('\n') || '(No page errors)');

  const bodyHTML = await page.evaluate(() => document.getElementById('root')?.innerHTML);
  console.log('--- ROOT CONTAINER HTML LENGTH ---');
  console.log(bodyHTML ? bodyHTML.length : 0);

  await browser.close();
}

diagnosePage().catch(console.error);
