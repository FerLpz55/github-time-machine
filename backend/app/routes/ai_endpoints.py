import logging
import re
import os
from datetime import datetime, timezone, timedelta
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from jinja2 import Environment, FileSystemLoader, select_autoescape
from openai import OpenAI
from pydantic import BaseModel

from app.dependencies import get_db
from app.models.heatmap import DebtScore, HeatmapResponse
from app.models.health import FileHealthScore
from app.models.impact import ImpactRequest, ImpactResult, AffectedFile
from app.models.bug_origin import BugOriginRequest, BugOriginResponse
from app.models.refactor_plan import RefactorPlanRequest, RefactorPlanResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/repositories/{repo_id}", tags=["ai"])

_prompts_dir = os.path.join(os.path.dirname(__file__), "..", "prompts")
try:
    _jinja = Environment(loader=FileSystemLoader(_prompts_dir), autoescape=select_autoescape())
except Exception as e:
    _jinja = None
    logger.error("Failed to load jinja2 Environment: %s", e)


def _openai_configured() -> bool:
    return bool(os.getenv("OPENAI_API_KEY"))


# ── Health (diagnostic) ─────────────────────────────────────────────────

@router.get("/ai-health")
def ai_health(repo_id: UUID, supabase=Depends(get_db)):
    """Diagnostic endpoint — returns AI subsystem status."""
    commits_result = supabase.table("commits").select("commit_sha").eq("repository_id", str(repo_id)).limit(1).execute()
    return {
        "jinja2_loaded": _jinja is not None,
        "openai_key_configured": _openai_configured(),
        "templates_available": os.listdir(_prompts_dir) if os.path.isdir(_prompts_dir) else [],
        "commits_work": commits_result.data is not None,
    }


# ── Heatmap ─────────────────────────────────────────────────────────────

@router.get("/heatmap", response_model=HeatmapResponse)
def get_heatmap(repo_id: UUID, supabase=Depends(get_db)):
    repo_id_str = str(repo_id)

    files = supabase.table("files").select("file_path, language, size").eq("repository_id", repo_id_str).execute()
    if not files.data:
        return HeatmapResponse(repo_id=repo_id_str, scores=[], average_debt=0.0, hotspot_count=0)

    commits = supabase.table("commits").select("id, message, author").eq("repository_id", repo_id_str).execute()
    commit_count = len(commits.data) if commits.data else 0

    scores: list[DebtScore] = []
    for f in files.data:
        path = f["file_path"]
        size = f.get("size") or 0
        language = f.get("language") or "other"

        churn = (size % 20) + 1 if commit_count == 0 else min(20, commit_count)

        complexity = min(100.0, max(0.0, (size / 5000.0) * 60.0))

        file_commits = [c for c in (commits.data or []) if path in (c.get("message") or "")]
        fix_commits = [c for c in file_commits if "fix" in (c.get("message") or "").lower()]

        debt_from_churn = min(1.0, len(file_commits) / 15.0)
        debt_from_fixes = min(1.0, len(fix_commits) / 5.0)
        debt_score = min(1.0, debt_from_churn * 0.4 + debt_from_fixes * 0.6)

        if debt_score > 0.66:
            risk = "high"
        elif debt_score > 0.33:
            risk = "medium"
        else:
            risk = "low"

        scores.append(DebtScore(
            path=path,
            language=language,
            churn=len(file_commits),
            complexity=complexity,
            age_days=0,
            line_count=size,
            debt_score=debt_score,
            risk_level=risk,
        ))

    avg = sum(s.debt_score for s in scores) / len(scores) if scores else 0.0
    hotspots = sum(1 for s in scores if s.risk_level == "high")

    return HeatmapResponse(repo_id=repo_id_str, scores=scores, average_debt=round(avg, 2), hotspot_count=hotspots)


# ── File Health ──────────────────────────────────────────────────────────

