import json
import logging
import os
from collections.abc import AsyncGenerator, Sequence
from typing import Optional

from dotenv import load_dotenv
import httpx
from openai import AsyncOpenAI

# Load environment variables from both backend/.env and root .env
_backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv(os.path.join(_backend_dir, ".env"))
load_dotenv(os.path.join(os.path.dirname(_backend_dir), ".env"))
load_dotenv()

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = (
    "You are Nova, an intelligent, professional, and helpful cyber-luxe personal AI assistant. "
    "Keep your answers concise, clear, and well-structured using GitHub-flavored Markdown. "
    "When explaining code, always include language tags. Be polite and helpful."
)


# Candidate models in order of priority. If a model is unavailable or sunset,
# the service will automatically fallback to the next working model.
FALLBACK_MODELS = [
    os.getenv("GROQ_MODEL", "openai/gpt-oss-120b"),
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "qwen/qwen3.8-27b",
    "llama-3.3-70b-versatile",
]

# Cache of verified working model
_verified_model: Optional[str] = None


def get_candidate_models() -> List[str]:
    """Return deduplicated list of candidate models with verified model first."""
    candidates = []
    if _verified_model:
        candidates.append(_verified_model)
    env_model = os.getenv("GROQ_MODEL", "").strip()
    if env_model and env_model not in candidates:
        candidates.append(env_model)
    for m in FALLBACK_MODELS:
        if m and m not in candidates:
            candidates.append(m)
    return candidates


def get_ai_client() -> AsyncOpenAI:
    key = os.getenv("GROQ_API_KEY", "").strip()
    if not key:
        raise RuntimeError("Groq API key is not configured.")
    http_client = httpx.AsyncClient(timeout=30.0, verify=False)
    return AsyncOpenAI(api_key=key, base_url="https://api.groq.com/openai/v1", http_client=http_client)


async def ask_ai(
    prompt: str,
    conversation_history: Sequence[dict[str, str]] = (),
    system_extra: Optional[str] = None,
) -> str:
    global _verified_model
    client = get_ai_client()
    system_msg = SYSTEM_PROMPT
    if system_extra:
        system_msg += f"\n\n{system_extra}"

    messages = [
        {"role": "system", "content": system_msg},
        *conversation_history,
        {"role": "user", "content": prompt},
    ]

    last_error = None
    for model_name in get_candidate_models():
        try:
            result = await client.chat.completions.create(
                model=model_name,
                messages=messages,
            )
            content = result.choices[0].message.content
            if content:
                _verified_model = model_name
                return content
        except Exception as error:
            last_error = error
            logger.warning("Groq model '%s' failed: %s. Trying fallback...", model_name, error)
            continue

    logger.exception("All AI provider candidate models failed")
    raise RuntimeError(f"AI provider request failed: {last_error}")


async def stream_ai(
    prompt: str,
    conversation_history: Sequence[dict[str, str]] = (),
    system_extra: Optional[str] = None,
) -> AsyncGenerator[str, None]:
    """Stream token chunks from Groq as Server-Sent Event formatted strings."""
    global _verified_model
    client = get_ai_client()
    system_msg = SYSTEM_PROMPT
    if system_extra:
        system_msg += f"\n\n{system_extra}"

    messages = [
        {"role": "system", "content": system_msg},
        *conversation_history,
        {"role": "user", "content": prompt},
    ]

    response_stream = None
    last_error = None

    for model_name in get_candidate_models():
        try:
            response_stream = await client.chat.completions.create(
                model=model_name,
                messages=messages,
                stream=True,
            )
            _verified_model = model_name
            break
        except Exception as error:
            last_error = error
            logger.warning("Groq stream creation failed for model '%s': %s", model_name, error)
            continue

    if response_stream is None:
        logger.error("All AI provider streaming models failed: %s", last_error)
        yield f"data: {json.dumps({'error': f'AI provider unavailable: {last_error}'})}\n\n"
        return

    try:
        async for chunk in response_stream:
            if chunk.choices and chunk.choices[0].delta.content:
                text_delta = chunk.choices[0].delta.content
                yield f"data: {json.dumps({'delta': text_delta})}\n\n"
        yield f"data: {json.dumps({'done': True})}\n\n"
    except Exception as error:
        logger.exception("AI streaming chunk error")
        yield f"data: {json.dumps({'error': str(error)})}\n\n"
