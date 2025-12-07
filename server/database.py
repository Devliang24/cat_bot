from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime

DATABASE_URL = "sqlite:///./car_bot.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class ChatLog(Base):
    __tablename__ = "chat_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    user_input = Column(Text, nullable=False)
    
    # Trace info
    intent_detected = Column(String) # Simple intent tag if any
    rules_matched = Column(JSON) # List of rules triggered
    
    # LLM Interaction
    full_prompt = Column(Text) # The actual prompt sent to LLM
    raw_response = Column(Text) # The raw text/json from LLM
    
    # Final Output
    parsed_action = Column(JSON) # The structured action
    agent_reply = Column(Text)   # The TTS text
    
    latency_ms = Column(Integer)
    token_usage = Column(JSON) # {input_tokens: x, output_tokens: y}

def init_db():
    Base.metadata.create_all(bind=engine)
