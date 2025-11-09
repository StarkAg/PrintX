# Website Screenshots

This directory contains screenshots of the PrintX website for display in the main README.

## Required Screenshots

Please add the following screenshots to this directory:

1. **homepage.png** - Home page with hero section and animated background
2. **file-upload.png** - File upload page with drag-and-drop interface
3. **payment.png** - Payment page with UPI QR code
4. **admin-dashboard.png** - Admin dashboard with orders and statistics
5. **order-status.png** - Order confirmation/status page

## How to Take Screenshots

### Option 1: Using Browser Developer Tools
1. Open your website in a browser (local or deployed)
2. Open Developer Tools (F12 or Cmd+Option+I)
3. Use the device toolbar to set a responsive viewport (1920x1080 recommended)
4. Take a screenshot using:
   - **macOS**: Cmd+Shift+4, then select the area
   - **Windows**: Windows+Shift+S
   - **Browser**: Use browser extensions or screenshot tools

### Option 2: Using Online Tools
- Use tools like [Screely](https://www.screely.com/) for styled screenshots
- Use [CleanShot](https://cleanshot.com/) for macOS
- Use browser extensions like "Awesome Screenshot"

### Option 3: Using Command Line (macOS)
```bash
# Take screenshot of entire screen
screencapture -x docs/images/homepage.png

# Or use browser automation tools
```

## Image Requirements

- **Format**: PNG or JPG
- **Size**: Recommended 1920x1080 or larger
- **Quality**: High resolution for clear display
- **File size**: Keep under 1MB per image for GitHub

## Alternative: Using External Image Hosting

If you prefer to host images externally, you can:

1. Upload images to [Imgur](https://imgur.com/)
2. Upload to [GitHub Gist](https://gist.github.com/) as image files
3. Use your own image hosting service

Then update the README.md image paths to use the full URL instead of relative paths.

## Updating README

After adding images, commit them to git:

```bash
git add docs/images/*.png
git commit -m "Add website screenshots"
git push
```

The images will automatically appear in the README on GitHub.

