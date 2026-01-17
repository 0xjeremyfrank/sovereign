# Sovereign

Blockchain-native logic puzzle game. On-chain verification via Chainlink VRF and commit-reveal.

## Structure

- `apps/web` — Next.js 14 (App Router) frontend with Wagmi
- `contracts/` — Solidity smart contracts (Foundry)
- `packages/engine` — Puzzle validation logic
- `packages/onchain` — ABIs and contract addresses

## Setup

```bash
nvm use                      # Node 20 (see .nvmrc)
corepack enable && yarn      # Install dependencies
```

## Commands

```bash
yarn dev                     # Start dev server
yarn build                   # Build all
yarn test                    # Test all
yarn workspace web test      # Web unit tests
forge test                   # Contract tests (from contracts/)
```

## Code Style

- TypeScript strict mode, prefer `interface` over `type`
- Functional components only, custom hooks prefixed with `use`
- Named exports, no default exports
- 2-space indent, single quotes, trailing commas
- kebab-case files, PascalCase components
- Import order: external → @sovereign/* → relative
- Use `@/` alias for web app imports
- Prefer functional style code over object oriented, declarative over imperative

## Patterns

- Add `'use client'` directive for interactive components
- Use `useConnection()` for wallet state, `useReadContract()`/`useWriteContract()` for contracts
- Import ABIs from `@sovereign/onchain`
- Shared utilities go in `@/lib/utils`

## Testing

- Vitest for web (`*.test.tsx`)
- Mock wagmi and next/navigation in `vitest.setup.ts`
- Foundry for contracts

## Git Workflow

- Branch naming: `feat/`, `fix/`, `chore/`
- Commit messages: conventional commits (`feat:`, `fix:`, `chore:`, `docs:`)
- PRs should reference related issues (`Closes #123`)

## Agent-Driven Development

This project uses an AI-assisted development workflow with GitHub as the source of truth for project management.

### GitHub Structure

**Milestones** (sequential phases):
- M1: Testnet MVP — Core gameplay loop on Sepolia
- M2: Polish & UX — Mobile, accessibility, animations
- M3: Production Deployment — Multi-chain support, Base mainnet
- M4: Automation & Indexing — Chainlink Automation, The Graph

**Labels** (categorization):
- `ui`, `onchain`, `logic` — Component area
- `enhancement`, `bug`, `documentation` — Issue type
- `P1`, `P2`, `P3` — Priority level
- `good first issue` — Suitable for newcomers

**Project Board**: Track issue status (Todo → In Progress → Done)

### Workflow for AI Agents

1. **Start of session**: Review current milestone and open issues
   ```bash
   gh issue list --milestone "M1: Testnet MVP" --state open
   gh project item-list 2 --owner @me
   ```

2. **Pick work**: Select an issue from current milestone, assign yourself
   ```bash
   gh issue edit <number> --add-assignee @me
   ```

3. **Create branch**: Branch from main with appropriate prefix
   ```bash
   git checkout -b feat/issue-description
   ```

4. **Implement**: Follow code style, write tests, keep changes focused

5. **Commit**: Use conventional commits, reference issue
   ```bash
   git commit -m "feat(web): implement reveal solution UI

   Closes #36"
   ```

6. **PR creation**: Link to issue, describe changes, request review
   ```bash
   gh pr create --title "feat(web): implement reveal solution UI" \
     --body "Closes #36\n\n## Summary\n..." --base main
   ```

7. **Update project board**: Move issue to appropriate column

### Issue Management Commands

```bash
# List open issues by milestone
gh issue list --milestone "M1: Testnet MVP" --state open

# List all milestones
gh api repos/{owner}/{repo}/milestones --jq '.[] | "\(.number): \(.title) (\(.open_issues) open)"'

# Create new issue
gh issue create --title "Title" --body "Description" --label "ui" --milestone "M1: Testnet MVP"

# Update issue status on project board
gh project item-edit --id <item-id> --project-id <project-id> --field-id <status-field-id> --single-select-option-id <option-id>

# View project board items
gh project item-list 2 --owner @me --format json | jq '.items[] | {title, status}'
```

### Issue Relationships

Use GitHub's native sub-issues feature to track dependencies (blocks/blocked by).

**Relationship Types**:
- **Parent/Child (Sub-issues)**: Epic → tasks breakdown
- **Blocks/Blocked by**: Work that must complete before another can start

**Managing Relationships**:

```bash
# Add a sub-issue (child) to a parent issue
gh api graphql -f query='
  mutation {
    addSubIssue(input: {
      issueId: "<PARENT_NODE_ID>"
      subIssueId: "<CHILD_NODE_ID>"
    }) {
      issue { number title }
      subIssue { number title }
    }
  }'

# Remove a sub-issue from parent
gh api graphql -f query='
  mutation {
    removeSubIssue(input: {
      issueId: "<PARENT_NODE_ID>"
      subIssueId: "<CHILD_NODE_ID>"
    }) {
      issue { number title }
    }
  }'

# Get issue node ID
gh api graphql -f query='
  query { repository(owner: "0xjeremyfrank", name: "sovereign") {
    issue(number: <NUM>) { id }
  }}'

# View issue with relationships
gh api graphql -f query='
  query { repository(owner: "0xjeremyfrank", name: "sovereign") {
    issue(number: <NUM>) {
      title
      parent { number title }
      subIssues(first: 20) { nodes { number title state } }
    }
  }}'

# List all blocked issues
gh issue list --label "blocked" --state open
```

**Workflow for Dependencies**:
1. When an issue depends on another, add it as sub-issue of the blocker
2. Add `blocked` label to dependent issue for visibility
3. When blocker is resolved, remove `blocked` label from dependent
4. Check for blocked issues before starting work

**Conventions**:
- Epic issues are parents of their task breakdowns
- For A blocks B: make B a sub-issue of A, add `blocked` label to B
- Document blocking reason in issue comment when adding relationship

### Session Checklist

- [ ] Check current milestone progress
- [ ] Review any PR feedback or blocked issues
- [ ] Pick next issue from current milestone
- [ ] Verify tests pass before committing
- [ ] Update project board after PR merge

