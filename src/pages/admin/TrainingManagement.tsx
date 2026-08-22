import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  ChevronLeft,
  Plus,
  Pencil,
  Trash2,
  Eye,
  ArrowUp,
  ArrowDown,
  BookOpen,
  ClipboardList,
  RotateCcw,
  X,
  Search,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useToast } from '@/components/Toast';
import { LoadingScreen } from '@/components/LoadingScreen';
import type { AdminCourseListItem, AdminChapter, AdminQuestion, AdminAnswer } from '@/types';

type View =
  | { type: 'list' }
  | { type: 'chapters'; courseId: string }
  | { type: 'lessons'; courseId: string; chapterId: string }
  | { type: 'assessment'; courseId: string }
  | { type: 'preview'; courseId: string };

type PublishFilter = 'ALL' | 'PUBLISHED' | 'UNPUBLISHED' | 'REQUIRED' | 'OPTIONAL';

export function AdminTrainingManagement() {
  const authStatus = useStore((s) => s.authStatus);
  const currentUser = useStore((s) => s.currentUser);
  const login = useStore((s) => s.login);
  const logout = useStore((s) => s.logout);
  const showToast = useToast();

  const isAdmin = currentUser?.role === 'ADMIN';
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const [view, setView] = useState<View>({ type: 'list' });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoggingIn(true);
    const result = await login(email, pass);
    if (!result.ok) {
      setLoggingIn(false);
      setLoginError(result.error || 'Invalid credentials.');
      return;
    }
    if (useStore.getState().currentUser?.role !== 'ADMIN') {
      await logout();
      setLoggingIn(false);
      setLoginError('Invalid credentials.');
      return;
    }
    setLoggingIn(false);
    showToast('Admin login successful.', 'success');
  };

  if (authStatus === 'idle' || authStatus === 'loading') return <LoadingScreen />;

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-ink-900">
        <nav className="sticky top-9 z-40 border-b border-ink-700 bg-ink-900/90 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
            <Link to="/" className="text-xl font-extrabold text-brand-400">Adparlorr</Link>
            <Link to="/" className="flex items-center gap-1 text-sm text-ink-300 hover:text-brand-400">
              <ChevronLeft className="h-4 w-4" /> Back
            </Link>
          </div>
        </nav>
        <div className="mx-auto flex max-w-md flex-col items-center px-5 py-16 sm:px-8">
          <div className="w-full card !p-8">
            <div className="text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-500/15">
                <Shield className="h-7 w-7 text-brand-400" />
              </div>
              <h2 className="mt-4 text-2xl font-bold text-white">Admin Panel</h2>
              <p className="mt-1 text-sm text-ink-400">Authorized personnel only.</p>
            </div>
            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink-200">Email</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="input-base mt-1.5" placeholder="admin@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-200">Password</label>
                <input type="password" required value={pass} onChange={(e) => setPass(e.target.value)}
                  className="input-base mt-1.5" placeholder="••••••••" />
              </div>
              {loginError && <p className="rounded-lg bg-red-500/15 px-4 py-2.5 text-sm text-red-300">{loginError}</p>}
              <button type="submit" disabled={loggingIn} className="btn-brand w-full py-3 disabled:opacity-60">
                {loggingIn ? 'Logging In…' : 'Log In'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-950">
      <nav className="sticky top-9 z-40 border-b border-ink-700 bg-ink-900">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-brand-400" />
            <span className="text-lg font-extrabold text-brand-400">Training Management</span>
          </div>
          <Link to="/admin" className="flex items-center gap-1 text-sm text-ink-300 hover:text-brand-400">
            <ChevronLeft className="h-4 w-4" /> Back to Admin
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
        {view.type === 'list' && <CourseListView onNavigate={setView} />}
        {view.type === 'chapters' && (
          <ChaptersView courseId={view.courseId} onBack={() => setView({ type: 'list' })} onNavigate={setView} />
        )}
        {view.type === 'lessons' && (
          <LessonsView
            courseId={view.courseId}
            chapterId={view.chapterId}
            onBack={() => setView({ type: 'chapters', courseId: view.courseId })}
          />
        )}
        {view.type === 'assessment' && (
          <AssessmentView courseId={view.courseId} onBack={() => setView({ type: 'list' })} />
        )}
        {view.type === 'preview' && (
          <PreviewView courseId={view.courseId} onBack={() => setView({ type: 'list' })} />
        )}
      </div>
    </div>
  );
}

// ============================================================
// Course list
// ============================================================

