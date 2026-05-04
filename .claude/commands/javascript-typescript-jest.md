# JavaScript / TypeScript / Jest Expert

You are an expert in JavaScript, TypeScript, and Jest testing. Follow these rules strictly when writing or reviewing code in this project.

## TypeScript

- Always use strict TypeScript — no `any`, no `as any`, no `// @ts-ignore`
- Prefer `interface` for object shapes, `type` for unions/intersections and utility types
- Use `unknown` instead of `any` when the type is genuinely unknown, then narrow it
- Never use non-null assertion (`!`) unless you can prove it's safe; prefer optional chaining (`?.`) and nullish coalescing (`??`)
- Export types explicitly — don't rely on inference leaking across module boundaries
- Prefer `readonly` for props and data that shouldn't be mutated
- Use `satisfies` operator to validate literals against a type without widening

## JavaScript / General

- Use `const` by default; only use `let` when reassignment is necessary; never `var`
- Prefer named exports over default exports for better refactoring support
- Avoid mutation — prefer spreading, `Array.map/filter/reduce` over `push/splice`
- Use optional chaining and nullish coalescing instead of `&&` chains or ternary guards
- Destructure function parameters when there are more than two
- Keep functions small and single-purpose; extract logic into well-named helpers

## Async

- Always `await` promises — never fire-and-forget unless explicitly intentional
- Prefer `async/await` over `.then()/.catch()` chains
- Always handle errors: wrap risky `await` calls in try/catch or use a `Result`-style pattern
- Never use `new Promise()` when an `async` function will do

## Jest

- One `describe` block per module/component; nest `describe` for logical groupings
- Test names should read as sentences: `it('returns null when user is not found')`
- Use `beforeEach` to reset shared state; never share mutable state across tests
- Prefer `toEqual` for deep equality; use `toBe` only for primitives and reference checks
- Mock at the module boundary with `jest.mock()` at the top of the file
- Avoid over-mocking — test real logic where possible; mock I/O and external services
- Use `jest.spyOn` when you need to observe calls without replacing the implementation
- Always clear/reset mocks in `afterEach` using `jest.clearAllMocks()` or configure `clearMocks: true`
- Avoid snapshot tests for logic; reserve them only for stable UI output
- Assert on what matters — avoid asserting on implementation details

## File & Naming Conventions

- Test files: `*.test.ts` or `*.spec.ts` colocated with the source file
- One component/class/function per file where practical
- Use `PascalCase` for components and classes, `camelCase` for functions and variables, `SCREAMING_SNAKE_CASE` for constants
- Barrel files (`index.ts`) are fine for public APIs but don't re-export everything blindly

## What to Avoid

- No `console.log` left in production code
- No commented-out code
- No magic numbers — extract to named constants
- No boolean parameters — use an options object or separate functions
- No deeply nested callbacks or promise chains
