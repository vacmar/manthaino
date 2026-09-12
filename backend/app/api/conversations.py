import json
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import redis
import logging
from app.core.cache import get_redis_client
from app.repository import state_repo

router = APIRouter(prefix="/conversations", tags=["Conversations"])

class MessagePayload(BaseModel):
    role: str
    content: str

logger = logging.getLogger(__name__)

@router.get("/{conversation_id}")
def get_conversation(conversation_id: str, limit: int = 10, cache: redis.Redis = Depends(get_redis_client)):
    key = f"conversations:{conversation_id}:messages"
    
    try:
        raw_messages = cache.lrange(key, -limit, -1)
    except Exception as e:
        logger.error(f"Redis unavailable: {e}")
        raw_messages = []
        
    messages = []
    if raw_messages:
        # Cache hit
        for rm in raw_messages:
            try:
                messages.append(json.loads(rm))
            except json.JSONDecodeError:
                pass
    else:
        # Cache miss or Redis failure -> DB Fallback
        messages = state_repo.get_conversation(conversation_id)
        if messages:
            try:
                # Populate cache
                for m in messages:
                    cache.rpush(key, json.dumps(m))
                cache.expire(key, 3600)  # 1 hour TTL
            except Exception as e:
                logger.error(f"Failed to populate Redis cache: {e}")
        
    # Respect limit for DB fallback too
    messages = messages[-limit:]
            
    try:
        summary = cache.get(f"conversations:{conversation_id}:summary") or "No summary available."
    except Exception:
        summary = "No summary available."
    
    return {
        "conversation_id": conversation_id,
        "summary": summary,
        "recent_messages": messages
    }

@router.post("/{conversation_id}/messages")
def add_message(conversation_id: str, payload: MessagePayload, cache: redis.Redis = Depends(get_redis_client)):
    key = f"conversations:{conversation_id}:messages"
    msg_dict = payload.model_dump()
    
    # 1. DB First (Durable Write)
    try:
        state_repo.save_conversation_message(conversation_id, msg_dict)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Database write failed")
    
    # 2. Redis Update (Ephemeral)
    try:
        message_str = json.dumps(msg_dict)
        cache.rpush(key, message_str)
        cache.expire(key, 3600)  # Reset TTL
    except Exception as e:
        logger.error(f"Failed to update Redis cache: {e}")
        # We don't fail the request because DB write succeeded!
    
    return {"status": "success", "conversation_id": conversation_id}
