import { chromium } from 'playwright';

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
  
  console.log('Navigating to localhost:5173...');
  await page.goto('http://localhost:5173/');
  
  await page.waitForTimeout(3000);
  
  console.log('Current URL:', page.url());
  
  await browser.close();
}

run().catch(console.error);
