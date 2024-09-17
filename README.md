# Snaptail

A tool for building web apps with React based on Nextjs with single file.

Note that this is alpha version and things may change or break after upgrading.

**Minimal setup:**

```sh
echo 'export const App = () => <div>Hello</div>' > start.tsx
npx snaptail@latest run start.tsx
```

Or start with `init` command:

```sh
npx snaptail@latest init
npx snaptail@latest run starter.tsx
```

**Shadcn UI starter:**

```sh
# with shadcn support, every component installed
npx snaptail@latest init --ui shadcn
npx snaptail@latest run starter.tsx
```

Next step is to redesign the CLI so that the init step does all heavy lifting.

## One file applications

Snaptail **hides build system** under .snaptail dir and allows you to prototype and experiment with **single react file**.

### Includes:

- tailwindcss added
- allows you to define apis within the file
- auto-detects packages and installs them
- typescript support
- shadcn support (alpha)

## Why

When you want to build something small or try an idea out and you don't want to setup entire project for that. Use this. **You can deploy it too. It is nextjs app at the end.**

Also it works great with LLMs, you can generate entire app and just paste it into the file and it will work.

And this project explores how far we can take the idea of single source file applications.

## Usage

The single tsx or jsx file needs to export App component and may export api array that defines api routes and handlers.

The [starter template](./templates/next/starter.tsx) is the best way to explore it. You can use `npx snaptail init` and take a look.

When you use snaptail init, by default tsconfig is created to help your IDE support ts type hints.
