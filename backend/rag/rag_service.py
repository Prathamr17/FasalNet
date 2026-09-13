"""
FasalNet RAG Service
Orchestrates context retrieval from the Agricultural Vector Store based on:
  - Commodity / Crop name
  - Market conditions & price trajectory
  - Real-time & forecasted weather conditions (rainfall, temperature, humidity)
  - Specific user question / query
Formats grounding context and source citations for the LLM reasoner.
"""

import logging
from typing import List, Dict, Any, Optional
from rag.vector_store import get_vector_store

logger = logging.getLogger("fasalnet.rag.service")


def retrieve_agricultural_context(
    crop: str,
    query: Optional[str] = None,
    weather_risk: Optional[str] = None,
    rain_expected_mm: float = 0.0,
    top_k: int = 4
) -> Dict[str, Any]:
    """
    Retrieve authoritative agricultural knowledge chunks relevant to the current crop,
    weather situation, and market context.
    """
    vector_store = get_vector_store()

    # Formulate targeted semantic search query
    search_terms = [crop]
    if query:
        search_terms.append(query)

    if rain_expected_mm > 5.0 or (weather_risk and weather_risk.lower() in ["high", "moderate"]):
        search_terms.extend(["rain", "harvest", "disease", "purple blotch", "blight", "fungal", "storage rot"])
    else:
        search_terms.extend(["harvest", "curing", "storage", "market strategy", "shelf life"])

    full_query = " ".join(search_terms)
    matches = vector_store.search(query=full_query, crop=crop, top_k=top_k)

    # Format chunks for LLM prompt context and frontend citations
    formatted_chunks = []
    sources = []
    seen_sources = set()

    for m in matches:
        chunk = m["chunk"]
        score = m["score"]
        org = chunk.get("organization") or chunk.get("institution") or "ICAR / State Agricultural Universities"

        formatted_chunks.append({
            "section": chunk.get("section_title", "Advisory"),
            "crop": chunk.get("crop", crop),
            "category": chunk.get("category", "Agronomic"),
            "institution": org,
            "source": chunk.get("source", "ICAR"),
            "relevance_score": score,
            "text": chunk.get("content", "")
        })

        source_key = f"{chunk.get('source')}|{chunk.get('crop')}"
        if source_key not in seen_sources:
            seen_sources.add(source_key)
            sources.append({
                "title": f"{chunk.get('crop')} - {chunk.get('section_title')}",
                "source": chunk.get("source", "ICAR"),
                "institution": org,
                "category": chunk.get("category", "Agronomic"),
                "relevance": round(score, 2)
            })

    # Prepare markdown context string for LLM injection
    context_text_blocks = []
    for idx, c in enumerate(formatted_chunks, start=1):
        context_text_blocks.append(
            f"[Source {idx}: {c['institution']} ({c['source']})]\n"
            f"Crop: {c['crop']} | Category: {c['category']}\n"
            f"{c['text']}\n"
        )

    context_prompt_string = "\n---\n".join(context_text_blocks)

    return {
        "crop": crop,
        "query": full_query,
        "chunks_count": len(formatted_chunks),
        "chunks": formatted_chunks,
        "sources": sources,
        "context_prompt_string": context_prompt_string
    }