@router.get("/file_health", response_model=FileHealthScore)
def get_file_health(repo_id: UUID, path: str = Query(...), supabase=Depends(get_db)):
    repo_id_str = str(repo_id)

    file_rows = (
        supabase.table("files")
        .select("file_path, language, size")
        .eq("repository_id", repo_id_str)
        .eq("file_path", path)
        .execute()
    )
    if not file_rows.data:
        raise HTTPException(status_code=404, detail=f"File '{path}' not found")

    commits = (
        supabase.table("commits")
        .select("message, author")
        .eq("repository_id", repo_id_str)
        .execute()
    )

    file_commits = [c for c in (commits.data or []) if path in (c.get("message") or "")]
    commit_count = len(file_commits)

    size = file_rows.data[0].get("size") or 0
    complexity = min(1.0, max(0.0, (size / 10000.0)))

    churn = min(1.0, commit_count / 20.0)

    fix_commits = [c for c in file_commits if "fix" in (c.get("message") or "").lower()]
    fix_count = len(fix_commits)
    debt_from_ratio = (fix_count / commit_count) if commit_count > 0 else 0.0
    debt_from_absolute = min(1.0, fix_count / 10.0)
    debt = min(1.0, debt_from_ratio * 0.4 + debt_from_absolute * 0.6)

    avg = (complexity + churn + debt) / 3.0
    if avg > 0.66:
        status = "poor"
    elif avg > 0.33:
        status = "moderate"
    else:
        status = "good"

    return FileHealthScore(
        file_path=path,
        complexity_score=complexity,
        churn_score=churn,
        debt_score=debt,
        health_status=status,
    )


# ── OpenAI Helpers ───────────────────────────────────────────────────────

def _build_messages(system: str, user: str, model: str = "gpt-4o-mini") -> list[dict]:
    return [
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ]


def _call_openai(messages: list[dict], max_tokens: int = 1500, temperature: float = 0.4) -> str:
    if not _openai_configured():
        raise HTTPException(status_code=503, detail="OpenAI API key not configured")

    client = OpenAI()
    model = os.getenv("CHAT_MODEL", "gpt-4o-mini")
    try:
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            max_tokens=max_tokens,
            temperature=temperature,
        )
        return response.choices[0].message.content or ""
    except Exception as e:
        logger.warning("OpenAI call failed: %s", e)
        raise HTTPException(status_code=502, detail="AI service returned an error")


SHA_PATTERN = re.compile(r"\b([a-f0-9]{7,40})\b")


def _extract_sha(text: str) -> Optional[str]:
    m = SHA_PATTERN.search(text)
    return m.group(1) if m else None


# ── Impact ───────────────────────────────────────────────────────────────

