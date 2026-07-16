# GitHub Time Machine Documentation

The `docs` directory is the home for project-level documentation that does not belong inside one service README. Use it for architecture notes, API contracts, database schema notes, implementation decisions, onboarding guides, and demo instructions.

## Responsibilities

- Keep cross-service documentation in one place.
- Record architecture and product decisions that affect more than one component.
- Document setup details that are too long for the root README.
- Provide references for contributors implementing issues.

## Suggested Structure

```text
docs/
├── README.md              # Documentation index
├── architecture.md        # System architecture and data flow
├── api.md                 # Backend and AI API contract notes
├── database.md            # Supabase schema and migration notes
└── demo.md                # Demo script and sample data guide
```

Only `README.md` exists right now. Add the other files as the project needs more detailed documentation.

## Important Notes

- Keep the root README focused on project overview and setup.
- Keep service-specific setup in `ai/README.md`, `backend/README.md`, and `frontend/README.md`.
- Link new documents from this index so contributors can find them quickly.
