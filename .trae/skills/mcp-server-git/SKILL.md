---
name: "mcp-server-git"
description: "Provides Git version control capabilities. Invoke when user asks to perform git operations like commit, push, pull, status, or log."
---

# Git Version Control Skill

This skill provides comprehensive Git capabilities to manage the repository.

## Capabilities

- Initialize repositories
- Stage and commit changes
- Push and pull from remote repositories
- View status and logs
- Handle branches and merges

## Best Practices

1. **Always check status first**: Before committing, run `git status` to verify what will be committed.
2. **Atomic commits**: Group related changes into single commits with descriptive messages.
3. **Safety checks**:
   - Verify remote URL before pushing (`git remote -v`).
   - Avoid force pushing (`-f`) unless explicitly requested and confirmed safe.
4. **Error handling**: If a git command fails, analyze the error message and propose a fix.

## Common Commands

- **Status**: `git status`
- **Add**: `git add .` or `git add <file>`
- **Commit**: `git commit -m "message"`
- **Log**: `git log --oneline -n 10`
- **Push**: `git push origin <branch>`
- **Pull**: `git pull origin <branch>`

## Workflow Example

1. Check current state: `git status`
2. Add changes: `git add .`
3. Commit: `git commit -m "feat: implement user login"`
4. Push: `git push origin main`
