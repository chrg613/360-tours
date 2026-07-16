const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto('http://localhost:3000/tours/create');
    
    // Wait for file input
    const input = await page.waitForSelector('input[type="file"]', { state: 'attached' });
    
    // Get first 3 images from the folder
    const dir = '/Users/chiragsingh/Desktop/360-tours/drive-download-20260713T111342Z-2-001';
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.jpg')).slice(0, 9).map(f => path.join(dir, f));
    
    await input.setInputFiles(files);
    
    // Wait for Next button and click
    await page.click('button:has-text("Next")');
    
    // Wait for Generate Tour button and click
    await page.click('button:has-text("Generate Tour")');
    
    console.log('Started generation...');
    
    // Take a screenshot of the processing state initially
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'processing_start.png' });
    
    // Now wait for Finalizing text
    await page.waitForSelector('text=Finalizing your virtual tour', { timeout: 120000 });
    console.log('Hit finalizing stage!');
    await page.screenshot({ path: 'processing_finalizing.png' });
    
    // Wait for completion (it should navigate away to the editor)
    // Wait until URL changes to /tours/edit or something
    await page.waitForFunction(() => window.location.href.includes('/tours/'), { timeout: 30000 });
    console.log('Completed and navigated!');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'processing_end.png' });
    
  } catch (err) {
    console.error(err);
    await page.screenshot({ path: 'processing_error.png' });
  } finally {
    await browser.close();
  }
})();
