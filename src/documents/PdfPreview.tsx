import { useEffect, useRef, useState } from "react";
import { FileWarning, LoaderCircle } from "lucide-react";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { commandErrorMessage, documentApi } from "./api";

GlobalWorkerOptions.workerSrc = workerUrl;

export default function PdfPreview({ documentId }: { documentId: string }) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loading = { current: null as ReturnType<typeof getDocument> | null };
    setPdf(null); setError(null);
    void documentApi.readPdf(documentId).then((buffer) => {
      if (cancelled) return;
      const bytes = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : new Uint8Array(buffer as ArrayBuffer);
      loading.current = getDocument({ data: bytes });
      return loading.current.promise;
    }).then((loaded) => {
      if (!loaded) return;
      if (!cancelled) setPdf(loaded);
    }).catch((reason) => { if (!cancelled) setError(commandErrorMessage(reason)); });
    return () => {
      cancelled = true;
      if (loading.current) void loading.current.destroy();
    };
  }, [documentId]);

  if (error) return <div className="pdf-state error"><FileWarning size={22} /><p>{error}</p></div>;
  if (!pdf) return <div className="pdf-state"><LoaderCircle className="spin" size={22} /><p>Cargando previsualización…</p></div>;
  return <div className="pdf-preview" aria-label={`PDF de ${pdf.numPages} páginas`}>
    <div className="pdf-preview-heading">{pdf.numPages} {pdf.numPages === 1 ? "página" : "páginas"}</div>
    {Array.from({ length: pdf.numPages }, (_, index) => <PdfPage key={index + 1} pdf={pdf} pageNumber={index + 1} />)}
  </div>;
}

function PdfPage({ pdf, pageNumber }: { pdf: PDFDocumentProxy; pageNumber: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    let renderTask: RenderTask | null = null;
    setError(false);
    const render = async () => {
      const page = await pdf.getPage(pageNumber);
      if (cancelled || !canvasRef.current || !containerRef.current) return;
      const base = page.getViewport({ scale: 1 });
      const scale = Math.min(1.5, Math.max(0.5, (containerRef.current.clientWidth - 20) / base.width));
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      if (!context) return;
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.floor(viewport.width * ratio); canvas.height = Math.floor(viewport.height * ratio);
      canvas.style.width = `${Math.floor(viewport.width)}px`; canvas.style.height = `${Math.floor(viewport.height)}px`;
      renderTask = page.render({ canvas, canvasContext: context, viewport, transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0] });
      await renderTask.promise;
      page.cleanup();
    };
    void render().catch((reason) => { if (!cancelled && reason?.name !== "RenderingCancelledException") setError(true); });
    return () => { cancelled = true; renderTask?.cancel(); };
  }, [pdf, pageNumber]);
  return <div className="pdf-page" ref={containerRef}><span>Página {pageNumber}</span>{error ? <p>No se ha podido dibujar esta página.</p> : <canvas ref={canvasRef} />}</div>;
}
