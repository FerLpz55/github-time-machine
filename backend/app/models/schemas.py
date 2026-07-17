from datetime import datetime
from enum import StrEnum
from typing import Optional, Union
from uuid import UUID, uuid4

from pydantic import BaseModel, Field

from app.models.tables import Analysis

GITHUB_URL_PATTERN = r"^https://github\.com/[^/]+/[^/]+"


class RepositoryStatus(StrEnum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    ERROR = "error"


class RepositorySubmitRequest(BaseModel):
    github_url: str = Field(
        ...,
        min_length=19,
        max_length=256,
        pattern=GITHUB_URL_PATTERN,
        description="GitHub repository URL to analyze",
        examples=["https://github.com/facebook/react"],
    )


class RepositoryPending(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    status: RepositoryStatus = RepositoryStatus.PENDING
    github_url: str
    message: str = "Repository queued for analysis"
    created_at: datetime = Field(default_factory=datetime.utcnow)


class RepositoryProcessing(BaseModel):
    id: UUID
    status: RepositoryStatus = RepositoryStatus.PROCESSING
    github_url: str
    started_at: Optional[datetime] = None
    created_at: datetime


class RepositoryCompleted(BaseModel):
    id: UUID
    status: RepositoryStatus = RepositoryStatus.COMPLETED
    github_url: str
    name: str
    owner: str
    language: Optional[str] = None
    files_indexed: int = Field(ge=0)
    commits_analyzed: int = Field(ge=0)
    analysis: Optional[Analysis] = None
    created_at: datetime
    completed_at: Optional[datetime] = None


class RepositoryError(BaseModel):
    id: UUID
    status: RepositoryStatus = RepositoryStatus.ERROR
    github_url: str
    error_message: str
    created_at: datetime


RepositoryResponse = Union[
    RepositoryPending,
    RepositoryProcessing,
    RepositoryCompleted,
    RepositoryError,
]


class ChatRequest(BaseModel):
    repository_id: UUID
    question: str = Field(min_length=1, max_length=2000)


class ChatResponse(BaseModel):
    id: UUID
    repository_id: UUID
    question: str
    answer: str
    created_at: datetime


class RepositoryListItem(BaseModel):
    id: UUID
    name: str
    owner: str
    github_url: str
    language: Optional[str] = None
    status: Optional[str] = None
    created_at: Optional[datetime] = None
    last_analyzed: Optional[datetime] = None


class RepositoryListResponse(BaseModel):
    repositories: list[RepositoryListItem]


class TimelineEvent(BaseModel):
    sha: str = Field(min_length=40, max_length=40)
    date: Optional[datetime] = None
    author: Optional[str] = None
    message: Optional[str] = None
    is_fix: bool = False
    is_merge: bool = False


class TimelineStats(BaseModel):
    total_commits: int = Field(ge=0)
    date_range: Optional[dict] = None
    top_authors: list[str] = Field(default_factory=list)


class TimelineResponse(BaseModel):
    events: list[TimelineEvent] = Field(default_factory=list)
    stats: Optional[TimelineStats] = None


class GraphNode(BaseModel):
    id: str = Field(min_length=1)
    label: str
    type: str = "file"
    language: Optional[str] = None
    size: Optional[int] = Field(None, ge=0)


class GraphEdge(BaseModel):
    source: str
    target: str
    type: str = "imports"
    label: Optional[str] = None


class GraphResponse(BaseModel):
    nodes: list[GraphNode] = Field(default_factory=list)
    edges: list[GraphEdge] = Field(default_factory=list)
