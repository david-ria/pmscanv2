# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/d8e7ca00-b377-4793-af43-f6fcf3d043bd

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/d8e7ca00-b377-4793-af43-f6fcf3d043bd) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/d8e7ca00-b377-4793-af43-f6fcf3d043bd) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

## Debug logging

Use the `VITE_LOG_LEVEL` environment variable to control console output.

- `VITE_LOG_LEVEL=debug` enables verbose debug messages.
- `VITE_LOG_LEVEL=info` (or leaving it unset) disables debug output, even when
  running `npm run dev`.

Example to run the development server without debug logs:

```sh
VITE_LOG_LEVEL=info npm run dev
```

Note that when React's `StrictMode` is enabled (the default in development),
components and hooks initialize twice, leading to duplicate debug logs. This
doesn't occur in production.

Leaving the log level set to `debug` while a recording is running can generate a
large amount of console output. If memory usage becomes an issue, lower the
level by setting `VITE_LOG_LEVEL=info` or unset it entirely. Set
`VITE_LOG_LEVEL=debug` during production builds if verbose logs are required.

## Supabase configuration

The application expects Supabase connection details to be available as
environment variables. When running locally with Vite, create a `.env` file with
the following keys:

```sh
VITE_SUPABASE_URL=<your Supabase project URL>
VITE_SUPABASE_ANON_KEY=<your Supabase anon key>
```

These values are used to initialize the client. If either variable is undefined
the default values bundled in the repository are used instead.

Leave `VITE_LOG_LEVEL` unset or set to `info` to silence debug output.

### Mapbox token (Supabase secret)

The map features rely on the `get-mapbox-token` edge function
(`supabase/functions/get-mapbox-token/index.ts`). Set your Mapbox token as a
Supabase secret named `MAPBOX_PUBLIC_TOKEN`.

After adding or updating this secret, redeploy the function so it can access the
new value:

```sh
supabase functions deploy get-mapbox-token
```

## Running tests

This project uses [Vitest](https://vitest.dev/) for unit tests. After installing
dependencies with `npm install`, run all tests with:

```sh
npm test
```

Vitest uses jsdom so tests can render React components.

## Git hooks

This repository ships with a `pre-commit` hook located in the `githooks/` folder.
It automatically appends a trailing newline to files inside `src/contexts`,
`src/i18n` and to top level files such as `components.json` and
`BACKGROUND_RECORDING_STATUS.md`. Enable the hook after cloning by running:

```sh
git config core.hooksPath githooks
```

The same logic can be run manually with:

```sh
npm run fix:newlines
```

## Machine Learning Context Detection

Automatic context detection can optionally use a TensorFlow.js model. To enable this:

1. Install dependencies with `npm install` which now includes `@tensorflow/tfjs`.
2. Place your trained model files under `public/model/` so that `public/model/model.json` is accessible.
3. Open the Auto Context settings in the application and toggle **Use ML model**.
4. When enabled, sensor readings will be converted to tensors and passed to the model. If the model fails to load or predict, the heuristic logic is used instead.
5. Enable **Override context** (`overrideContext` toggle) to have the model's predicted activity automatically replace your selected mission activity.

When `overrideContext` is active, the application continuously updates the mission activity field with the latest prediction returned by the TensorFlow model. Any change in prediction immediately updates the currently selected activity.

## License

This project is licensed under the [MIT License](LICENSE).
