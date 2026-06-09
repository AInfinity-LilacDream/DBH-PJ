-- 新增 AI 对话会话与消息持久化表。
CREATE TABLE IF NOT EXISTS ChatSession (
    session_id    SERIAL      PRIMARY KEY,
    user_id       INT         NOT NULL
        REFERENCES SysUser(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
    title         VARCHAR(100) NOT NULL DEFAULT '新对话',
    title_status  VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (title_status IN ('pending', 'generated', 'failed')),
    created_at    TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ChatMessage (
    message_id  SERIAL      PRIMARY KEY,
    session_id  INT         NOT NULL
        REFERENCES ChatSession(session_id) ON DELETE CASCADE ON UPDATE CASCADE,
    role        VARCHAR(20) NOT NULL
        CHECK (role IN ('user', 'assistant', 'tool', 'system')),
    content     TEXT        NOT NULL,
    metadata    JSONB,
    created_at  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE QueryRecord
    ADD COLUMN IF NOT EXISTS session_id INT
        REFERENCES ChatSession(session_id) ON DELETE SET NULL ON UPDATE CASCADE,
    ADD COLUMN IF NOT EXISTS message_id INT
        REFERENCES ChatMessage(message_id) ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS idx_chatsession_user_time
    ON ChatSession(user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_chatmessage_session_time
    ON ChatMessage(session_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_queryrecord_session
    ON QueryRecord(session_id);
