# Documentation Rules

Documentation is just as important as the code itself. Outdated or inaccurate documentation leads to confusion and bugs.

## General Guidelines

- **Keep it Living:** Whenever you add a new feature, change the architecture, or update a database table, you MUST update the corresponding markdown file in the `docs/` directory in the same Pull Request.
- **No Secrets:** **Never** hardcode API keys, Supabase URLs, or production passwords into the documentation. If you need to demonstrate how to use an environment variable, use dummy values (e.g., `SUPABASE_KEY=your-anon-key-here`).
- **Clear Formatting:** Use standard Markdown features: headers for hierarchy, bullet points for lists, and code blocks with syntax highlighting for code snippets.

## Adding New Pages

If you are adding a completely new section or page to the documentation:

1. Create the `.md` file in the appropriate directory inside `docs/`.
2. Open `mkdocs.yml` in the root directory.
3. Add the file path to the `nav` tree so it appears in the sidebar navigation.

## Testing Docs Locally

We use MkDocs with the Read the Docs theme to generate this documentation site. The repository scripts keep the command consistent for every contributor.

To preview your changes locally before committing:

```bash
# Install the pinned documentation dependencies
python -m pip install -r docs/requirements.txt

# Run the local server
pnpm docs:serve
```

The documentation site will be available at `http://127.0.0.1:8000/`. Verify that your formatting looks correct and that all internal links are working.

Before opening the pull request, also run the production documentation build:

```bash
python -m mkdocs build --strict
```
