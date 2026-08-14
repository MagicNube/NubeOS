CREATE TABLE documents (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL CHECK (length(trim(name)) > 0),
    normalized_name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN (
        'identity', 'work', 'education', 'finance', 'health',
        'housing', 'vehicles', 'resume', 'other'
    )),
    document_date TEXT NULL,
    expires_on TEXT NULL,
    is_favorite INTEGER NOT NULL DEFAULT 0 CHECK (is_favorite IN (0, 1)),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    original_file_name TEXT NOT NULL,
    normalized_original_file_name TEXT NOT NULL,
    stored_file_name TEXT NOT NULL UNIQUE,
    file_size_bytes INTEGER NOT NULL CHECK (file_size_bytes > 0),
    imported_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE document_tags (
    id TEXT PRIMARY KEY NOT NULL,
    label TEXT NOT NULL CHECK (length(trim(label)) > 0),
    normalized_label TEXT NOT NULL UNIQUE
);

CREATE TABLE document_tag_links (
    document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    tag_id TEXT NOT NULL REFERENCES document_tags(id) ON DELETE CASCADE,
    position INTEGER NOT NULL CHECK (position >= 0),
    PRIMARY KEY (document_id, tag_id),
    UNIQUE (document_id, position)
);

CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_category ON documents(category);
CREATE INDEX idx_documents_favorite ON documents(is_favorite);
CREATE INDEX idx_documents_expires_on ON documents(expires_on);
CREATE INDEX idx_documents_normalized_name ON documents(normalized_name);
CREATE INDEX idx_document_tag_links_tag ON document_tag_links(tag_id);
