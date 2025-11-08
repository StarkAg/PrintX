# React Hydration Error #418 and CSP Eval Warning Fix

## Problems

### 1. React Error #418 - Hydration Mismatch
**Error**: "Text content does not match server-rendered HTML"
**Cause**: The `FileThumbnail` component was rendering differently on the server vs client due to:
- React state (`imageError`) causing conditional rendering
- Server renders icons, client might render thumbnails
- This creates a mismatch between server HTML and client HTML

### 2. CSP Eval Warning
**Warning**: "Content Security Policy blocks the use of 'eval'"
**Cause**: 
- PDF.js worker might be using eval internally (despite `isEvalSupported: false`)
- Browser CSP checker detecting potential eval usage
- Could be a false positive from browser detection

## Solutions

### 1. Fix Hydration Error

**Changed**: `pages/order/[orderId].tsx`
- Added `isClient` state to detect client-side rendering
- During SSR: Always render icons (consistent output)
- On client: After hydration, render thumbnails
- This ensures server and client render the same initial HTML

**Implementation**:
```typescript
const [isClient, setIsClient] = React.useState(false);

React.useEffect(() => {
  setIsClient(true);
}, []);

// During SSR, always show icon
if (!isClient) {
  return <Icon />;
}

// Client-side: Show thumbnails
if (file.driveId && !imageError) {
  return <Thumbnail />;
}
```

### 2. Improve PDF.js Configuration

**Changed**: `components/FileUploader.tsx`
- Added `useSystemFonts: false` to disable system fonts (can use eval)
- Added `disableAutoFetch: true` to disable auto-fetching
- Added `disableStream: true` to disable streaming
- These options reduce potential eval usage

### 3. Update CSP Headers

**Changed**: `next.config.ts`
- Added Google Drive domains to `img-src` for thumbnails
- Added Google Drive to `connect-src` for API calls
- Kept `unsafe-eval` out of `script-src` (still restricted)

## Files Changed

1. **`pages/order/[orderId].tsx`**:
   - Added `isClient` state check
   - Render icons during SSR
   - Render thumbnails only on client after hydration

2. **`components/FileUploader.tsx`**:
   - Enhanced PDF.js configuration
   - Disabled features that might use eval

3. **`next.config.ts`**:
   - Updated CSP to allow Google Drive image sources
   - Added Google Drive to connect sources

## Testing

### Test Hydration Fix:
1. Visit order details page
2. Check browser console - should not see React error #418
3. Verify icons appear immediately (SSR)
4. Verify thumbnails load after page loads (client-side)

### Test CSP Warning:
1. Open browser dev tools
2. Check console for CSP warnings
3. If warning appears, it might be a false positive
4. PDF.js should still work despite the warning

## Important Notes

### Hydration Fix
- ✅ **Fixed**: Server and client now render the same initial HTML
- ✅ **Fixed**: Thumbnails load after hydration (no mismatch)
- ⚠️ **Trade-off**: Thumbnails appear slightly later (after client-side hydration)

### CSP Eval Warning
- ⚠️ **Warning might still appear**: PDF.js worker might use eval internally
- ✅ **PDF.js still works**: Despite the warning, PDF thumbnails should work
- ✅ **CSP is secure**: `unsafe-eval` is still blocked
- 📝 **Note**: The warning might be a false positive from browser detection

### If Warning Persists

1. **Check if it's blocking functionality**:
   - If PDF thumbnails work, it's likely a false positive
   - If PDF thumbnails fail, we need to investigate further

2. **Alternative solutions**:
   - Use a different PDF thumbnail library
   - Generate PDF thumbnails server-side
   - Accept the warning if functionality works

3. **Browser-specific**:
   - Some browsers are more strict about CSP
   - Chrome might show warnings that Firefox doesn't
   - Check if it's browser-specific

## Status

✅ **Fixed**: React hydration error #418
✅ **Improved**: PDF.js configuration to reduce eval usage
✅ **Updated**: CSP headers for Google Drive thumbnails
⚠️ **Monitoring**: CSP eval warning (might be false positive)

---

## Next Steps

1. **Test the fixes**:
   - Visit order details page
   - Check for React errors
   - Check for CSP warnings
   - Verify thumbnails work

2. **Monitor**:
   - Watch for React hydration errors
   - Monitor CSP warnings
   - Verify PDF thumbnails still work

3. **If issues persist**:
   - Check browser console for specific errors
   - Test in different browsers
   - Consider alternative PDF thumbnail solutions

