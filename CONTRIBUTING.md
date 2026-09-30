# 🤝 Contributing to Mission Control

Thank you for your interest in contributing to **Mission Control**! Whether you are fixing a bug, adding a new telemetry provider, optimizing local AI model inference, or improving the web/Electron dashboards, we welcome your contributions.

---

## 📜 Code of Conduct & Security Guidelines

1. **Code of Conduct**: All participants, contributors, and maintainers are expected to adhere to our [Code of Conduct](CODE_OF_CONDUCT.md).
2. **Security & Secrets**: Please review our [Security Policy](SECURITY.md). Never commit real secrets, environment keys, or credentials to Git.
3. **Be Respectful**: Treat all contributors and community members with empathy and respect.
4. **Quality Code**: Follow the coding standards specified in the repository (TypeScript strict mode, Clean CSS/Tailwind, and Python 3.12+ async standards).
5. **Open Issues First**: Before submitting a major feature or architectural rewrite, please open an issue to discuss your proposal with the maintainers.

---

## 🛠️ Local Development Setup

### Prerequisites
* **Node.js**: v18.0.0 or higher
* **Python**: 3.12+ (managed via `uv`)
* **Git**: Installed and configured

### 1. Fork & Clone the Repository
```bash
git clone https://github.com/YOUR_USERNAME/Mission-Control.git
cd Mission-Control
```

### 2. Environment Configuration (.env files)

> [!IMPORTANT]
> **Never commit real API keys or `.env` files to Git.** Real credentials are strictly gitignored to protect infrastructure security. Production secrets remain secured in deployment dashboards (Vercel / Render / Azure) and are never shared.

You can initialize all local templates with a single command:
```bash
# From Gaming/frontend or Gaming/website:
npm run setup
```

Or copy manually:
* **Frontend**: `cp Gaming/frontend/.env.example Gaming/frontend/.env`
  * Add your own free development key from [clerk.com](https://clerk.com/) (`VITE_CLERK_PUBLISHABLE_KEY=pk_test_...`).
* **Website**: `cp Gaming/website/.env.example Gaming/website/.env.local`
  * Add your local MongoDB URI or a free [MongoDB Atlas cluster URI](https://www.mongodb.com/cloud/atlas/register).
* **Backend**: `cp Gaming/backend/.env.example Gaming/backend/.env`
  * Add your free API keys for local inference (NVIDIA NIM or Google Gemini).

### 3. Frontend & Electron Setup
```bash
cd Gaming/frontend
npm install
npm run dev
```

### 4. Backend Setup
```bash
cd Gaming/backend
uv sync
uv run main.py --dev
```

### 5. Next.js Web Platform Setup
```bash
cd Gaming/website
npm install
npm run dev
```

---

## 🏷️ Finding "Good First Issues"

If you're new to the codebase, check out issues tagged with:
* `good-first-issue` — Beginner-friendly tasks to help you familiarize yourself with the repo.
* `help-wanted` — Features and enhancements open for community contributions.
* `preset-request` — Benchmark and telemetry profile requests for new game titles.

---

## 📤 Submitting a Pull Request (PR)

1. **Create a Feature Branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. **Make Your Changes**: Ensure code passes type checks and linting:
   * Frontend: `npm run build` inside `Gaming/frontend`
   * Backend: `.\.venv\Scripts\python.exe -m pytest` inside `Gaming/backend`
   * Website: `npm run build` inside `Gaming/website`
3. **Commit & Push**:
   ```bash
   git commit -m "feat: add support for AMD ADLX telemetry"
   git push origin feature/your-feature-name
   ```
4. **Open a PR**: Open a Pull Request targeting the `main` branch of `arnab825/Mission-Control`. Describe your changes, test results, and reference relevant issue numbers.

---

## 📄 License & Attribution

By submitting a Pull Request or contribution to **Mission Control**, you agree that your contributions will be licensed under the project's [LICENSE](LICENSE) and [EULA](Gaming/frontend/electron/license.txt).

Thank you for helping make **Mission Control** the ultimate open-source AI gaming platform! 🚀
