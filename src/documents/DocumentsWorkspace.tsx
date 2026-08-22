import { useEffect, useMemo, useRef, useState } from "react";
import {
  Archive, ArchiveRestore, ArrowLeft, Clipboard, Download, ExternalLink, FilePlus2, FileText,
  LoaderCircle, Pencil, RefreshCw, Search, Star, Tag, Trash2, X,
} from "lucide-react";
import {
  commandErrorMessage, documentApi,
} from "./api";
import type {
  DocumentCategory, DocumentQuery, DocumentRecord, DocumentSort, DocumentStatus,
  ExpiryFilter, ExpirySummary, PendingPdf, UpdateDocumentInput,
} from "./api";
import PdfPreview from "./PdfPreview";
import Modal from "../ui/Modal";
import SelectControl from "../ui/SelectControl";
import { useTransientNotice } from "../ui/useTransientNotice";
import "./documents.css";

const categories: Array<{ value: DocumentCategory; label: string }> = [
  { value: "identity", label: "Identidad" }, { value: "work", label: "Trabajo" },
  { value: "education", label: "Formación" }, { value: "finance", label: "Finanzas" },
  { value: "health", label: "Salud" }, { value: "housing", label: "Vivienda" },
  { value: "vehicles", label: "Vehículos" }, { value: "resume", label: "Currículum" },
  { value: "other", label: "Otros" },
];
const categoryLabels = Object.fromEntries(categories.map(({ value, label }) => [value, label])) as Record<DocumentCategory, string>;
const expiryLabels = { noExpiry: "Sin caducidad", expired: "Caducado", expiringSoon: "Caduca pronto", valid: "Vigente" } as const;
type Draft = { name: string; category: DocumentCategory; tags: string; documentDate: string; expiresOn: string };
const emptyDraft: Draft = { name: "", category: "other", tags: "", documentDate: "", expiresOn: "" };
const defaultQuery: DocumentQuery = { status: "active", search: null, category: null, tags: [], favoritesOnly: false, expiry: null, sort: "importedNewest" };