function CourseListView({ onNavigate }: { onNavigate: (v: View) => void }) {
  const courses = useStore((s) => s.adminTrainingCourses);
  const fetchAdminTrainingCourses = useStore((s) => s.fetchAdminTrainingCourses);
  const updateAdminTrainingCourse = useStore((s) => s.updateAdminTrainingCourse);
  const deleteAdminTrainingCourse = useStore((s) => s.deleteAdminTrainingCourse);
  const showToast = useToast();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<PublishFilter>('ALL');
  const [showCreate, setShowCreate] = useState(false);
  const [editingCourse, setEditingCourse] = useState<AdminCourseListItem | null>(null);
  const [deletingCourse, setDeletingCourse] = useState<AdminCourseListItem | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminTrainingCourses();
  }, [fetchAdminTrainingCourses]);

  const filtered = courses.filter((c) => {
    if (search && !c.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === 'PUBLISHED' && !c.isPublished) return false;
    if (filter === 'UNPUBLISHED' && c.isPublished) return false;
    if (filter === 'REQUIRED' && !c.isRequired) return false;
    if (filter === 'OPTIONAL' && c.isRequired) return false;
    return true;
  });

  const handleTogglePublish = async (course: AdminCourseListItem) => {
    setBusyId(course.id);
    const result = await updateAdminTrainingCourse(course.id, { isPublished: !course.isPublished });
    setBusyId(null);
    if (!result.ok) {
      showToast(result.error || 'Failed to update course.', 'error');
      return;
    }
    showToast(course.isPublished ? 'Course unpublished.' : 'Course published.', 'success');
  };

  const handleDelete = async () => {
    if (!deletingCourse) return;
    setBusyId(deletingCourse.id);
    const result = await deleteAdminTrainingCourse(deletingCourse.id);
    setBusyId(null);
    setDeletingCourse(null);
    if (!result.ok) {
      showToast(result.error || 'Failed to delete course.', 'error');
      return;
    }
    showToast('Course deleted.', 'success');
  };

  return (
    <>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Training Management</h1>
          <p className="mt-1 text-sm text-ink-400">Create, edit, and organize training courses.</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-brand">
          <Plus className="h-4 w-4" /> Create Training
        </button>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search training…"
            className="input-base pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(['ALL', 'PUBLISHED', 'UNPUBLISHED', 'REQUIRED', 'OPTIONAL'] as PublishFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                filter === f
                  ? 'border-brand-500 bg-brand-500/15 text-brand-300'
                  : 'border-ink-600 text-ink-400 hover:border-ink-500'
              }`}
            >
              {f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {filtered.length === 0 ? (
          <div className="card sm:col-span-2 text-center text-sm text-ink-400">No training courses found.</div>
        ) : (
          filtered.map((course) => {
            const chapterCount = course.chapters.length;
            const busy = busyId === course.id;
            return (
              <div key={course.id} className="card">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-lg font-bold text-white">{course.title}</h3>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      course.isPublished ? 'bg-brand-500/15 text-brand-300' : 'bg-ink-700 text-ink-400'
                    }`}
                  >
                    {course.isPublished ? 'Published' : 'Unpublished'}
                  </span>
                </div>
                {course.isRequired && (
                  <span className="mt-1.5 inline-block rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-300">
                    Required
                  </span>
                )}
                <p className="mt-2 text-xs text-ink-400">
                  {chapterCount} {chapterCount === 1 ? 'Chapter' : 'Chapters'} ·{' '}
                  {course.assessment ? 'Final Assessment' : 'No assessment'}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button onClick={() => setEditingCourse(course)} className="btn-ghost !px-3 !py-1.5 text-xs">
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => onNavigate({ type: 'chapters', courseId: course.id })}
                    className="btn-ghost !px-3 !py-1.5 text-xs"
                  >
                    <BookOpen className="h-3.5 w-3.5" /> Manage Chapters
                  </button>
                  <button
                    onClick={() => onNavigate({ type: 'assessment', courseId: course.id })}
                    className="btn-ghost !px-3 !py-1.5 text-xs"
                  >
                    <ClipboardList className="h-3.5 w-3.5" /> Assessment
                  </button>
                  <button
                    onClick={() => onNavigate({ type: 'preview', courseId: course.id })}
                    className="btn-ghost !px-3 !py-1.5 text-xs"
                  >
                    <Eye className="h-3.5 w-3.5" /> Preview
                  </button>
                  <button
                    onClick={() => handleTogglePublish(course)}
                    disabled={busy}
                    className="btn-ghost !px-3 !py-1.5 text-xs disabled:opacity-60"
                  >
                    {course.isPublished ? 'Unpublish' : 'Publish'}
                  </button>
                  <button
                    onClick={() => setDeletingCourse(course)}
                    disabled={busy}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-red-400 transition hover:bg-red-500/15 disabled:opacity-60"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {showCreate && (
        <CourseFormModal
          mode="create"
          onClose={() => setShowCreate(false)}
          onSaved={() => setShowCreate(false)}
        />
      )}
      {editingCourse && (
        <CourseFormModal
          mode="edit"
          course={editingCourse}
          onClose={() => setEditingCourse(null)}
          onSaved={() => setEditingCourse(null)}
        />
      )}
      {deletingCourse && (
        <ConfirmModal
          title="Delete course?"
          message={`This permanently deletes "${deletingCourse.title}" and all of its chapters, lessons, and assessment questions. This cannot be undone.`}
          confirmLabel="Delete"
          danger
          onCancel={() => setDeletingCourse(null)}
          onConfirm={handleDelete}
        />
      )}
    </>
  );
}

