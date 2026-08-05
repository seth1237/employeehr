#!/bin/bash

echo "🚀 Installing AI Meeting System Dependencies..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Backend dependencies
echo -e "${BLUE}📦 Installing backend dependencies...${NC}"
cd server
pnpm install openai
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Backend dependencies installed${NC}"
else
    echo "❌ Failed to install backend dependencies"
    exit 1
fi
cd ..

# Frontend dependencies
echo ""
echo -e "${BLUE}📦 Installing frontend dependencies...${NC}"
pnpm install date-fns
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
else
    echo "❌ Failed to install frontend dependencies"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ All dependencies installed successfully!${NC}"
echo ""
echo "📝 Next steps:"
echo "1. Add your OpenAI API key to server/.env:"
echo "   OPENAI_API_KEY=your-key-here"
echo ""
echo "2. Start the backend:"
echo "   cd server && pnpm dev"
echo ""
echo "3. Start the frontend (in another terminal):"
echo "   pnpm dev"
echo ""
echo "4. Navigate to: http://localhost:3000/employee/meetings"
echo ""
echo "📚 Documentation:"
echo "   - Full docs: DOCUMENTATIONS/AI_MEETING_SYSTEM.md"
echo "   - Quick start: DOCUMENTATIONS/MEETING_SETUP_GUIDE.md"
echo "   - Summary: IMPLEMENTATION_SUMMARY.md"
echo ""
echo "🎉 Ready to use AI-powered meetings!"
