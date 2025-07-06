# OPERATION "INTUITIVE API" 🎯

## 📋 SITREP - 2025-07-06

### Release v1.2.0 Complete ✅
- **Published to npm**: v1.2.0 live at https://www.npmjs.com/package/markdown-transclusion/v/1.2.0
- **GitHub Release**: Automatically created by GitHub Actions
- **Major Features Released**:
  - Template Variable Substitution
  - Plugin System Architecture  
  - Enhanced Error Recovery with fuzzy matching
  - Heading Range Extraction
  - CLI Output Control (--verbose, --porcelain, --progress)
  - Docker Development Environment

### 🚀 Key Discovery: Automated Release Process
- GitHub Actions automatically publishes to npm when tags matching `v*` are pushed
- No manual `npm publish` needed - just push the tag!
- Created RELEASING.md with complete workflow documentation
- Future releases simplified: branch → CHANGELOG → version → PR → merge → tag → done!

## 🚨 TOP PRIORITY - LIVE USER FEEDBACK (2025-07-04)

**CRITICAL:** Real users are confused about the way our code works. Fix it NOW.

## 🧠 BASIC MEMORY INTEGRATION

**IMPORTANT:** Always check basic memory at conversation start:
```bash
# Search for project info
mcp__basic-memory__search "markdown-transclusion"

# Read specific notes
mcp__basic-memory__read_note "projects/markdown-transclusion/..."
```

**AFTER EACH COMMIT:** Update basic memory with SITREP:
```bash
date +%s
```
to get the current POSIX_TIMESTAMP, then:

```bash
# Create/update SITREP note
mcp__basic-memory__write_note
  title: "markdown-transclusion SITREP [POSIX_TIMESTAMP]"
  folder: "projects/markdown-transclusion"
  content: [current status]
  tags: ["#markdown-transclusion", "#sitrep", "#progress"]
```

__IMPORTANT:__ Always look up the current POSIX timestamp because you often seem to think that today is Jan 1, 2025.

## WORKFLOW

**TWO PHASES:** Plan + Execute

### PHASE ONE: PLANNING

When approaching new work, always follow this sequence:

1. Check `git status`, if you are not clean, abort and warn the user.
2. `git fetch && git checkout features/{feature}-{task}`
3. Restate your goal, then, using the __sequential-thinking__ mcp service, in conjunction with Claude ultrathink, devise a plan to carry out the task, no matter how trivial it may seem, consider at least two ways to solve the problem and present arguments for both. Ultimately choose the most elegant, cleanest solution that is the most intuitive and easiest-to-understand.
4. Translate your plan into two formats: 
    (i) a step-by-step sequence of tasks that you save to your memory banks as a checklist 
    (ii) open a GitHub issue describing the plan in comprehensive detail, using Markdown syntax and Mermaid diagrams to illustrate complex concepts, data flows, class relationships, etc. Each step in your tasklist corresponds to an individual GitHub issue.
5. After planning, await confirmation from the user that the plan has been approved.

# PHASE TWO:EXECUTE

6. Once approved, execute each step in the step-by-step. sequence from your memory banks.
    (i) As you work, between every atomic change you make, drop a commit that follows the conventional commit spec. Follow the "Tidy First" princile, by Kent Beck. Work in tiny chunks that are limited to one component at a time. Tidy first, then change behavior afrwe. Two steps: two commits. Tidy first (structural changes only), and then, (behavioral change only).
    (ii) Each step in your sequence should have at most 2 commits: tidy, then behavioral.
    (iii) Always obey the tests. Do not skip, disable, circumvent, or ignore any linters, tests, or validation steps. These are what gives us confidence that our code is correct. Besides, you won't ultimately be able to merge your PR if the build isn't green when you push it...
7. When you complete a step in the step-by-step checklist (4.i) update your memory banks, keeping your memory up-to-date.

---

# HOW TO WRITE TESTS

- __TEST BEHAVIOR, not implementation details__. 
- Use real resources, whenever possible. Use docker to bring up local services when running them.
    (i) SPIES ARE BANNED
    (ii) MONITORING STDOUT/STDERR IS BANNED
    (iii) MOCKS ARE BANNED
