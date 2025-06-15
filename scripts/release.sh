#!/bin/bash
set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get current version from package.json
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "${YELLOW}Current version: ${CURRENT_VERSION}${NC}"

# Prompt for version bump type
echo "Select version bump type:"
echo "1) Patch (0.0.x)"
echo "2) Minor (0.x.0)"
echo "3) Major (x.0.0)"
echo "4) Pre-release (x.x.x-beta.x)"
read -p "Enter your choice (1-4): " VERSION_CHOICE

case $VERSION_CHOICE in
  1) VERSION_CMD="patch" ;;
  2) VERSION_CMD="minor" ;;
  3) VERSION_CMD="major" ;;
  4) VERSION_CMD="prerelease --preid=beta" ;;
  *) echo "Invalid choice"; exit 1 ;;
esac

# Bump version
echo -e "\n${YELLOW}Bumping version...${NC}"
npm version $VERSION_CMD --no-git-tag-version
NEW_VERSION=$(node -p "require('./package.json').version")

# Create release branch
RELEASE_BRANCH="release/v${NEW_VERSION}"
echo -e "\n${YELLOW}Creating release branch ${RELEASE_BRANCH}...${NC}"
git checkout -b $RELEASE_BRANCH

# Update changelog
echo -e "\n${YELLOW}Updating changelog...${NC}"
npx standard-version --skip.tag --skip.commit

# Show changes
echo -e "\n${YELLOW}Changes to be committed:${NC}"
git status -s

# Confirm before proceeding
read -p "Review the changes above. Continue with release? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo -e "\n${YELLOW}Release cancelled. Cleaning up...${NC}"
  git checkout main
  git branch -D $RELEASE_BRANCH
  exit 1
fi

# Commit changes
echo -e "\n${YELLOW}Committing changes...${NC}"
git add .
git commit -m "chore(release): v${NEW_VERSION}"

# Create and push tag
echo -e "\n${YELLOW}Creating tag v${NEW_VERSION}...${NC}"
git tag -a "v${NEW_VERSION}" -m "Release v${NEW_VERSION}"

# Publish to npm
echo -e "\n${YELLOW}Publishing to npm...${NC}"
npm publish --tag beta

# Push to remote
echo -e "\n${YELLOW}Pushing changes to remote...${NC}"
git push -u origin $RELEASE_BRANCH
git push origin "v${NEW_VERSION}"

# Merge back to main
echo -e "\n${YELLOW}Merging to main...${NC}"
git checkout main
git merge --no-ff $RELEASE_BRANCH -m "Merge ${RELEASE_BRANCH} into main"
git push origin main

echo -e "\n${GREEN}🎉 Release v${NEW_VERSION} published successfully!${NC}"
echo -e "${GREEN}🔗 https://www.npmjs.com/package/y-webrtc-trystero/v/${NEW_VERSION}${NC}"

# Clean up
echo -e "\n${YELLOW}Cleaning up...${NC}"
git branch -d $RELEASE_BRANCH
git push origin --delete $RELEASE_BRANCH 2>/dev/null || true

echo -e "\n${GREEN}Done!${NC}"