function CourseFormModal({
  mode,
  course,
  onClose,
  onSaved,
}: {
  mode: 'create' | 'edit';
  course?: AdminCourseListItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const createAdminTrainingCourse = useStore((s) => s.createAdminTrainingCourse);
  const updateAdminTrainingCourse = useStore((s) => s.updateAdminTrainingCourse);
  const showToast = useToast();

  const [title, setTitle] = useState(course?.title ?? '');
  const [slug, setSlug] = useState(course?.slug ?? '');
  const [description, setDescription] = useState(course?.description ?? '');
  const [thumbnailUrl, setThumbnailUrl] = useState(course?.thumbnailUrl ?? '');
  const [isPublished, setIsPublished] = useState(course?.isPublished ?? false);
  const [isRequired, setIsRequired] = useState(course?.isRequired ?? false);
  const [order, setOrder] = useState(String(course?.order ?? 0));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    if (!slug.trim()) {
      setError('Slug is required.');
      return;
    }
    setError('');
    setSaving(true);
    const payload = {
      title: title.trim(),
      slug: slug.trim(),
      description: description.trim() || null,
      thumbnailUrl: thumbnailUrl.trim() || null,
      isPublished,
      isRequired,
      order: Number(order) || 0,
    };
    const result =
      mode === 'create'
        ? await createAdminTrainingCourse(payload)
        : await updateAdminTrainingCourse(course!.id, payload);
    setSaving(false);
    if (!result.ok) {
      setError(result.error || 'Failed to save course.');
      return;
    }
    showToast(mode === 'create' ? 'Course created.' : 'Course updated.', 'success');
    onSaved();
  };

  return (
    <Modal title={mode === 'create' ? 'Create Training' : 'Edit Training'} onClose={onClose}>
      <div className="space-y-4">
        <Field label="Title">
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="input-base" disabled={saving} />
        </Field>
        <Field label="Slug">
          <input value={slug} onChange={(e) => setSlug(e.target.value)} className="input-base" disabled={saving} placeholder="smart-money-concepts" />
        </Field>
        <Field label="Description">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input-base min-h-[80px]" disabled={saving} />
        </Field>
        <Field label="Thumbnail URL (optional)">
          <input value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} className="input-base" disabled={saving} />
        </Field>
        <Field label="Display Order">
          <input type="number" value={order} onChange={(e) => setOrder(e.target.value)} className="input-base" disabled={saving} />
        </Field>
        <div className="flex flex-wrap gap-6">
          <Checkbox label="Published" checked={isPublished} onChange={setIsPublished} disabled={saving} />
          <Checkbox label="Required" checked={isRequired} onChange={setIsRequired} disabled={saving} />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="btn-ghost" disabled={saving}>Cancel</button>
          <button onClick={handleSave} className="btn-brand disabled:opacity-60" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ============================================================
// Chapters
// ============================================================

function ChaptersView({
  courseId,
  onBack,
  onNavigate,
}: {
  courseId: string;
  onBack: () => void;
  onNavigate: (v: View) => void;
}) {
  const course = useStore((s) => s.adminTrainingCourseDetail);
  const fetchAdminTrainingCourseDetail = useStore((s) => s.fetchAdminTrainingCourseDetail);
  const updateAdminTrainingChapter = useStore((s) => s.updateAdminTrainingChapter);
  const deleteAdminTrainingChapter = useStore((s) => s.deleteAdminTrainingChapter);
  const reorderAdminTrainingChapter = useStore((s) => s.reorderAdminTrainingChapter);
  const resetTrainingProgress = useStore((s) => s.resetTrainingProgress);
  const showToast = useToast();

  const [showCreate, setShowCreate] = useState(false);
  const [editingChapter, setEditingChapter] = useState<AdminChapter | null>(null);
  const [deletingChapter, setDeletingChapter] = useState<AdminChapter | null>(null);
  const [showReset, setShowReset] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminTrainingCourseDetail(courseId);
  }, [courseId, fetchAdminTrainingCourseDetail]);

  if (!course || course.id !== courseId) return <LoadingScreen />;

  const chapters = [...course.chapters].sort((a, b) => a.order - b.order);

  const handleTogglePublish = async (chapter: AdminChapter) => {
    setBusyId(chapter.id);
    await updateAdminTrainingChapter(chapter.id, { isPublished: !chapter.isPublished });
    setBusyId(null);
  };

  const handleMove = async (chapter: AdminChapter, direction: 'up' | 'down') => {
    setBusyId(chapter.id);
    await reorderAdminTrainingChapter(chapter.id, direction);
    setBusyId(null);
  };

  const handleDelete = async () => {
    if (!deletingChapter) return;
    setBusyId(deletingChapter.id);
    const result = await deleteAdminTrainingChapter(deletingChapter.id);
    setBusyId(null);
    setDeletingChapter(null);
    if (!result.ok) showToast(result.error || 'Failed to delete chapter.', 'error');
  };

  const handleReset = async () => {
    const result = await resetTrainingProgress(courseId);
    setShowReset(false);
    if (!result.ok) {
      showToast(result.error || 'Failed to reset progress.', 'error');
      return;
    }
    showToast('Training progress reset for affected users.', 'success');
  };

  return (
    <>
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-ink-300 hover:text-brand-400">
        <ChevronLeft className="h-4 w-4" /> Back to Courses
      </button>

      <div className="mt-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <h1 className="text-2xl font-extrabold text-white">{course.title}</h1>
        <div className="flex gap-2">
          <button onClick={() => onNavigate({ type: 'assessment', courseId })} className="btn-ghost text-sm">
            <ClipboardList className="h-4 w-4" /> Assessment
          </button>
          <button onClick={() => setShowReset(true)} className="btn-ghost text-sm">
            <RotateCcw className="h-4 w-4" /> Reset Progress
          </button>
        </div>
      </div>

      <div className="card mt-5">
        <div className="space-y-1">
          {chapters.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-400">No chapters yet.</p>
          ) : (
            chapters.map((chapter, idx) => (
              <div key={chapter.id} className="flex flex-col justify-between gap-2 rounded-lg px-3 py-3 hover:bg-ink-800/60 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3">
                  <span className="w-6 shrink-0 text-sm font-bold text-ink-500">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <span className="text-sm font-semibold text-white">{chapter.title}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      chapter.isPublished ? 'bg-brand-500/15 text-brand-300' : 'bg-ink-700 text-ink-400'
                    }`}
                  >
                    {chapter.isPublished ? 'Published' : 'Unpublished'}
                  </span>
                  <span className="text-xs text-ink-500">{chapter.lessons.length} lessons</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <IconButton onClick={() => setEditingChapter(chapter)} label="Edit"><Pencil className="h-3.5 w-3.5" /></IconButton>
                  <button
                    onClick={() => onNavigate({ type: 'lessons', courseId, chapterId: chapter.id })}
                    className="btn-ghost !px-2.5 !py-1 text-xs"
                  >
                    Lessons
                  </button>
                  <IconButton onClick={() => handleMove(chapter, 'up')} label="Move up" disabled={busyId === chapter.id || idx === 0}><ArrowUp className="h-3.5 w-3.5" /></IconButton>
                  <IconButton onClick={() => handleMove(chapter, 'down')} label="Move down" disabled={busyId === chapter.id || idx === chapters.length - 1}><ArrowDown className="h-3.5 w-3.5" /></IconButton>
                  <button
                    onClick={() => handleTogglePublish(chapter)}
                    disabled={busyId === chapter.id}
                    className="btn-ghost !px-2.5 !py-1 text-xs disabled:opacity-60"
                  >
                    {chapter.isPublished ? 'Unpublish' : 'Publish'}
                  </button>
                  <IconButton onClick={() => setDeletingChapter(chapter)} label="Delete" danger><Trash2 className="h-3.5 w-3.5" /></IconButton>
                </div>
              </div>
            ))
          )}
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-ghost mt-4 w-full">
          <Plus className="h-4 w-4" /> Add Chapter
        </button>
      </div>

      {showCreate && (
        <ChapterFormModal mode="create" courseId={courseId} onClose={() => setShowCreate(false)} />
      )}
      {editingChapter && (
        <ChapterFormModal mode="edit" courseId={courseId} chapter={editingChapter} onClose={() => setEditingChapter(null)} />
      )}
      {deletingChapter && (
        <ConfirmModal
          title="Delete chapter?"
          message={`This permanently deletes "${deletingChapter.title}" and all of its lessons.`}
          confirmLabel="Delete"
          danger
          onCancel={() => setDeletingChapter(null)}
          onConfirm={handleDelete}
        />
      )}
      {showReset && (
        <ConfirmModal
          title="Reset training progress?"
          message="This will reset training progress for affected users. Continue?"
          confirmLabel="Reset Progress"
          danger
          onCancel={() => setShowReset(false)}
          onConfirm={handleReset}
        />
      )}
    </>
  );
}

function ChapterFormModal({
  mode,
  courseId,
  chapter,
  onClose,
}: {
  mode: 'create' | 'edit';
  courseId: string;
  chapter?: AdminChapter;
  onClose: () => void;
}) {
  const createAdminTrainingChapter = useStore((s) => s.createAdminTrainingChapter);
  const updateAdminTrainingChapter = useStore((s) => s.updateAdminTrainingChapter);
  const showToast = useToast();

  const [title, setTitle] = useState(chapter?.title ?? '');
  const [description, setDescription] = useState(chapter?.description ?? '');
  const [order, setOrder] = useState(String(chapter?.order ?? 0));
  const [isPublished, setIsPublished] = useState(chapter?.isPublished ?? false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    setError('');
    setSaving(true);
    const payload = { title: title.trim(), description: description.trim() || null, order: Number(order) || 0, isPublished };
    const result =
      mode === 'create'
        ? await createAdminTrainingChapter(courseId, payload)
        : await updateAdminTrainingChapter(chapter!.id, payload);
    setSaving(false);
    if (!result.ok) {
      setError(result.error || 'Failed to save chapter.');
      return;
    }
    showToast(mode === 'create' ? 'Chapter created.' : 'Chapter updated.', 'success');
    onClose();
  };

  return (
    <Modal title={mode === 'create' ? 'Add Chapter' : 'Edit Chapter'} onClose={onClose}>
      <div className="space-y-4">
        <Field label="Title">
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="input-base" disabled={saving} />
        </Field>
        <Field label="Description (optional)">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input-base min-h-[70px]" disabled={saving} />
        </Field>
        <Field label="Display Order">
          <input type="number" value={order} onChange={(e) => setOrder(e.target.value)} className="input-base" disabled={saving} />
        </Field>
        <Checkbox label="Published" checked={isPublished} onChange={setIsPublished} disabled={saving} />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="btn-ghost" disabled={saving}>Cancel</button>
          <button onClick={handleSave} className="btn-brand disabled:opacity-60" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ============================================================
// Lessons
// ============================================================

function LessonsView({ courseId, chapterId, onBack }: { courseId: string; chapterId: string; onBack: () => void }) {
  const course = useStore((s) => s.adminTrainingCourseDetail);
  const fetchAdminTrainingCourseDetail = useStore((s) => s.fetchAdminTrainingCourseDetail);
  const updateAdminTrainingLesson = useStore((s) => s.updateAdminTrainingLesson);
  const deleteAdminTrainingLesson = useStore((s) => s.deleteAdminTrainingLesson);
  const reorderAdminTrainingLesson = useStore((s) => s.reorderAdminTrainingLesson);
  const showToast = useToast();

  const [showCreate, setShowCreate] = useState(false);
  const [editingLesson, setEditingLesson] = useState<AdminChapter['lessons'][number] | null>(null);
  const [deletingLesson, setDeletingLesson] = useState<AdminChapter['lessons'][number] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminTrainingCourseDetail(courseId);
  }, [courseId, fetchAdminTrainingCourseDetail]);

  if (!course || course.id !== courseId) return <LoadingScreen />;
  const chapter = course.chapters.find((c) => c.id === chapterId);
  if (!chapter) return <p className="text-sm text-ink-400">Chapter not found.</p>;

  const lessons = [...chapter.lessons].sort((a, b) => a.order - b.order);

  const handleTogglePublish = async (lesson: AdminChapter['lessons'][number]) => {
    setBusyId(lesson.id);
    await updateAdminTrainingLesson(lesson.id, { isPublished: !lesson.isPublished });
    setBusyId(null);
  };

  const handleMove = async (lesson: AdminChapter['lessons'][number], direction: 'up' | 'down') => {
    setBusyId(lesson.id);
    await reorderAdminTrainingLesson(lesson.id, direction);
    setBusyId(null);
  };

  const handleDelete = async () => {
    if (!deletingLesson) return;
    setBusyId(deletingLesson.id);
    const result = await deleteAdminTrainingLesson(deletingLesson.id);
    setBusyId(null);
    setDeletingLesson(null);
    if (!result.ok) showToast(result.error || 'Failed to delete lesson.', 'error');
  };

  return (
    <>
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-ink-300 hover:text-brand-400">
        <ChevronLeft className="h-4 w-4" /> Back to Chapters
      </button>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-400">{course.title}</p>
        <h1 className="text-2xl font-extrabold text-white">{chapter.title}</h1>
      </div>

      <div className="card mt-5">
        <h2 className="text-sm font-bold text-white">Lessons</h2>
        <div className="mt-3 space-y-1">
          {lessons.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-400">No lessons yet.</p>
          ) : (
            lessons.map((lesson, idx) => (
              <div key={lesson.id} className="flex flex-col justify-between gap-2 rounded-lg px-3 py-3 hover:bg-ink-800/60 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3">
                  <span className="w-6 shrink-0 text-sm font-bold text-ink-500">{String(idx + 1).padStart(2, '0')}</span>
                  <span className="text-sm font-semibold text-white">{lesson.title}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${lesson.isPublished ? 'bg-brand-500/15 text-brand-300' : 'bg-ink-700 text-ink-400'}`}>
                    {lesson.isPublished ? 'Published' : 'Unpublished'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <IconButton onClick={() => setEditingLesson(lesson)} label="Edit"><Pencil className="h-3.5 w-3.5" /></IconButton>
                  <IconButton onClick={() => handleMove(lesson, 'up')} label="Move up" disabled={busyId === lesson.id || idx === 0}><ArrowUp className="h-3.5 w-3.5" /></IconButton>
                  <IconButton onClick={() => handleMove(lesson, 'down')} label="Move down" disabled={busyId === lesson.id || idx === lessons.length - 1}><ArrowDown className="h-3.5 w-3.5" /></IconButton>
                  <button onClick={() => handleTogglePublish(lesson)} disabled={busyId === lesson.id} className="btn-ghost !px-2.5 !py-1 text-xs disabled:opacity-60">
                    {lesson.isPublished ? 'Unpublish' : 'Publish'}
                  </button>
                  <IconButton onClick={() => setDeletingLesson(lesson)} label="Delete" danger><Trash2 className="h-3.5 w-3.5" /></IconButton>
                </div>
              </div>
            ))
          )}
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-ghost mt-4 w-full">
          <Plus className="h-4 w-4" /> Add Lesson
        </button>
      </div>

      {showCreate && <LessonFormModal mode="create" chapterId={chapterId} onClose={() => setShowCreate(false)} />}
      {editingLesson && <LessonFormModal mode="edit" chapterId={chapterId} lesson={editingLesson} onClose={() => setEditingLesson(null)} />}
      {deletingLesson && (
        <ConfirmModal
          title="Delete lesson?"
          message={`This permanently deletes "${deletingLesson.title}". Customers who completed it will lose that completion record.`}
          confirmLabel="Delete"
          danger
          onCancel={() => setDeletingLesson(null)}
          onConfirm={handleDelete}
        />
      )}
    </>
  );
}

