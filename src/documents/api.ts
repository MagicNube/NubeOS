import { invoke } from "@tauri-apps/api/core";

export type DocumentCategory =
  | "identity" | "work" | "education" | "finance" | "health"
  | "housing" | "vehicles" | "resume" | "other";

export type ExpiryStatus = "noExpiry" | "expired" | "expiringSoon" | "valid";
export type DocumentStatus = "active" | "archived";
export type DocumentSort = "importedNewest" | "importedOldest" | "name" | "expirySoonest" | "expiryLatest";
export type ExpiryFilter = "expired" | "nextThirtyDays" | "thisYear" | "noExpiry";

export type PendingPdf = {
  token: string;
  originalFileName: string;
  sizeBytes: number;
};

export type DocumentRecord = {
  id: string;
  name: string;
  category: DocumentCategory;
  documentDate: string | null;
  expiresOn: string | null;
  expiryStatus: ExpiryStatus;
  favorite: boolean;
  status: DocumentStatus;
  originalFileName: string;
  fileSizeBytes: number;
  importedAt: string;
  updatedAt: string;
  tags: string[];
};

export type ImportDocumentInput = {
  name: string;
  category: DocumentCategory;
  documentDate: string | null;
  expiresOn: string | null;
  tags: string[];
  pendingToken: string;
};

export type DocumentQuery = {
  status: DocumentStatus;
  search: string | null;
  category: DocumentCategory | null;
  tags: string[];
  favoritesOnly: boolean;
  expiry: ExpiryFilter | null;
  sort: DocumentSort;
};

export type UpdateDocumentInput = Omit<ImportDocumentInput, "pendingToken">;
export type ExpirySummary = { expired: number; expiringSoon: number };

export const documentApi = {
  selectPdf: () => invoke<PendingPdf | null>("select_document_pdf"),
  discardPdf: (token: string) => invoke<void>("discard_pending_document_pdf", { token }),
  import: (input: ImportDocumentInput) => invoke<DocumentRecord>("import_document", { input }),
  list: (input: DocumentQuery) => invoke<DocumentRecord[]>("list_documents", { input }),
  get: (documentId: string) => invoke<DocumentRecord>("get_document", { documentId }),
  listTags: (search?: string) => invoke<string[]>("list_document_tags", { search: search || null }),
  expirySummary: () => invoke<ExpirySummary>("get_document_expiry_summary"),
  update: (documentId: string, input: UpdateDocumentInput) => invoke<DocumentRecord>("update_document", { documentId, input }),
  setFavorite: (documentId: string, favorite: boolean) => invoke<void>("set_document_favorite", { documentId, favorite }),
  archive: (documentId: string) => invoke<void>("archive_document", { documentId }),
  restore: (documentId: string) => invoke<void>("restore_document", { documentId }),
  delete: (documentId: string) => invoke<void>("delete_document", { documentId }),
  replacePdf: (documentId: string, pendingToken: string) => invoke<DocumentRecord>("replace_document_pdf", { documentId, pendingToken }),
  readPdf: (documentId: string) => invoke<ArrayBuffer>("read_document_pdf", { documentId }),
  openPdf: (documentId: string) => invoke<void>("open_document_pdf", { documentId }),
  saveCopy: (documentId: string) => invoke<boolean>("save_document_copy", { documentId }),
  copyPdf: (documentId: string) => invoke<void>("copy_document_pdf", { documentId }),
};

export function commandErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return typeof error === "string" ? error : "No se ha podido completar la operación.";
}
