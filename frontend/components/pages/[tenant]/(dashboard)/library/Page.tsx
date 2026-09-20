"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchBooks, fetchIssues, fetchOverdue,
  createBook, updateBook, issueBook, returnBook,
} from "@/store/slices/librarySlice";
import Header from "@/components/layout/Header";
import { Badge } from "@/components/ui/badge";
import { BulkUploadButton } from "@/components/ui/BulkUpload";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import LibraryVisualizer from "./Visualizer";
import IssueBookModal from "./IssueBookModal";
import Can from "@/components/access/Can";
import toast from "react-hot-toast";
import type { LibraryBook } from "@/types/general/entities";
import { Plus, X, Search, AlertTriangle } from "lucide-react";

const LIBRARY_TABS = ["books", "issued", "overdue", "visualizer"];

const emptyForm = {
  title: "",
  author: "",
  isbn: "",
  publisher: "",
  publish_year: new Date().getFullYear().toString(),
  category: "",
  total_copies: "1",
  rack: "",
  shelf: "",
};

export default function LibraryPage({ initialTab = "books" }: { initialTab?: string }) {
  const dispatch = useAppDispatch();
  const params = useParams();
  const tenant = (params?.tenant as string) ?? "";
  const { books, issues, overdue, loading } = useAppSelector((s) => s.library);
  const user = useAppSelector((s) => s.auth.user);
  const isAdmin = user?.role === "admin";

  const [activeTab, setActiveTab] = useState(() =>
    LIBRARY_TABS.includes(initialTab) ? initialTab : "books"
  );

  // Reflect the active tab in the URL (/<tenant>/library/<tab>) so it survives a
  // refresh and back/forward, without a route navigation (avoids a refetch).
  const selectTab = (tab: string) => {
    setActiveTab(tab);
    if (typeof window !== "undefined")
      window.history.pushState(null, "", `/${tenant}/library/${tab}`);
  };

  const [showModal, setShowModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [search, setSearch] = useState("");
  const [editingBook, setEditingBook] = useState<LibraryBook | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  const refetchAll = () => {
    dispatch(fetchBooks({ search }));
    dispatch(fetchIssues());
    dispatch(fetchOverdue());
  };

  useEffect(() => {
    dispatch(fetchBooks({ search }));
    dispatch(fetchIssues());
    dispatch(fetchOverdue());
  }, [dispatch, search]);

  // Keep the tab in sync when the user uses browser back/forward.
  useEffect(() => {
    const onPop = () => {
      const seg = window.location.pathname.split("/").filter(Boolean);
      const t = seg[seg.indexOf("library") + 1];
      setActiveTab(LIBRARY_TABS.includes(t) ? t : "books");
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const openNewBook = () => {
    setEditingBook(null);
    setForm({ ...emptyForm });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingBook(null);
  };

  const handleCreateBook = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await dispatch(
      createBook({
        title: form.title,
        author: form.author,
        isbn: form.isbn,
        publisher: form.publisher,
        publishYear: parseInt(form.publish_year) || 0,
        category: form.category,
        totalCopies: parseInt(form.total_copies) || 1,
        rack: form.rack,
        shelf: form.shelf,
      })
    );
    if (createBook.fulfilled.match(result)) {
      toast.success("Book created");
      closeModal();
    } else {
      toast.error(result.payload as string);
    }
  };

  const handleUpdateBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBook) return;
    const result = await dispatch(
      updateBook({
        id: editingBook.id,
        input: {
          title: form.title,
          author: form.author,
          isbn: form.isbn,
          publisher: form.publisher,
          publishYear: parseInt(form.publish_year) || 0,
          category: form.category,
          totalCopies: parseInt(form.total_copies) || 1,
          rack: form.rack,
          shelf: form.shelf,
        },
      })
    );
    if (updateBook.fulfilled.match(result)) {
      toast.success("Book updated");
      closeModal();
    } else {
      toast.error(result.payload as string);
    }
  };

  const openEditBook = (book: LibraryBook) => {
    setEditingBook(book);
    setForm({
      ...emptyForm,
      title: book.title ?? "",
      author: book.author ?? "",
      isbn: book.isbn ?? "",
      publisher: book.publisher ?? "",
      publish_year: String(book.publish_year ?? new Date().getFullYear()),
      category: book.category ?? "",
      total_copies: String(book.total_copies ?? 1),
      rack: book.rack ?? "",
      shelf: book.shelf ?? "",
    });
    setShowModal(true);
  };

  // Issuing is handled by IssueBookModal, which resolves the book + borrower to
  // their ids and calls back here. Returns true on success so the modal closes.
  const handleIssueSubmit = async (input: { bookId: string; userId: string; dueDate: string }) => {
    const result = await dispatch(issueBook(input));
    if (issueBook.fulfilled.match(result)) {
      toast.success("Book issued");
      dispatch(fetchIssues());
      dispatch(fetchBooks({ search }));
      return true;
    }
    toast.error(result.payload as string);
    return false;
  };

  const handleReturn = async (id: string) => {
    const result = await dispatch(
      returnBook({ id, input: { returnDate: new Date().toISOString().split("T")[0] } })
    );
    if (returnBook.fulfilled.match(result)) {
      toast.success("Book returned");
    } else {
      toast.error(result.payload as string);
    }
  };

  const filteredBooks = books.filter((b) =>
    [b.title, b.author, b.isbn, b.category, b.rack, b.shelf].some((v) =>
      String(v ?? "").toLowerCase().includes(search.toLowerCase())
    )
  );

  const filteredIssues = search
    ? issues.filter((issue) =>
        [issue.book?.title, issue.user?.name, issue.status].some((v) =>
          String(v ?? "").toLowerCase().includes(search.toLowerCase())
        )
      )
    : issues;

  const filteredOverdue = search
    ? overdue.filter((issue) =>
        [issue.book?.title, issue.user?.name].some((v) =>
          String(v ?? "").toLowerCase().includes(search.toLowerCase())
        )
      )
    : overdue;

  return (
    <div>
      <Header
        title="Library Management"
        subtitle="Manage books, shelf locations and issues"
        action={
          isAdmin && (activeTab === "books" || activeTab === "issued") ? (
            <div className="flex items-center gap-2">
              {activeTab === "books" && (
                <BulkUploadButton resource="library_books" label="Bulk Books" onFinished={refetchAll} />
              )}
              {activeTab === "issued" && (
                <BulkUploadButton resource="library_issues" label="Bulk Issues" onFinished={refetchAll} />
              )}
              <Can module="library" action="create">
                <button
                  className="btn-primary flex items-center gap-2"
                  onClick={activeTab === "books" ? openNewBook : () => setShowIssueModal(true)}
                >
                  <Plus size={16} /> New {activeTab === "books" ? "Book" : "Issue"}
                </button>
              </Can>
            </div>
          ) : undefined
        }
      />

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-border">
        {LIBRARY_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => selectTab(tab)}
            className={`px-4 py-2 font-medium text-sm transition capitalize flex items-center gap-2 ${
              activeTab === tab
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
            {tab === "overdue" && overdue.length > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full px-2">{overdue.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Books Tab */}
      {activeTab === "books" && (
        <>
          <div className="mb-6 relative">
            <Search className="absolute left-3 top-2.5 text-muted-foreground" size={18} />
            <input
              type="text"
              placeholder="Search books by title, author, rack or shelf..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg text-sm"
            />
          </div>

          <div className="card p-0 overflow-hidden">
            {loading ? (
              <LoadingSpinner />
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b border-border">
                  <tr>
                    <th className="table-th">Title</th>
                    <th className="table-th">Author</th>
                    <th className="table-th">ISBN</th>
                    <th className="table-th">Category</th>
                    <th className="table-th">Rack</th>
                    <th className="table-th">Shelf</th>
                    <th className="table-th">Available</th>
                    <th className="table-th">Total</th>
                    {isAdmin && <th className="table-th">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredBooks.map((book) => (
                    <tr key={book.id} className="hover:bg-muted/50">
                      <td className="table-td font-medium">{book.title}</td>
                      <td className="table-td">{book.author}</td>
                      <td className="table-td text-xs text-muted-foreground">{book.isbn}</td>
                      <td className="table-td capitalize">{book.category}</td>
                      <td className="table-td">{book.rack || <span className="text-muted-foreground">—</span>}</td>
                      <td className="table-td">{book.shelf || <span className="text-muted-foreground">—</span>}</td>
                      <td className="table-td">
                        <Badge variant={book.available_copies > 0 ? "secondary" : "destructive"}>
                          {book.available_copies}
                        </Badge>
                      </td>
                      <td className="table-td">{book.total_copies}</td>
                      {isAdmin && (
                        <td className="table-td">
                          <Can module="library" action="edit">
                            <button onClick={() => openEditBook(book)} className="text-sm text-blue-500 hover:underline">
                              Edit
                            </button>
                          </Can>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* Issued Tab */}
      {activeTab === "issued" && (
        <div className="card p-0 overflow-hidden">
          {loading ? (
            <LoadingSpinner />
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b border-border">
                <tr>
                  <th className="table-th">Book</th>
                  <th className="table-th">Borrower</th>
                  <th className="table-th">Issue Date</th>
                  <th className="table-th">Due Date</th>
                  <th className="table-th">Status</th>
                  {isAdmin && <th className="table-th">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredIssues.map((issue) => {
                  const isOverdue = !issue.return_date && new Date(issue.due_date) < new Date();
                  return (
                    <tr key={issue.id} className={isOverdue ? "bg-red-50/30 hover:bg-red-50/50" : "hover:bg-muted/50"}>
                      <td className="table-td font-medium">{issue.book?.title}</td>
                      <td className="table-td">{issue.user?.name}</td>
                      <td className="table-td">{new Date(issue.issue_date).toLocaleDateString()}</td>
                      <td className="table-td">{new Date(issue.due_date).toLocaleDateString()}</td>
                      <td className="table-td">
                        <Badge
                          variant={
                            issue.status === "returned" ? "secondary" : isOverdue ? "destructive" : "default"
                          }
                        >
                          {isOverdue ? "Overdue" : issue.status}
                        </Badge>
                      </td>
                      {isAdmin && (
                        <td className="table-td">
                          {issue.status !== "returned" && (
                            <Can module="library" action="edit">
                              <button
                                onClick={() => handleReturn(issue.id)}
                                className="text-sm text-green-500 hover:underline"
                              >
                                Return
                              </button>
                            </Can>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Overdue Tab */}
      {activeTab === "overdue" && (
        <div className="space-y-4">
          {overdue.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-muted-foreground">No overdue books</p>
            </div>
          ) : (
            filteredOverdue.map((issue) => (
              <div key={issue.id} className="card p-4 border-l-4 border-red-500">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold flex items-center gap-2">
                      <AlertTriangle size={16} className="text-red-500" />
                      {issue.book?.title}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">Borrower: {issue.user?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Due: {new Date(issue.due_date).toLocaleDateString()}
                    </p>
                    {issue.fine_amount > 0 && (
                      <p className="text-sm text-red-600 font-medium mt-2">Fine: ₹{issue.fine_amount}</p>
                    )}
                  </div>
                  {isAdmin && (
                    <Can module="library" action="edit">
                      <button onClick={() => handleReturn(issue.id)} className="btn-secondary text-sm">
                        Mark Returned
                      </button>
                    </Can>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Visualizer Tab */}
      {activeTab === "visualizer" && <LibraryVisualizer />}

      {/* Add / Edit Book modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{editingBook ? "Edit Book" : "Add Book"}</h3>
              <button onClick={closeModal} className="p-1 hover:bg-muted rounded">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={editingBook ? handleUpdateBook : handleCreateBook} className="space-y-4">
              <Field label="Title" required value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
              <Field label="Author" required value={form.author} onChange={(v) => setForm({ ...form, author: v })} />
              <Field label="ISBN" value={form.isbn} onChange={(v) => setForm({ ...form, isbn: v })} />
              <Field label="Publisher" value={form.publisher} onChange={(v) => setForm({ ...form, publisher: v })} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Year" type="number" value={form.publish_year} onChange={(v) => setForm({ ...form, publish_year: v })} />
                <Field label="Copies" type="number" value={form.total_copies} onChange={(v) => setForm({ ...form, total_copies: v })} />
              </div>
              <Field label="Category" value={form.category} onChange={(v) => setForm({ ...form, category: v })} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Rack" placeholder="e.g. A3" value={form.rack} onChange={(v) => setForm({ ...form, rack: v })} />
                <Field label="Shelf" placeholder="e.g. 2" value={form.shelf} onChange={(v) => setForm({ ...form, shelf: v })} />
              </div>

              <button type="submit" className="w-full btn-primary mt-6">
                {editingBook ? "Save Book" : "Add Book"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Issue Book modal (searchable book + student/staff borrower) */}
      <IssueBookModal
        open={showIssueModal}
        onClose={() => setShowIssueModal(false)}
        onSubmit={handleIssueSubmit}
      />
    </div>
  );
}

// Small labelled input used throughout the book form.
function Field({
  label, value, onChange, type = "text", required = false, placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <input
        type={type}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-border rounded-lg text-sm"
      />
    </div>
  );
}