function LessonFormModal({
  mode,
  chapterId,
  lesson,
  onClose,
}: {
  mode: 'create' | 'edit';
  chapterId: string;
  lesson?: AdminChapter['lessons'][number];
  onClose: () => void;
}) {
  const createAdminTrainingLesson = useStore((s) => s.createAdminTrainingLesson);
  const updateAdminTrainingLesson = useStore((s) => s.updateAdminTrainingLesson);
  const showToast = useToast();

  const [title, setTitle] = useState(lesson?.title ?? '');
  const [content, setContent] = useState(lesson?.content ?? '');
  const [videoUrl, setVideoUrl] = useState(lesson?.videoUrl ?? '');
  const [order, setOrder] = useState(String(lesson?.order ?? 0));
  const [isPublished, setIsPublished] = useState(lesson?.isPublished ?? false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Lesson title is required.');
      return;
    }
    if (!content.trim()) {
      setError('Lesson content is required.');
      return;
    }
    setError('');
    setSaving(true);
    const payload = {
      title: title.trim(),
      content: content.trim(),
      videoUrl: videoUrl.trim() || null,
      order: Number(order) || 0,
      isPublished,
    };
    const result =
      mode === 'create'
        ? await createAdminTrainingLesson(chapterId, payload)
        : await updateAdminTrainingLesson(lesson!.id, payload);
    setSaving(false);
    if (!result.ok) {
      setError(result.error || 'Failed to save lesson.');
      return;
    }
    showToast(mode === 'create' ? 'Lesson created.' : 'Lesson updated.', 'success');
    onClose();
  };

  return (
    <Modal title={mode === 'create' ? 'Add Lesson' : 'Edit Lesson'} onClose={onClose} wide>
      <div className="space-y-4">
        <Field label="Lesson Title">
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="input-base" disabled={saving} />
        </Field>
        <Field label="Lesson Content">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="input-base min-h-[220px] font-mono text-xs"
            disabled={saving}
            placeholder={'Separate paragraphs with a blank line.\nLines starting with "- " become a bullet list.'}
          />
        </Field>
        <Field label="Video URL (optional)">
          <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} className="input-base" disabled={saving} placeholder="https://…" />
        </Field>
        <div className="flex flex-wrap items-end gap-4">
          <Field label="Order">
            <input type="number" value={order} onChange={(e) => setOrder(e.target.value)} className="input-base w-24" disabled={saving} />
          </Field>
          <Checkbox label="Published" checked={isPublished} onChange={setIsPublished} disabled={saving} />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="btn-ghost" disabled={saving}>Cancel</button>
          <button onClick={handleSave} className="btn-brand disabled:opacity-60" disabled={saving}>
            {saving ? 'Saving…' : 'Save Lesson'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ============================================================
// Assessment
// ============================================================

function AssessmentView({ courseId, onBack }: { courseId: string; onBack: () => void }) {
  const course = useStore((s) => s.adminTrainingCourseDetail);
  const fetchAdminTrainingCourseDetail = useStore((s) => s.fetchAdminTrainingCourseDetail);
  const updateAdminAssessment = useStore((s) => s.updateAdminAssessment);
  const deleteAdminQuestion = useStore((s) => s.deleteAdminQuestion);
  const reorderAdminQuestion = useStore((s) => s.reorderAdminQuestion);
  const showToast = useToast();

  const [title, setTitle] = useState('');
  const [passingScore, setPassingScore] = useState('70');
  const [isPublished, setIsPublished] = useState(false);
  const [seeded, setSeeded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCreateQuestion, setShowCreateQuestion] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<AdminQuestion | null>(null);
  const [deletingQuestion, setDeletingQuestion] = useState<AdminQuestion | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminTrainingCourseDetail(courseId);
  }, [courseId, fetchAdminTrainingCourseDetail]);

  useEffect(() => {
    if (course?.assessment && !seeded) {
      setTitle(course.assessment.title);
      setPassingScore(String(course.assessment.passingScore));
      setIsPublished(course.assessment.isPublished);
      setSeeded(true);
    }
  }, [course, seeded]);

  if (!course || course.id !== courseId) return <LoadingScreen />;
  if (!course.assessment) return <p className="text-sm text-ink-400">No assessment found for this course.</p>;

  const questions = [...course.assessment.questions].sort((a, b) => a.order - b.order);

  const handleSaveSettings = async () => {
    setSaving(true);
    const result = await updateAdminAssessment(courseId, {
      title: title.trim(),
      passingScore: Number(passingScore) || 0,
      isPublished,
    });
    setSaving(false);
    if (!result.ok) {
      showToast(result.error || 'Failed to save assessment settings.', 'error');
      return;
    }
    showToast('Assessment settings saved.', 'success');
  };

  const handleMove = async (question: AdminQuestion, direction: 'up' | 'down') => {
    setBusyId(question.id);
    await reorderAdminQuestion(question.id, direction);
    setBusyId(null);
  };

  const handleDelete = async () => {
    if (!deletingQuestion) return;
    setBusyId(deletingQuestion.id);
    const result = await deleteAdminQuestion(deletingQuestion.id);
    setBusyId(null);
    setDeletingQuestion(null);
    if (!result.ok) showToast(result.error || 'Failed to delete question.', 'error');
  };

  return (
    <>
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-ink-300 hover:text-brand-400">
        <ChevronLeft className="h-4 w-4" /> Back to Courses
      </button>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-400">{course.title}</p>
        <h1 className="text-2xl font-extrabold text-white">Final Assessment</h1>
      </div>

      <div className="card mt-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Title">
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="input-base" disabled={saving} />
          </Field>
          <Field label="Passing Score (%)">
            <input type="number" min="0" max="100" value={passingScore} onChange={(e) => setPassingScore(e.target.value)} className="input-base" disabled={saving} />
          </Field>
          <div className="flex items-end pb-2.5">
            <Checkbox label="Published" checked={isPublished} onChange={setIsPublished} disabled={saving} />
          </div>
        </div>
        <button onClick={handleSaveSettings} disabled={saving} className="btn-brand mt-4 disabled:opacity-60">
          {saving ? 'Saving…' : 'Save Assessment Settings'}
        </button>
      </div>

      <div className="card mt-5">
        <h2 className="text-sm font-bold text-white">Questions</h2>
        <div className="mt-3 space-y-3">
          {questions.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-400">No questions yet.</p>
          ) : (
            questions.map((q, idx) => (
              <div key={q.id} className="rounded-lg border border-ink-700 bg-ink-800/40 p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-white">
                    {idx + 1}. {q.question} <span className="text-xs font-normal text-ink-500">({q.points} pt{q.points === 1 ? '' : 's'})</span>
                  </p>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <IconButton onClick={() => handleMove(q, 'up')} label="Move up" disabled={busyId === q.id || idx === 0}><ArrowUp className="h-3.5 w-3.5" /></IconButton>
                    <IconButton onClick={() => handleMove(q, 'down')} label="Move down" disabled={busyId === q.id || idx === questions.length - 1}><ArrowDown className="h-3.5 w-3.5" /></IconButton>
                    <IconButton onClick={() => setEditingQuestion(q)} label="Edit"><Pencil className="h-3.5 w-3.5" /></IconButton>
                    <IconButton onClick={() => setDeletingQuestion(q)} label="Delete" danger><Trash2 className="h-3.5 w-3.5" /></IconButton>
                  </div>
                </div>
                <ul className="mt-2.5 space-y-1">
                  {q.answers.map((a: AdminAnswer) => (
                    <li key={a.id} className={`text-xs ${a.isCorrect ? 'font-semibold text-brand-300' : 'text-ink-400'}`}>
                      {a.isCorrect ? '✓ ' : '· '}
                      {a.answer}
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
        <button onClick={() => setShowCreateQuestion(true)} className="btn-ghost mt-4 w-full">
          <Plus className="h-4 w-4" /> Add Question
        </button>
      </div>

      {showCreateQuestion && (
        <QuestionFormModal mode="create" assessmentId={course.assessment.id} onClose={() => setShowCreateQuestion(false)} />
      )}
      {editingQuestion && (
        <QuestionFormModal mode="edit" assessmentId={course.assessment.id} question={editingQuestion} onClose={() => setEditingQuestion(null)} />
      )}
      {deletingQuestion && (
        <ConfirmModal
          title="Delete question?"
          message="This permanently deletes this question and its answers."
          confirmLabel="Delete"
          danger
          onCancel={() => setDeletingQuestion(null)}
          onConfirm={handleDelete}
        />
      )}
    </>
  );
}

function QuestionFormModal({
  mode,
  assessmentId,
  question,
  onClose,
}: {
  mode: 'create' | 'edit';
  assessmentId: string;
  question?: AdminQuestion;
  onClose: () => void;
}) {
  const createAdminQuestion = useStore((s) => s.createAdminQuestion);
  const updateAdminQuestion = useStore((s) => s.updateAdminQuestion);
  const showToast = useToast();

  const [questionText, setQuestionText] = useState(question?.question ?? '');
  const [points, setPoints] = useState(String(question?.points ?? 1));
  const [order, setOrder] = useState(String(question?.order ?? 0));
  const [answers, setAnswers] = useState<{ answer: string; isCorrect: boolean }[]>(
    question?.answers.map((a) => ({ answer: a.answer, isCorrect: a.isCorrect })) ?? [
      { answer: '', isCorrect: true },
      { answer: '', isCorrect: false },
    ]
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const updateAnswer = (idx: number, patch: Partial<{ answer: string; isCorrect: boolean }>) => {
    setAnswers((prev) => prev.map((a, i) => (i === idx ? { ...a, ...patch } : a)));
  };

  const setCorrect = (idx: number) => {
    setAnswers((prev) => prev.map((a, i) => ({ ...a, isCorrect: i === idx })));
  };

  const addAnswer = () => setAnswers((prev) => [...prev, { answer: '', isCorrect: false }]);
  const removeAnswer = (idx: number) => setAnswers((prev) => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    if (!questionText.trim()) {
      setError('Question text is required.');
      return;
    }
    const filled = answers.filter((a) => a.answer.trim());
    if (filled.length < 2) {
      setError('At least two answers are required.');
      return;
    }
    if (!filled.some((a) => a.isCorrect)) {
      setError('Mark one answer as correct.');
      return;
    }
    setError('');
    setSaving(true);
    const payload = {
      question: questionText.trim(),
      points: Number(points) || 1,
      order: Number(order) || 0,
      answers: filled.map((a, i) => ({ answer: a.answer.trim(), isCorrect: a.isCorrect, order: i })),
    };
    const result =
      mode === 'create'
        ? await createAdminQuestion(assessmentId, payload)
        : await updateAdminQuestion(question!.id, payload);
    setSaving(false);
    if (!result.ok) {
      setError(result.error || 'Failed to save question.');
      return;
    }
    showToast(mode === 'create' ? 'Question created.' : 'Question updated.', 'success');
    onClose();
  };

  return (
    <Modal title={mode === 'create' ? 'Add Question' : 'Edit Question'} onClose={onClose} wide>
      <div className="space-y-4">
        <Field label="Question">
          <textarea value={questionText} onChange={(e) => setQuestionText(e.target.value)} className="input-base min-h-[60px]" disabled={saving} />
        </Field>
        <div className="flex gap-4">
          <Field label="Points">
            <input type="number" min="1" value={points} onChange={(e) => setPoints(e.target.value)} className="input-base w-24" disabled={saving} />
          </Field>
          <Field label="Order">
            <input type="number" value={order} onChange={(e) => setOrder(e.target.value)} className="input-base w-24" disabled={saving} />
          </Field>
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-200">Answers (select the correct one)</label>
          <div className="mt-2 space-y-2">
            {answers.map((a, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="correct-answer"
                  checked={a.isCorrect}
                  onChange={() => setCorrect(idx)}
                  disabled={saving}
                  className="h-4 w-4 shrink-0 text-brand-500 focus:ring-brand-500"
                />
                <input
                  value={a.answer}
                  onChange={(e) => updateAnswer(idx, { answer: e.target.value })}
                  className="input-base flex-1"
                  disabled={saving}
                  placeholder={`Answer ${idx + 1}`}
                />
                {answers.length > 2 && (
                  <button onClick={() => removeAnswer(idx)} disabled={saving} className="text-ink-500 hover:text-red-400">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button onClick={addAnswer} disabled={saving} className="mt-2 text-xs font-semibold text-brand-400 hover:text-brand-300">
            + Add another answer
          </button>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="btn-ghost" disabled={saving}>Cancel</button>
          <button onClick={handleSave} className="btn-brand disabled:opacity-60" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ============================================================
// Preview (read-only, does not touch progress/completion)
// ============================================================

function PreviewView({ courseId, onBack }: { courseId: string; onBack: () => void }) {
  const course = useStore((s) => s.adminTrainingCourseDetail);
  const fetchAdminTrainingCourseDetail = useStore((s) => s.fetchAdminTrainingCourseDetail);

  useEffect(() => {
    fetchAdminTrainingCourseDetail(courseId);
  }, [courseId, fetchAdminTrainingCourseDetail]);

  if (!course || course.id !== courseId) return <LoadingScreen />;

  return (
    <>
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-ink-300 hover:text-brand-400">
        <ChevronLeft className="h-4 w-4" /> Back to Courses
      </button>

      <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-200/80">
        Preview mode — this shows the course exactly as a customer would see it. Nothing here affects real progress.
      </div>

      <div className="card mt-4">
        <h1 className="text-2xl font-extrabold text-white">{course.title}</h1>
        {course.description && <p className="mt-1.5 text-sm text-ink-400">{course.description}</p>}
      </div>

      <div className="card mt-4">
        <h2 className="text-lg font-bold text-white">Chapters</h2>
        <div className="mt-4 space-y-5">
          {[...course.chapters].sort((a, b) => a.order - b.order).map((chapter) => (
            <div key={chapter.id}>
              <h3 className="text-sm font-bold uppercase tracking-wide text-ink-400">
                {chapter.title} {!chapter.isPublished && <span className="text-ink-600">(unpublished)</span>}
              </h3>
              <div className="mt-2 space-y-1">
                {[...chapter.lessons].sort((a, b) => a.order - b.order).map((lesson) => (
                  <div key={lesson.id} className="rounded-lg px-3 py-2 text-sm text-ink-200">
                    {lesson.title} {!lesson.isPublished && <span className="text-xs text-ink-600">(unpublished)</span>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {course.assessment && (
        <div className="card mt-4">
          <h2 className="text-lg font-bold text-white">{course.assessment.title}</h2>
          <p className="mt-1 text-sm text-ink-400">Passing score: {course.assessment.passingScore}%</p>
          <p className="mt-1 text-xs text-ink-500">{course.assessment.questions.length} questions</p>
        </div>
      )}
    </>
  );
}

// ============================================================
// Shared small components
// ============================================================

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative max-h-[90vh] w-full overflow-y-auto rounded-2xl border border-ink-600 bg-ink-900 p-6 shadow-2xl animate-scaleIn ${wide ? 'max-w-2xl' : 'max-w-md'}`}>
        <button onClick={onClose} className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-lg text-ink-300 hover:bg-ink-800">
          <X className="h-5 w-5" />
        </button>
        <h3 className="text-xl font-bold text-white">{title}</h3>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-ink-200">{label}</label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function Checkbox({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className="flex items-center gap-2 text-sm text-ink-200">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="h-4 w-4 rounded border-ink-600 bg-ink-800 text-brand-500 focus:ring-brand-500 disabled:opacity-60"
      />
      {label}
    </label>
  );
}

function IconButton({
  onClick,
  label,
  children,
  disabled,
  danger,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`grid h-8 w-8 place-items-center rounded-lg transition disabled:opacity-40 ${
        danger ? 'text-ink-300 hover:bg-red-500/15 hover:text-red-400' : 'text-ink-300 hover:bg-ink-700'
      }`}
    >
      {children}
    </button>
  );
}

function ConfirmModal({
  title,
  message,
  confirmLabel,
  danger,
  onCancel,
  onConfirm,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-2xl border border-ink-600 bg-ink-900 p-6 shadow-2xl animate-scaleIn">
        <h3 className="text-lg font-bold text-white">{title}</h3>
        <p className="mt-2 text-sm text-ink-300">{message}</p>
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={onCancel} className="btn-ghost">Cancel</button>
          <button
            onClick={onConfirm}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition ${
              danger ? 'bg-red-500 hover:bg-red-600' : 'bg-brand-500 hover:bg-brand-600'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
