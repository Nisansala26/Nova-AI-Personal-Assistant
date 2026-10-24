import json
import logging
import os
from collections.abc import AsyncGenerator, Sequence
from typing import Optional

from dotenv import load_dotenv
import httpx
from openai import AsyncOpenAI

load_dotenv()

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = (
    "You are Nova, an intelligent, professional, and helpful cyber-luxe personal AI assistant. "
    "Keep your answers concise, clear, and well-structured using GitHub-flavored Markdown. "
    "When explaining code, always include language tags. Be polite and helpful."
)


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
    client = get_ai_client()
    system_msg = SYSTEM_PROMPT
    if system_extra:
        system_msg += f"\n\n{system_extra}"

    messages = [
        {"role": "system", "content": system_msg},
        *conversation_history,
        {"role": "user", "content": prompt},
    ]

    try:
        result = await client.chat.completions.create(
            model=os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
            messages=messages,
        )
        content = result.choices[0].message.content
        if not content:
            raise RuntimeError("The AI provider returned an empty response.")
        return content
    except Exception as error:
        logger.exception("AI provider request failed")
        raise RuntimeError("AI provider request failed.") from error


async def stream_ai(
    prompt: str,
    conversation_history: Sequence[dict[str, str]] = (),
    system_extra: Optional[str] = None,
) -> AsyncGenerator[str, None]:
    """Stream token chunks from Groq as Server-Sent Event formatted strings."""
    client = get_ai_client()
    system_msg = SYSTEM_PROMPT
    if system_extra:
        system_msg += f"\n\n{system_extra}"

    messages = [
        {"role": "system", "content": system_msg},
        *conversation_history,
        {"role": "user", "content": prompt},
    ]

    try:
        response_stream = await client.chat.completions.create(
            model=os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
            messages=messages,
            stream=True,
        )
        async for chunk in response_stream:
            if chunk.choices and chunk.choices[0].delta.content:
                text_delta = chunk.choices[0].delta.content
                yield f"data: {json.dumps({'delta': text_delta})}\n\n"
        yield f"data: {json.dumps({'done': True})}\n\n"
    except Exception as error:
        logger.exception("AI streaming failed")
        yield f"data: {json.dumps({'error': str(error)})}\n\n"
