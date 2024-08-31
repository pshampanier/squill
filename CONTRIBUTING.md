## Building

Building and the program in debug mode requires a couple of environment variables to be set. The file `.env.sh` can be used to set them for you.

```sh
source .env.sh
```

### Release

```bash
cargo tauri build --config client/src-tauri/tauri.release.conf.json
```

## Debugging with VS Code

### Desktop app

Select the configuration `desktop (debug)` in **Run and Debug**.

### Web app

```sh
cd webapp
npm run dev
```

Then select the configuration `webapp` in **Run and Debug**.

### Debugging the agent and the client together

To open two VS Code on the same workspace, you need use the menu `File / Duplicate Workspace` from VS Code.
Unfortunately when doing so, VS Code does not automatically export the environment variables and launching the build or
debugger may fail due to missing expected variables. To solve this issue, you can automatically load the `.env.sh` file
in your `~/.zprofile`:

```sh
# Loading `.env.sh` on VS Code embedded terminal
if [[ "$TERM_PROGRAM" == "vscode" && -f ".env.sh" ]]; then
  source .env.sh
fi
```

## Testing Github actions

> [!IMPORTANT]
> Install [`act`](https://github.com/nektos/act).

```sh
act
```

## Components preview

A preview of all components can be seen at

> [http://localhost:1420/src/\_\_tests\_\_/previews/previews.html](http://localhost:1420/src/__tests__/previews/previews.html)

## Coding Guidelines

Follow [Airbnb JavaScript Style Guide()](https://github.com/airbnb/javascript#airbnb-javascript-style-guide-)

### Do not use enums

Prefer union types to enums.

If you need to access the list of possible values, start by creating an array of the possible values as a constant and create the union type from it.

> [!TIP]
>
> ```ts
> export const AUTHENTICATION_METHODS = ["user_password", "key", "token"] as const;
> export type AuthenticationMethods = (typeof AUTHENTICATION_METHODS)[number];
> ```

### Functions inside React components

Inside React components, use arrow functions because arrow functions can capture the surrounding context, which is often necessary when working with React's state and props.

> [!TIP]
>
> ```ts
>   default export MyComponent() {
>
>     const handleClick = (e: React.MouseEvent) => {
>       ...
>     }
>
>   }
> ```

> [!CAUTION]
>
> ```ts
>   default export MyComponent() {
>
>     function handleClick (e: React.MouseEvent) {
>       ...
>     }
>
>   }
> ```
