#!/bin/bash

# Quick script to check Vercel deployment status
# Usage: ./check-vercel.sh

echo "🔍 Checking Vercel Deployment Status..."
echo ""

# Check if vercel CLI is installed
if command -v vercel &> /dev/null; then
    echo "✅ Vercel CLI found"
    echo ""
    echo "To check deployment status, run:"
    echo "  vercel ls"
    echo ""
    echo "To view latest deployment:"
    echo "  vercel inspect"
    echo ""
else
    echo "⚠️  Vercel CLI not found"
    echo ""
    echo "To install Vercel CLI:"
    echo "  npm install -g vercel"
    echo ""
fi

echo "📋 Git Status:"
git status --short
echo ""

echo "📦 Latest Commits:"
git log --oneline -3
echo ""

echo "🌐 Remote Repository:"
git remote get-url origin
echo ""

echo "🔗 Next Steps:"
echo "1. Go to https://vercel.com/dashboard"
echo "2. Find your 'printx-simple' project"
echo "3. Check the latest deployment status"
echo "4. Verify environment variable: NEXT_PUBLIC_APPS_SCRIPT_WEB_APP_URL"
echo "5. If needed, trigger a redeploy from the dashboard"
echo ""

echo "📝 Environment Variable to Set in Vercel:"
echo "   NEXT_PUBLIC_APPS_SCRIPT_WEB_APP_URL=https://script.google.com/macros/s/YOUR_ID/exec"
echo ""