@router.post("/impact", response_model=ImpactResult)
def get_impact(repo_id: UUID, body: ImpactRequest, supabase=Depends(get_db)):
    repo_id_str = str(repo_id)
    target = body.target

    repo = supabase.table("repositories").select("name, owner").eq("id", repo_id_str).execute()
    repo_name = "unknown/unknown"
    if repo.data:
        r = repo.data[0]
        repo_name = f"{r.get('owner','unknown')}/{r.get('name','unknown')}"

    deps: list[dict] = []

    try:
        edges = (
            supabase.table("edges")
            .select("source_name, target_name, edge_type")
            .eq("repository_id", repo_id_str)
            .execute()
        )
        files = supabase.table("files").select("file_path").eq("repository_id", repo_id_str).execute()
        all_paths = {f["file_path"] for f in (files.data or [])}

        if edges.data:
            seen = set()
            for e in edges.data:
                source = e.get("source_name", "")
                target_e = e.get("target_name", "")
                edge_type = e.get("edge_type", "imports")
                if source and source in all_paths and source not in seen:
                    seen.add(source)
                    deps.append({"path": source, "relationship": edge_type})
                if target_e and target_e in all_paths and target_e not in seen:
                    seen.add(target_e)
                    deps.append({"path": target_e, "relationship": edge_type})
    except Exception as e:
        logger.warning("Edges query failed: %s", e)

    if _jinja is not None and _openai_configured():
        try:
            commits = (
                supabase.table("commits")
                .select("commit_sha, author, message, commit_date")
                .eq("repository_id", repo_id_str)
                .order("commit_date", desc=True)
                .limit(5)
                .execute()
            )
            recent = []
            if commits.data:
                for c in commits.data:
                    if target in (c.get("message") or ""):
                        recent.append({
                            "sha": c.get("commit_sha", ""),
                            "author_name": c.get("author", "unknown"),
                            "message": (c.get("message") or "")[:100],
                        })

            template = _jinja.get_template("impact_analysis.j2")
            user_prompt = template.render(
                repo={"full_name": repo_name},
                target_path=target,
                target_file=None,
                change_type=body.change_type,
                description=body.description or "",
                dependencies=deps[:20],
                reverse_deps=[],
                recent_commits=recent[:5],
            )
            messages = _build_messages("You are a code impact analyst.", user_prompt)
            answer = _call_openai(messages, max_tokens=2000)
        except Exception as e:
            logger.warning("OpenAI/Jinja2 path failed: %s", e)
            answer = None
    else:
        answer = None

    if not answer:
        return ImpactResult(
            target=target,
            change_type=body.change_type,
            risk_score=0.5,
            affected_files=[
                AffectedFile(path=d.get("path", "unknown"), relationship="depends_on", risk_level="low", reason="Edge in graph")
                for d in (deps[:5] or [{"path": "unknown"}])
            ],
            suggested_tests=["Review affected files for regressions"],
        )

    affected = []
    risk = 0.3
    for line in (answer or "").split("\n"):
        line = line.strip()
        if not line or not line.startswith("-"):
            continue
        risk_level = "low"
        if "high" in line.lower() or "critical" in line.lower():
            risk_level = "high"
            risk = max(risk, 0.8)
        elif "medium" in line.lower():
            risk_level = "medium"
            risk = max(risk, 0.5)
        affected.append(AffectedFile(path=line.lstrip("- "), relationship="depends_on", risk_level=risk_level, reason=line))

    tests = []
    for line in (answer or "").split("\n"):
        if "test" in line.lower() and line.strip().startswith(("-", "*", "1.", "2.")):
            tests.append(line.lstrip("-* 1234567890.").strip())

    return ImpactResult(
        target=target,
        change_type=body.change_type,
        risk_score=round(risk, 2),
        affected_files=affected[:10] or [
            AffectedFile(path=d.get("path", "unknown"), relationship="depends_on", risk_level="low", reason="Edge in graph")
            for d in (deps[:5] or [{"path": "unknown"}])
        ],
        suggested_tests=tests[:5] or ["Run existing test suite"],
    )


# ── Bug Origin ───────────────────────────────────────────────────────────

@router.post("/bug_origin", response_model=BugOriginResponse)
def get_bug_origin(repo_id: UUID, body: BugOriginRequest, supabase=Depends(get_db)):
    repo_id_str = str(repo_id)
    file_path = body.file_path

    repo = supabase.table("repositories").select("name, owner").eq("id", repo_id_str).execute()
    repo_name = "unknown/unknown"
    if repo.data:
        r = repo.data[0]
        repo_name = f"{r.get('owner','unknown')}/{r.get('name','unknown')}"

    try:
        commits = (
            supabase.table("commits")
            .select("commit_sha, author, message, commit_date")
            .eq("repository_id", repo_id_str)
            .order("commit_date", desc=True)
            .limit(50)
            .execute()
        )
    except Exception as e:
        logger.warning("commits query failed: %s", e)
        commits = type("obj", (object,), {"data": []})()

    all_commits = commits.data or []
    fix_commits = []
    for c in all_commits:
        msg = (c.get("message") or "").lower()
        if "fix" in msg or "bug" in msg:
            fix_commits.append(c)

    if not fix_commits:
        return BugOriginResponse(
            file_path=file_path,
            culprit_commit_sha=None,
            ai_explanation="No fix commits found for this file.",
        )

    if _jinja is not None and _openai_configured():
        try:
            template = _jinja.get_template("bug_origin.j2")
            user_prompt = template.render(
                repo={"full_name": repo_name},
                file_path=file_path,
                fix_commits=[
                    {
                        "sha": c.get("commit_sha", ""),
                        "author_name": c.get("author", "unknown"),
                        "message": c.get("message", ""),
                        "timestamp": str(c.get("commit_date", "")),
                        "files_changed": 1,
                        "additions": 0,
                        "deletions": 0,
                    }
                    for c in fix_commits[:10]
                ],
                surrounding_commits=[],
                edges=[],
            )
            messages = _build_messages("You trace bugs to their origin commit.", user_prompt)
            answer = _call_openai(messages, max_tokens=1500)
            sha = _extract_sha(answer.split("\n")[0] if answer else "") or fix_commits[0].get("commit_sha")
            return BugOriginResponse(file_path=file_path, culprit_commit_sha=sha, ai_explanation=answer)
        except Exception as e:
            logger.warning("OpenAI/jinja2 for bug_origin failed: %s", e)

    return BugOriginResponse(
        file_path=file_path,
        culprit_commit_sha=fix_commits[0].get("commit_sha"),
        ai_explanation=f"Most recent fix commit: {fix_commits[0].get('message', '')[:200]}",
    )


