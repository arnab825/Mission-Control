# 🤝 Contributing to Mission Control

Thank you for your interest in contributing to **Mission Control**! Whether you are fixing a bug, adding a new telemetry provider, optimizing local AI model inference, or improving the web/Electron dashboards, we welcome your contributions.

---

## 📜 Code of Conduct & Guidelines

1. **Be Respectful**: Treat all contributors and community members with respect.
2. **Quality Code**: Follow the coding standards specified in the repository (TypeScript strict mode, Clean CSS/Tailwind, and Python 3.12+ async standards).
3. **Open Issues First**: Before submitting a major feature or architectural rewrite, please open an issue to discuss your proposal with the maintainers.

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

### 2. Frontend & Electron Setup
```bash
cd Gaming/frontend
npm install
npm run dev
```

### 3. Backend Setup
```bash
cd Gaming/backend
uv sync
uv run main.py --dev
```

### 4. Next.js Web Platform Setup
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

Thank you for helping make **Mission Control** the ultimate open-source AI gaming platform! 🚀