export default function DocumentsWorkspace() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [query, setQuery] = useState<DocumentQuery>(defaultQuery);
  const [tagFilter, setTagFilter] = useState("");
  const [knownTags, setKnownTags] = useState<string[]>([]);
  const [summary, setSummary] = useState<ExpirySummary>({ expired: 0, expiringSoon: 0 });
  const [pending, setPending] = useState<PendingPdf | null>(null);
  const pendingToken = useRef<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [selected, setSelected] = useState<DocumentRecord | null>(null);
  const [editing, setEditing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const hasLoaded = useRef(false);
  const requestSequence = useRef(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useTransientNotice();

  const refresh = async (nextQuery = query) => {
    const requestId = ++requestSequence.current;
    if (hasLoaded.current) setRefreshing(true);
    else setInitialLoading(true);
    try {
      const [items, tags, expirySummary] = await Promise.all([
        documentApi.list(nextQuery), documentApi.listTags(), documentApi.expirySummary(),
      ]);
      if (requestId !== requestSequence.current) return;
      setDocuments(items); setKnownTags(tags); setSummary(expirySummary); setError(null);
      setSelected((currentSelection) => currentSelection
        ? items.find((item) => item.id === currentSelection.id) ?? null
        : null);
    } catch (reason) {
      if (requestId === requestSequence.current) setError(commandErrorMessage(reason));
    } finally {
      if (requestId === requestSequence.current) {
        hasLoaded.current = true;
        setInitialLoading(false);
        setRefreshing(false);
      }
    }
  };

  useEffect(() => {
    const timeout = window.setTimeout(() => { void refresh(query); }, 180);
    return () => {
      window.clearTimeout(timeout);
      requestSequence.current += 1;
    };
  }, [query.status, query.search, query.category, query.tags.join("|"), query.favoritesOnly, query.expiry, query.sort]);
  useEffect(() => () => {
    if (pendingToken.current) void documentApi.discardPdf(pendingToken.current).catch(() => undefined);
  }, []);

  const choosePdf = async () => {
    try {
      const selection = await documentApi.selectPdf(); if (!selection) return;
      const previousToken = pendingToken.current;
      pendingToken.current = selection.token; setPending(selection);
      if (previousToken) void documentApi.discardPdf(previousToken).catch(() => undefined);
      setDraft({ ...emptyDraft, name: selection.originalFileName.replace(/\.pdf$/i, "") }); setError(null);
    } catch (reason) { setError(commandErrorMessage(reason)); }
  };
  const cancelImport = async () => {
    const token = pendingToken.current; pendingToken.current = null; setPending(null); setDraft(emptyDraft);
    if (token) try { await documentApi.discardPdf(token); } catch (reason) { setError(commandErrorMessage(reason)); }
  };
  const importDocument = async (event: React.FormEvent) => {
    event.preventDefault(); if (!pending) return; setBusy(true);
    try {
      const created = await documentApi.import({ ...draftToInput(draft), pendingToken: pending.token });
      pendingToken.current = null; setPending(null); setDraft(emptyDraft); setSelected(created);
      setNotice("Documento importado."); await refresh(query);
    } catch (reason) { setError(commandErrorMessage(reason)); }
    finally { setBusy(false); }
  };
  const run = async (operation: () => Promise<unknown>, message?: string | ((result: unknown) => string | undefined)) => {
    setBusy(true);
    try {
      const result = await operation();
      const noticeMessage = typeof message === "function" ? message(result) : message;
      if (noticeMessage) setNotice(noticeMessage);
      setError(null); await refresh(query); return true;
    }
    catch (reason) { setError(commandErrorMessage(reason)); return false; }
    finally { setBusy(false); }
  };
  const showStatus = (status: DocumentStatus) => { setSelected(null); setEditing(false); setQuery({ ...defaultQuery, status }); setTagFilter(""); };
  const applyTagFilter = (value: string) => {
    setTagFilter(value); setQuery((current) => ({ ...current, tags: value.split(",").map((tag) => tag.trim()).filter(Boolean) }));
  };
  const totalSize = useMemo(() => documents.reduce((sum, document) => sum + document.fileSizeBytes, 0), [documents]);
  const favorites = documents.filter((document) => document.favorite && document.status === "active");

  return <section className="documents-workspace">
    <div className="documents-toolbar">
      <div><p className="section-kicker">{query.status === "active" ? "ARCHIVO ACTIVO" : "DOCUMENTOS RETIRADOS"}</p><h2>{query.status === "active" ? "Tus documentos" : "Archivo"}</h2><p>{documents.length} documentos ({formatBytes(totalSize)})</p></div>
      <div className="documents-toolbar-actions">
        <button className="ui-archive-toggle" onClick={() => showStatus(query.status === "active" ? "archived" : "active")} type="button">{query.status === "active" ? <Archive size={17} /> : <ArrowLeft size={17} />}{query.status === "active" ? "Archivo" : "Volver"}</button>
        {query.status === "active" && <button className="primary-button" onClick={choosePdf} type="button"><FilePlus2 size={18} /> Añadir PDF</button>}
      </div>
    </div>

    {query.status === "active" && (summary.expired > 0 || summary.expiringSoon > 0) && <div className="expiry-summary">
      {summary.expired > 0 && <button onClick={() => setQuery({ ...query, expiry: "expired" })} type="button"><strong>{summary.expired}</strong> caducados</button>}
      {summary.expiringSoon > 0 && <button onClick={() => setQuery({ ...query, expiry: "nextThirtyDays" })} type="button"><strong>{summary.expiringSoon}</strong> caducan pronto</button>}
    </div>}
    {notice && <div className="documents-notice">{notice}<button onClick={() => setNotice(null)} type="button"><X size={16} /></button></div>}
    {error && <div className="documents-error" role="alert">{error}<button onClick={() => setError(null)} type="button"><X size={16} /></button></div>}

    {pending && <Modal className="document-form-dialog" labelledBy="document-form-title" onClose={() => void cancelImport()}><DocumentForm title="Nuevo documento" file={pending} draft={draft} setDraft={setDraft} knownTags={knownTags} busy={busy} submit={importDocument} cancel={cancelImport} submitLabel="Importar documento" /></Modal>}

    {query.status === "active" && favorites.length > 0 && <div className="document-favorites"><p className="section-kicker">ACCESOS RÁPIDOS</p><div>{favorites.map((document) => <button key={document.id} onClick={() => setSelected(document)} type="button"><Star fill="currentColor" size={14} />{document.name}</button>)}</div></div>}

    <div className="documents-filters">
      <label className="documents-search"><Search size={17} /><input value={query.search ?? ""} onChange={(event) => setQuery({ ...query, search: event.target.value || null })} placeholder="Buscar documentos" /></label>
      <SelectControl><select aria-label="Filtrar por categoría" value={query.category ?? ""} onChange={(event) => setQuery({ ...query, category: (event.target.value || null) as DocumentCategory | null })}><option value="">Todas las categorías</option>{categories.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}</select></SelectControl>
      <input aria-label="Filtrar por etiquetas" list="document-filter-tags" value={tagFilter} onChange={(event) => applyTagFilter(event.target.value)} placeholder="Etiquetas (comas)" /><datalist id="document-filter-tags">{knownTags.map((tag) => <option key={tag} value={tag} />)}</datalist>
      <SelectControl><select aria-label="Filtrar por caducidad" value={query.expiry ?? ""} onChange={(event) => setQuery({ ...query, expiry: (event.target.value || null) as ExpiryFilter | null })}><option value="">Cualquier caducidad</option><option value="expired">Caducados</option><option value="nextThirtyDays">Próximos 30 días</option><option value="thisYear">Este año</option><option value="noExpiry">Sin caducidad</option></select></SelectControl>
      <SelectControl><select aria-label="Ordenar documentos" value={query.sort} onChange={(event) => setQuery({ ...query, sort: event.target.value as DocumentSort })}><option value="importedNewest">Más recientes</option><option value="importedOldest">Más antiguos</option><option value="name">Nombre</option><option value="expirySoonest">Caducan antes</option><option value="expiryLatest">Caducan después</option></select></SelectControl>
      {query.status === "active" && <label className="favorite-filter"><input checked={query.favoritesOnly} onChange={(event) => setQuery({ ...query, favoritesOnly: event.target.checked })} type="checkbox" /> Solo favoritos</label>}
    </div>

    <div className="documents-layout">
      <div className="documents-list" aria-busy={initialLoading || refreshing}>
        {initialLoading && <EmptyState loading />}
        {!initialLoading && documents.length === 0 && <EmptyState archived={query.status === "archived"} choosePdf={choosePdf} />}
        {!initialLoading && documents.map((document) => <DocumentRow key={document.id} document={document} selected={selected?.id === document.id} open={() => { setSelected(document); setEditing(false); }} toggleFavorite={() => void run(() => documentApi.setFavorite(document.id, !document.favorite))} />)}
      </div>
    </div>
    {selected && <DocumentDetail document={selected} knownTags={knownTags} editing={editing} setEditing={setEditing} busy={busy} close={() => { setSelected(null); setEditing(false); }} run={run} updateSelected={setSelected} />}
  </section>;
}

function DocumentRow({ document, selected, open, toggleFavorite }: { document: DocumentRecord; selected: boolean; open: () => void; toggleFavorite: () => void }) {
  return <div className={selected ? "document-row selected" : "document-row"} onClick={open} onKeyDown={(event) => { if (event.key === "Enter") open(); }} role="button" tabIndex={0}>
    <div className="document-row-icon"><FileText size={19} /></div>
    <div className="document-row-main"><strong>{document.name}</strong><span>{document.originalFileName} ({formatBytes(document.fileSizeBytes)})</span><div>{document.tags.map((tag) => <span className="document-tag" key={tag}>{tag}</span>)}</div></div>
    <span className="document-category">{categoryLabels[document.category]}</span><span className={`document-expiry ${document.expiryStatus}`}>{expiryLabels[document.expiryStatus]}</span>
    {document.status === "active" && <button aria-label={document.favorite ? "Quitar de favoritos" : "Añadir a favoritos"} className={document.favorite ? "favorite-button active" : "favorite-button"} onClick={(event) => { event.stopPropagation(); toggleFavorite(); }} type="button"><Star fill={document.favorite ? "currentColor" : "none"} size={17} /></button>}
  </div>;
}

function DocumentDetail({ document, knownTags, editing, setEditing, busy, close, run, updateSelected }: {
  document: DocumentRecord; knownTags: string[]; editing: boolean; setEditing: (value: boolean) => void; busy: boolean; close: () => void;
  run: (operation: () => Promise<unknown>, message?: string | ((result: unknown) => string | undefined)) => Promise<boolean>; updateSelected: (document: DocumentRecord) => void;
}) {
  const [editDraft, setEditDraft] = useState<Draft>(() => documentToDraft(document));
  useEffect(() => setEditDraft(documentToDraft(document)), [document.id, document.updatedAt]);
  const saveEdit = async (event: React.FormEvent) => { event.preventDefault(); await run(async () => { const updated = await documentApi.update(document.id, draftToInput(editDraft)); updateSelected(updated); setEditing(false); }, "Datos actualizados."); };
  const replace = async () => {
    const selection = await documentApi.selectPdf(); if (!selection) return;
    if (!window.confirm(`Se sustituirá ${document.originalFileName} por ${selection.originalFileName}. No habrá historial de versiones.`)) { await documentApi.discardPdf(selection.token); return; }
    await run(async () => { const updated = await documentApi.replacePdf(document.id, selection.token); updateSelected(updated); }, "PDF reemplazado.");
  };
  const archive = async () => { if (await run(() => documentApi.archive(document.id), "Documento archivado.")) close(); };
  const restore = async () => { if (await run(() => documentApi.restore(document.id), "Documento restaurado.")) close(); };
  const remove = async () => { if (window.confirm(`¿Eliminar definitivamente “${document.name}” y su PDF privado? Esta acción no se puede deshacer.`) && await run(() => documentApi.delete(document.id), "Documento eliminado.")) close(); };

  return <Modal className="document-detail" labelledBy={editing ? "document-form-title" : "document-detail-title"} onClose={close}>
    {editing ? <DocumentForm title="Editar documento" draft={editDraft} setDraft={setEditDraft} knownTags={knownTags} busy={busy} submit={saveEdit} cancel={() => setEditing(false)} submitLabel="Guardar cambios" compact /> : <>
      <div className="document-detail-heading"><div className="document-detail-identity"><div className="document-row-icon"><FileText size={21} /></div><div><p className="section-kicker">DETALLE</p><h3 id="document-detail-title">{document.name}</h3></div></div><div className="document-detail-heading-actions">{document.status === "active" && <button className="icon-button" onClick={() => void run(() => documentApi.setFavorite(document.id, !document.favorite))} title="Favorito" type="button"><Star fill={document.favorite ? "currentColor" : "none"} size={18} /></button>}<button aria-label="Cerrar detalle" onClick={close} type="button"><X size={18} /></button></div></div>
      <p className="document-detail-file">{document.originalFileName} ({formatBytes(document.fileSizeBytes)})</p>
      <div className="document-detail-actions"><button onClick={() => void run(() => documentApi.openPdf(document.id))} type="button"><ExternalLink size={16} /> Abrir</button><button onClick={() => void run(() => documentApi.copyPdf(document.id), "PDF listo para pegar.")} type="button"><Clipboard size={16} /> Copiar</button><button onClick={() => void run(() => documentApi.saveCopy(document.id), (saved) => saved === true ? "Copia guardada." : undefined)} type="button"><Download size={16} /> Guardar copia</button></div>
      <div className="document-secondary-actions">
        {document.status === "active" ? <><button onClick={() => setEditing(true)} type="button"><Pencil size={15} /> Editar</button><button onClick={() => void replace()} type="button"><RefreshCw size={15} /> Reemplazar PDF</button><button onClick={() => void archive()} type="button"><Archive size={15} /> Archivar</button></> : <><button onClick={() => void restore()} type="button"><ArchiveRestore size={15} /> Restaurar</button><button className="danger" onClick={() => void remove()} type="button"><Trash2 size={15} /> Eliminar definitivamente</button></>}
      </div>
      <dl><div><dt>Categoría</dt><dd>{categoryLabels[document.category]}</dd></div><div><dt>Estado</dt><dd>{expiryLabels[document.expiryStatus]}</dd></div><div><dt>Fecha del documento</dt><dd>{formatDate(document.documentDate)}</dd></div><div><dt>Caducidad</dt><dd>{formatDate(document.expiresOn)}</dd></div></dl>
      {document.tags.length > 0 && <div className="document-detail-tags"><span><Tag size={15} /> Etiquetas</span><div>{document.tags.map((tag) => <span className="document-tag" key={tag}>{tag}</span>)}</div></div>}
      <PdfPreview documentId={document.id} />
    </>}
  </Modal>;
}

function DocumentForm({ title, file, draft, setDraft, knownTags, busy, submit, cancel, submitLabel, compact = false }: {
  title: string; file?: PendingPdf; draft: Draft; setDraft: (draft: Draft) => void; knownTags: string[]; busy: boolean;
  submit: (event: React.FormEvent) => void; cancel: () => void; submitLabel: string; compact?: boolean;
}) {
  return <form className={compact ? "document-import compact" : "document-import"} onSubmit={submit}>
    <div className="document-import-heading"><div><p className="section-kicker">{title.toUpperCase()}</p><h3 id="document-form-title">{file?.originalFileName ?? title}</h3>{file && <span>{formatBytes(file.sizeBytes)}</span>}</div>{!compact && <button aria-label="Cancelar" onClick={cancel} type="button"><X size={19} /></button>}</div>
    <div className="document-form-grid"><label>Nombre<input autoFocus value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Ej. CV español" required /></label><label>Categoría<SelectControl><select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value as DocumentCategory })}>{categories.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}</select></SelectControl></label><label className="document-tags-field">Etiquetas (separadas por comas)<input list="known-document-tags" value={draft.tags} onChange={(event) => setDraft({ ...draft, tags: event.target.value })} placeholder="trabajo, 2026" /><datalist id="known-document-tags">{knownTags.map((tag) => <option key={tag} value={tag} />)}</datalist></label><label>Fecha del documento (opcional)<input type="date" value={draft.documentDate} onChange={(event) => setDraft({ ...draft, documentDate: event.target.value })} /></label><label>Caducidad (opcional)<input type="date" value={draft.expiresOn} onChange={(event) => setDraft({ ...draft, expiresOn: event.target.value })} /></label></div>
    <div className="document-form-actions"><button className="secondary-button" onClick={cancel} type="button">Cancelar</button><button className="primary-button" disabled={busy} type="submit">{busy ? <LoaderCircle className="spin" size={17} /> : null}{submitLabel}</button></div>
  </form>;
}

function EmptyState({ loading = false, archived = false, choosePdf }: { loading?: boolean; archived?: boolean; choosePdf?: () => void }) {
  if (loading) return <div className="documents-state"><LoaderCircle className="spin" /><p>Cargando documentos…</p></div>;
  return <div className="documents-state"><div className="documents-empty-icon">{archived ? <Archive /> : <FileText />}</div><h3>{archived ? "El archivo está vacío" : "No hay documentos aquí"}</h3><p>{archived ? "Los documentos que archives aparecerán en esta sección." : "Prueba a limpiar los filtros o añade un nuevo PDF."}</p>{choosePdf && !archived && <button className="secondary-button" onClick={choosePdf} type="button">Seleccionar PDF</button>}</div>;
}
function draftToInput(draft: Draft): UpdateDocumentInput { return { name: draft.name, category: draft.category, documentDate: draft.documentDate || null, expiresOn: draft.expiresOn || null, tags: draft.tags.split(",").map((tag) => tag.trim()).filter(Boolean) }; }
function documentToDraft(document: DocumentRecord): Draft { return { name: document.name, category: document.category, tags: document.tags.join(", "), documentDate: document.documentDate ?? "", expiresOn: document.expiresOn ?? "" }; }
function formatBytes(bytes: number) { if (bytes < 1024) return `${bytes} B`; if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`; return `${(bytes / 1024 ** 2).toFixed(1)} MB`; }
function formatDate(value: string | null) { return value ? new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`)) : "Sin fecha"; }
