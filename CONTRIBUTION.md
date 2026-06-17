# Contribution Guidelines

## Project

Whitestown School Complex Portal is a Django school management system for a Ghana basic school environment.

## Repository

```bash
git clone https://github.com/vwkichasu-lab/Whitestown_School_Complex_Portal.git
cd Whitestown_School_Complex_Portal
```

## Development Setup

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

## Branching

Create a branch for each feature or fix:

```bash
git checkout -b feature/your-feature-name
```

## Code Standards

- Follow clear Django project structure.
- Keep models, views, templates, and static assets organized.
- Use descriptive names for functions, variables, templates, and CSS classes.
- Test important dashboard and form workflows before committing.
- Do not commit local databases, media uploads, virtual environments, or secrets.

## Commit Format

Use clear commit messages:

```bash
git commit -m "Add class subject assignment dashboard"
```

## Pull Requests

Pull requests should explain:

- What changed
- Why it changed
- How it was tested

## License

All rights reserved. Copyright 2026.
