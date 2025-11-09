const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000';
const SCREENSHOT_DIR = path.join(__dirname, '../docs/images');

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function takeScreenshots() {
  console.log('Launching browser...');
  const browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 2, // High DPI for better quality
  });

  const page = await context.newPage();

  try {
    console.log('Waiting for server to be ready...');
    // Wait for server to be ready
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000); // Wait for animations

    // 1. Homepage
    console.log('Taking screenshot: Homepage...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000); // Wait for papers animation
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'homepage.png'),
      fullPage: true,
    });
    console.log('✓ Homepage screenshot saved');

    // 2. File Upload page (need to click "Get Started")
    console.log('Taking screenshot: File Upload...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Click "Get Started" button - try multiple selectors
    try {
      const getStartedButton = await page.locator('button:has-text("Get Started")').first();
      if (await getStartedButton.isVisible()) {
        await getStartedButton.click();
        await page.waitForTimeout(2000);
      }
    } catch (e) {
      console.log('Trying alternative method to navigate to upload...');
      // Try clicking any button with "Get Started" text
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const getStartedBtn = buttons.find(btn => btn.textContent?.includes('Get Started'));
        if (getStartedBtn) {
          getStartedBtn.click();
        }
      });
      await page.waitForTimeout(2000);
    }
    
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'file-upload.png'),
      fullPage: true,
    });
    console.log('✓ File Upload screenshot saved');

    // 3. Payment page - navigate through the flow with file upload
    console.log('Taking screenshot: Payment page...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Navigate to upload stage
    try {
      const getStartedBtn = await page.locator('button:has-text("Get Started")').first();
      if (await getStartedBtn.isVisible()) {
        await getStartedBtn.click();
        await page.waitForTimeout(2000);
      }
    } catch (e) {
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Get Started'));
        if (btn) btn.click();
      });
      await page.waitForTimeout(2000);
    }
    
    // Create a dummy PDF file and upload it
    try {
      // Create a simple test file
      const testFileContent = Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\nxref\n0 1\ntrailer\n<<\n/Root 1 0 R\n>>\n%%EOF');
      const testFilePath = path.join(__dirname, '../test-file.pdf');
      fs.writeFileSync(testFilePath, testFileContent);
      
      // Find file input and upload
      const fileInput = await page.locator('input[type="file"]').first();
      if (await fileInput.isVisible({ timeout: 5000 })) {
        await fileInput.setInputFiles(testFilePath);
        await page.waitForTimeout(2000);
        
        // Click "Proceed to Payment" button
        try {
          const proceedBtn = await page.locator('button:has-text("Proceed to Payment")').first();
          if (await proceedBtn.isVisible()) {
            await proceedBtn.click();
            await page.waitForTimeout(3000); // Wait for payment page to load
          }
        } catch (e) {
          console.log('Could not find Proceed to Payment button');
        }
      }
      
      // Clean up test file
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    } catch (e) {
      console.log('Could not upload file, taking screenshot of current state...');
    }
    
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'payment.png'),
      fullPage: true,
    });
    console.log('✓ Payment screenshot saved');

    // 4. Admin Dashboard
    console.log('Taking screenshot: Admin Dashboard...');
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'admin-dashboard.png'),
      fullPage: true,
    });
    console.log('✓ Admin Dashboard screenshot saved');

    // 5. Order Status page (using a sample order ID)
    console.log('Taking screenshot: Order Status...');
    // We'll use a sample order ID - this might show a "not found" message, but that's okay
    await page.goto(`${BASE_URL}/order/PX-sample-order-1234`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'order-status.png'),
      fullPage: true,
    });
    console.log('✓ Order Status screenshot saved');

    console.log('\n✅ All screenshots taken successfully!');
    console.log(`Screenshots saved to: ${SCREENSHOT_DIR}`);

  } catch (error) {
    console.error('Error taking screenshots:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

// Main execution
async function main() {
  console.log('📸 PrintX Screenshot Generator\n');
  console.log(`Target URL: ${BASE_URL}`);
  console.log(`Output directory: ${SCREENSHOT_DIR}\n`);
  console.log('Note: Make sure the development server is running (npm run dev)\n');

  await takeScreenshots();
}

main().catch(console.error);

