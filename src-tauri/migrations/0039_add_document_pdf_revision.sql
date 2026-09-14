-- Identidad técnica del último reemplazo confirmado; no es historial de versiones.
ALTER TABLE documents ADD COLUMN pdf_revision TEXT NULL;
