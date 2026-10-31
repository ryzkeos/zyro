from datetime import datetime, timezone
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = "users"

    id              = db.Column(db.String(36), primary_key=True)
    username        = db.Column(db.String(80), unique=True, nullable=False)
    email           = db.Column(db.String(120), unique=True, nullable=False)
    password        = db.Column(db.String(256), nullable=False)  # bcrypt hash
    ai_instructions = db.Column(db.Text, default='', nullable=False, server_default='')
    created_at      = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    conversations = db.relationship("Conversation", back_populates="user",
                                    cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "ai_instructions": self.ai_instructions or '',
            "created_at": self.created_at.isoformat()
        }


class Conversation(db.Model):
    __tablename__ = "conversations"

    id           = db.Column(db.String(36), primary_key=True)
    user_id      = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False)
    title        = db.Column(db.String(200), default="New Conversation")
    pinned       = db.Column(db.Boolean, default=False)
    last_updated = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc),
                             onupdate=lambda: datetime.now(timezone.utc))
    created_at   = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    user     = db.relationship("User", back_populates="conversations")
    messages = db.relationship("Message", back_populates="conversation",
                               cascade="all, delete-orphan",
                               order_by="Message.timestamp")

    def to_dict(self, include_messages=False):
        data = {
            "id": self.id,
            "title": self.title,
            "pinned": self.pinned,
            "lastUpdated": int(self.last_updated.timestamp() * 1000),
            "createdAt": int(self.created_at.timestamp() * 1000),
        }
        if include_messages:
            data["messages"] = [m.to_dict() for m in self.messages]
        return data


class Message(db.Model):
    __tablename__ = "messages"

    id              = db.Column(db.String(36), primary_key=True)
    conversation_id = db.Column(db.String(36), db.ForeignKey("conversations.id"), nullable=False)
    role            = db.Column(db.String(10), nullable=False)   # 'user' | 'assistant'
    content         = db.Column(db.Text, nullable=False)
    is_error        = db.Column(db.Boolean, default=False)
    timestamp       = db.Column(db.BigInteger, nullable=False)   # ms epoch

    conversation = db.relationship("Conversation", back_populates="messages")

    def to_dict(self):
        return {
            "id": self.id,
            "role": self.role,
            "content": self.content,
            "isError": self.is_error,
            "timestamp": self.timestamp,
        }
