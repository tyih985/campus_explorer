#!/usr/bin/env node
// scripts/postinstall.js
// Cross-platform: try to run git commands, but fail silently if not available or not a repo.
const { execSync } = require('child_process');

try {
	// check if we're inside a git work-tree
	execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });
	// set hooks path if the check passed
	execSync('git config core.hooksPath .githooks', { stdio: 'ignore' });
} catch (e) {
	// ignore any error (no git, not a git repo, etc.)
}
