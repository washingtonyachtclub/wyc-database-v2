# Getting Started

## Database Connection Setup

This project connects to a MySQL database on DreamHost. To connect locally, you need to set up an SSH tunnel.

### Setting Up the SSH Tunnel

**For WSL/Linux/macOS:**

1. Copy the example script:

   ```bash
   cp tunnel.sh.example tunnel.sh
   ```

2. Edit `tunnel.sh` and update the SSH command with your DreamHost details (if different from the defaults)

3. Make it executable:

   ```bash
   chmod +x tunnel.sh
   ```

4. Run the tunnel:
   ```bash
   ./tunnel.sh
   ```

**For Windows (PowerShell):**

1. Copy the example script:

   ```powershell
   Copy-Item tunnel.ps1.example tunnel.ps1
   ```

2. Edit `tunnel.ps1` and update the SSH command with your DreamHost details (if different from the defaults)

3. Run the tunnel:
   ```powershell
   .\tunnel.ps1
   ```

**Important:** Keep the tunnel terminal/window open while developing. Press `Ctrl+C` to close it when done.

### Environment Configuration

Update the `DATABASE_URL` in your `.env.local` file to point to the tunneled port:

```
DATABASE_URL=mysql://username:password@127.0.0.1:3307/database_name
```

Make sure:

- The port (`3307`) matches the local port in your tunnel script
- The host is `127.0.0.1` (localhost) to use the SSH tunnel
- Your MySQL username, password, and database name are correct

The project automatically loads `.env.local` via `dotenv/config`.

## Running the Application

To run this application:

```bash
npm install
npm run dev
```

**Important:** Make sure the SSH tunnel is running before starting the dev server!

# Building For Production

To build this application for production:

```bash
npm run build
```

## Testing

This project uses [Vitest](https://vitest.dev/) for testing. You can run the tests with:

```bash
npm run test
```

## Styling

This project uses [Tailwind CSS](https://tailwindcss.com/) for styling.

## Linting & Formatting

This project uses [eslint](https://eslint.org/) and [prettier](https://prettier.io/) for linting and formatting. Eslint is configured using [tanstack/eslint-config](https://tanstack.com/config/latest/docs/eslint). The following scripts are available:

```bash
npm run lint
npm run format
npm run check
```
