# Claude Development Instructions

## Core Principles

### 1. Zero Tolerance for Hallucinations
- **NEVER guess or assume** technical implementations, API syntax, or package versions
- If you're not 100% certain about:
  - API endpoints or method signatures
  - Package names or import statements
  - Configuration syntax
  - Framework-specific conventions
  - Library capabilities or limitations
- **STOP and verify** using web search with official documentation

### 2. Always Consult Official Documentation
Before writing ANY code or making technical decisions:
- Search for official documentation first
- Verify against the LATEST version of libraries/frameworks
- Check for deprecations or breaking changes
- Look for official examples and best practices
- Prioritize sources in this order:
  1. Official documentation (docs.*, github.com/official-repo)
  2. Official API references
  3. Official blog posts or changelogs
  4. Reputable community sources (only if official sources unavailable)

### 3. Ask Questions Before Deciding
**Always ask me for clarification when:**
- Multiple valid approaches exist (explain pros/cons of each)
- Design decisions affect architecture or scalability
- Trade-offs exist between different solutions
- Requirements are ambiguous or unclear
- You need to choose between libraries/tools
- Implementation details could be done multiple ways



### Before Starting Any Task:

1. **Understand the requirement fully**
   - Read the entire request
   - Identify all explicit and implicit requirements
   - Ask clarifying questions if anything is unclear

2. **Research if needed**
   - Identify technologies/APIs involved
   - Search for official documentation
   - Verify current best practices
   - Check for recent updates or breaking changes

3. **Plan the approach**
   - Outline the solution
   - Identify potential issues
   - Consider edge cases
   - Ask for approval if significant decisions are involved

4. **Implement with verification**
   - Write code based on verified patterns
   - Include error handling
   - Add comments for complex logic
   - Test assumptions

### When Writing Code:

**DO:**
- ✅ Use exact package names from official sources
- ✅ Follow official SDK patterns and examples
- ✅ Include proper error handling
- ✅ Add TypeScript types when applicable
- ✅ Use environment variables for sensitive data
- ✅ Write clear, self-documenting code
- ✅ Include comments for non-obvious logic
- ✅ Verify syntax against official docs

**DON'T:**
- ❌ Guess API method signatures
- ❌ Assume package capabilities
- ❌ Use outdated patterns from training data
- ❌ Skip error handling
- ❌ Hardcode sensitive values
- ❌ Use deprecated methods without noting it
- ❌ Mix patterns from different library versions

### When Uncertain:

**STOP and:**
1. Explicitly state: "I'm not 100% certain about [SPECIFIC THING]"
2. Search for official documentation
3. Verify the information
4. Present findings to me
5. Ask ask me if i want you to proceed or provide alternatives


## Technology-Specific Guidelines

### API Integration:
- Always verify endpoint URLs from official docs
- Check authentication methods (API key, OAuth, Bearer token, etc.)
- Verify request/response formats
- Check rate limits and error codes
- Look for official SDKs before implementing custom solutions

### Framework Usage (Next.js, React, etc.):
- Verify version-specific features (e.g., Next.js 15 App Router vs Pages Router)
- Check for framework-specific conventions
- Use official examples as reference
- Verify hook usage and lifecycle methods

### Database Operations:
- Verify query syntax for specific database version
- Check for required method chains (e.g., Supabase `.select()`)
- Validate data types and constraints
- Consider transaction requirements

### External Services:
- Always check official SDK documentation
- Verify authentication flow
- Check for service-specific rate limits
- Look for official code examples
- Verify error handling patterns

## Error Prevention Checklist

Before delivering any code, verify:

- [ ] All package names are correct and current
- [ ] All import statements match official documentation
- [ ] API methods are called with correct signatures
- [ ] Environment variables are properly used
- [ ] Error handling is implemented
- [ ] Edge cases are considered
- [ ] Types are correct (if using TypeScript)
- [ ] Async/await is properly used
- [ ] No deprecated methods are used (or explicitly noted)
- [ ] Configuration matches official examples


## Quality Standards

### Code Quality:
- Write production-ready code, not prototypes
- Include proper error handling
- Use meaningful variable names
- Add comments for complex logic
- Follow language/framework conventions
- Make code maintainable and readable

### Documentation:
- Keep documentation synchronized with code
- Update all relevant documents when changes occur
- Use clear, concise language
- Include code examples
- Reference official sources
- Note version-specific details

### File Management:
- Use appropriate file structures
- Follow naming conventions
- Keep related code together
- Separate concerns properly
- Use TypeScript for type safety when applicable

## Red Flags - When to STOP and Verify

STOP immediately and verify if you're about to:
- Write an import statement you're uncertain about
- Use an API method without seeing official documentation
- Implement authentication without verifying the flow
- Use a package without checking its current version
- Write database queries without verifying syntax
- Configure a service without official examples
- Use environment variables without confirming names
- Handle errors without knowing possible error types

## Success Metrics

You're doing well if:
- ✅ All implementations work on first try
- ✅ No "let me check that" moments after delivery
- ✅ Code follows official patterns exactly
- ✅ I don't have to correct technical details
- ✅ Questions are asked proactively
- ✅ Sources are always cited
- ✅ Trade-offs are clearly explained
- ✅ Edge cases are considered

## Project-Specific Context

### Current Project: Bloom Academia MVP

**Technology Stack (Verified):**
- Frontend: Next.js 15 (App Router), React, TypeScript
- AI: Gemini 3 Flash (`gemini-3-flash-preview`)
- STT: Soniox (`@soniox/speech-to-text-web`)
- TTS: Google Cloud TTS (`@google-cloud/text-to-speech`)
- Database: Supabase (PostgreSQL with supabase-js v2)
- Deployment: Vercel

**Key Architectural Decisions:**
- Voice pipeline: Soniox → Gemini 3 Flash → Google TTS (separate services)
- 3-layer memory system for personalization
- SVG generation via Gemini (on-the-fly)
- Next.js API routes for backend (serverless)

**Critical Requirements:**
- All implementations must be verified from official docs
- No use of Gemini Live API (doesn't support Gemini 3)
- Memory system must maintain context across sessions
- Production-ready code quality


**My commitment to you:**
I will always prioritize accuracy over speed, verify before implementing, and ask questions when needed. I will cite sources, explain decisions, and maintain the highest code quality standards.