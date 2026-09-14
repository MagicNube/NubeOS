use nubeos_lib::{documents::{document::DocumentId, store::PdfStore}, meals::repository::apply_migrations, reading::{model::{Book, BookDraft, BookId, ReadingRun, ReadingStatus}, repository::ReadingRepository}};
use rusqlite::Connection;

#[test]
fn reproduce_pdf_replacement_interruption() {
    let root = std::env::temp_dir().join(format!("nubeos-audit-{}", uuid::Uuid::new_v4()));
    std::fs::create_dir_all(&root).unwrap();
    let source = root.join("old.pdf");
    std::fs::write(&source, b"%PDF-1.7 old").unwrap();
    let mut store = PdfStore::open(root.join("private")).unwrap();
    let id = DocumentId::new();
    let old = store.prepare(&source).unwrap();
    store.promote(&old, id).unwrap();
    store.consume(old.token()).unwrap();
    std::fs::write(&source, b"%PDF-1.7 new content").unwrap();
    let new = store.prepare(&source).unwrap();
    store.retire(id).unwrap();
    store.promote(&new, id).unwrap();
    // Simulate termination before SQLite commits: old metadata still references the same id.
    drop(store);
    let store = PdfStore::open(root.join("private")).unwrap();
    store.reconcile(&[id.stored_file_name()].into_iter().collect()).unwrap();
    assert_eq!(store.read(id).unwrap(), b"%PDF-1.7 new content");
    assert_eq!(std::fs::read_dir(root.join("private/recovery")).unwrap().count(), 1);
    std::fs::remove_dir_all(root).unwrap();
}

#[test]
fn reproduce_reading_partial_commit() {
    let mut db = Connection::open_in_memory().unwrap();
    apply_migrations(&mut db).unwrap();
    let book = Book::new(BookId::generate(), BookDraft { title: "Audit".into(), author: "Audit".into(), genres: vec![], status: ReadingStatus::Pending, score: None, opinion: None, favorite: false, started_on: None, finished_on: None }, "2026-09-09T12:00:00Z".into()).unwrap();
    ReadingRepository::new(&mut db).create(&book).unwrap();
    db.execute_batch("CREATE TRIGGER reject_sync BEFORE UPDATE ON reading_books BEGIN SELECT RAISE(ABORT, 'simulated write failure'); END;").unwrap();
    let run = ReadingRun::new(book.id.clone(), Some(chrono::NaiveDate::from_ymd_opt(2026, 9, 8).unwrap()), None, false, "2026-09-09T12:00:00Z".into()).unwrap();
    assert!(ReadingRepository::new(&mut db).create_run(&run).is_err());
    let persisted: i64 = db.query_row("SELECT count(*) FROM reading_runs", [], |r| r.get(0)).unwrap();
    assert_eq!(persisted, 1);
    assert_eq!(ReadingRepository::new(&mut db).find(&book.id).unwrap().unwrap().status, ReadingStatus::Pending);
}
