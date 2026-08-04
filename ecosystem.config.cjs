module.exports = {
    apps: [
        {
            name: "Quiz Attendance Admin",
            // NOTE: no space in this path - pm2-deploy's underlying shell
            // script interpolates $path unquoted into every git command
            // (`git clone --branch $branch $repo $path/source`), so a path
            // with a space word-splits into extra arguments and breaks
            // clone/fetch/reset. See deploy.production.path below.
            cwd: "/home/sites/quiz-app/current",
            // Run through `npm start` (-> `next start`): this is a single
            // Next.js app (API routes + pages in one process), unlike a
            // separate compiled backend, so there's no dist/index.js to
            // invoke directly.
            script: "npm",
            args: "start -- -p 3086",
            instances: 1,
            exec_mode: "fork",
            // `next start` never sends a PM2 "ready" IPC signal, so
            // wait_ready here would just restart-loop on every deploy.
            kill_timeout: 5000,
            autorestart: true,
            max_restarts: 10,
            min_uptime: "10s",
            max_memory_restart: "500M",
            env: {
                NODE_ENV: "production",
                PORT: 3086
            }
        }
    ],

    deploy: {
        production: {
            // Matches the local ~/.ssh/config entry for CCL-PROD-SITES
            // (User sites, ccl_websit-sites.txt) used for manual `pm2
            // deploy` from a dev machine. NOTE: .github/workflows/deploy.yml
            // generates its own SSH config for the CI runner with `User
            // webapp` and a different key (CCL_PROD_WEBAPP_SSH_KEY secret) —
            // if that account doesn't also accept this same "sites" login,
            // the GitHub Actions auto-deploy will fail until reconciled.
            user: "sites",
            host: "CCL-PROD-SITES",
            ref: "origin/main",
            repo: "git@github.com:codecafe-lab-it-solutions/Quiz-App-Admin-penal.git",
            path: "/home/sites/quiz-app",
            'post-deploy': 'bash scripts/post-deploy.sh',
            'pre-deploy-local': "echo 'Starting deployment...'",
            'post-setup': "echo 'Initial setup complete'",
            'post-deploy-local': "echo 'This is a local executed command'"
        }
    }
};