import logging
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy.orm import Session

from app.services.action_planner import (
    decompose_compound_command,
    execute_action_plan,
)

logger = logging.getLogger(__name__)


def detect_multistep_command(command: str) -> Optional[Tuple[str, str]]:
    """
    Detects if command contains coordinated actions.
    Maintains compatibility with legacy (part1, part2) calls.
    """
    segments = decompose_compound_command(command)
    if segments and len(segments) >= 2:
        return segments[0], " and ".join(segments[1:])
    return None


async def execute_multistep_pipeline(
    part1: str,
    part2: str,
    db: Session,
    user_id: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """
    Executes a structured action plan across two or more coordinated parts.
    """
    segments = [part1, part2] if isinstance(part2, str) and " and " not in part2 else [part1] + part2.split(" and ")
    return await execute_action_plan(segments, db, user_id=user_id)