# ── Refactor Plan ────────────────────────────────────────────────────────

@router.post("/refactor_plan", response_model=RefactorPlanResponse)
def get_refactor_plan(repo_id: UUID, body: RefactorPlanRequest, supabase=Depends(get_db)):
    repo_id_str = str(repo_id)

    repo = supabase.table("repositories").select("name, owner").eq("id", repo_id_str).execute()
    repo_name = "unknown/unknown"
    if repo.data:
        r = repo.data[0]
        repo_name = f"{r.get('owner','unknown')}/{r.get('name','unknown')}"

    try:
        cutoff = datetime.now(timezone.utc) - timedelta(days=body.since_days)
        cutoff_str = cutoff.isoformat()
        commits = (
            supabase.table("commits")
            .select("commit_sha, author, message, commit_date")
            .eq("repository_id", repo_id_str)
            .order("commit_date", desc=True)
            .limit(30)
            .execute()
        )
    except Exception as e:
        logger.warning("commits query for refactor_plan failed: %s", e)
        return RefactorPlanResponse(plan="Unable to fetch commit data.")

    refactor_commits = []
    for c in (commits.data or []):
        msg = (c.get("message") or "").lower()
        if any(kw in msg for kw in ("refactor", "rename", "extract", "move", "clean", "restructure")):
            refactor_commits.append(c)
        if len(refactor_commits) >= 10:
            break

    if not refactor_commits:
        refactor_commits = (commits.data or [])[:10]

    if not refactor_commits:
        return RefactorPlanResponse(plan="No recent commits found for analysis.")

    if _jinja is not None and _openai_configured():
        try:
            template = _jinja.get_template("refactor_plan.j2")
            user_prompt = template.render(
                repo={"full_name": repo_name},
                refactor_commits=[
                    {
                        "sha": c.get("commit_sha", ""),
                        "author_name": c.get("author", "unknown"),
                        "message": c.get("message", ""),
                        "timestamp": str(c.get("commit_date", "")),
                        "files_changed": 1,
                        "additions": 0,
                        "deletions": 0,
                    }
                    for c in refactor_commits[:10]
                ],
            )
            messages = _build_messages("You are a refactoring expert.", user_prompt)
            answer = _call_openai(messages, max_tokens=2000)
            return RefactorPlanResponse(plan=answer)
        except Exception as e:
            logger.warning("OpenAI/jinja2 for refactor_plan failed: %s", e)

    commits_summary = "\n".join(
        f"- {c.get('commit_sha', '')[:7]} {c.get('message', '')[:80]}"
        for c in refactor_commits[:10]
    )
    return RefactorPlanResponse(
        plan=f"Based on recent commits in {repo_name}:\n\n{commits_summary}\n\n"
             "AI-powered analysis unavailable. Review these commits manually for refactoring opportunities."
    )
