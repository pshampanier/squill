## Debugging with VS Code

### Desktop app

Select the configuration `desktop (client)` in **Run and Debug**.

### Web app

```sh
cd client/webapp
npm run dev
```

Then select the configuration `webapp (client)` in **Run and Debug**.

## Testing Github actions

> [!IMPORTANT]
> Install [`act`](https://github.com/nektos/act).

```sh
act
```

## Coding Guidelines

Follow [Airbnb JavaScript Style Guide() {](https://github.com/airbnb/javascript#airbnb-javascript-style-guide-)

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
