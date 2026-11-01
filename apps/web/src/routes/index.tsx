import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import {
  Activity,
  ArrowDown,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  HeartPulse,
  Plus,
  Search,
  Stethoscope,
  X,
} from 'lucide-react';

export const Route = createFileRoute('/')({ component: App });
type Doctor = { id: string; name: string; specialty: string; initials: string };
type Appointment = {
  id: string;
  doctor_id: string;
  patient_name: string;
  starts_at: string;
  reason: string;
  status: 'scheduled' | 'completed' | 'cancelled';
};
const today = () => new Date().toISOString().slice(0, 10);
const dateLabel = (date: string) =>
  new Date(date + 'T12:00:00Z').toLocaleDateString('en-US', {
    timeZone: 'UTC',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch('/api/' + path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.message ?? 'Something went wrong. Please try again.');
  return data;
}
function App() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [date, setDate] = useState(today);
  const [search, setSearch] = useState('');
  const [doctor, setDoctor] = useState('');
  const [status, setStatus] = useState('all');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const bookingButton = useRef<HTMLButtonElement>(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  async function refresh() {
    setLoading(true);
    setError('');
    try {
      const [d, a] = await Promise.all([
        api<Doctor[]>('doctors'),
        api<Appointment[]>('appointments'),
      ]);
      setDoctors(d);
      setAppointments(a);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void refresh();
  }, []);
  useEffect(() => {
    if (booking) dialog.current?.showModal();
    else dialog.current?.close();
  }, [booking]);
  function closeBooking() {
    setBooking(false);
    bookingButton.current?.focus();
  }
  function moveDate(amount: number) {
    const next = new Date(date + 'T12:00:00Z');
    next.setUTCDate(next.getUTCDate() + amount);
    setDate(next.toISOString().slice(0, 10));
  }
  async function updateStatus(id: string, next: Appointment['status']) {
    setBusy(id);
    setError('');
    setNotice('');
    try {
      const updated = await api<Appointment>('appointments/' + id, {
        method: 'PATCH',
        body: JSON.stringify({ status: next }),
      });
      setAppointments((current) =>
        current.map((item) => (item.id === id ? updated : item)),
      );
      setNotice('Appointment ' + next + '.');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError('');
    setSaving(true);
    const data = new FormData(event.currentTarget);
    try {
      const starts_at = new Date(
        String(data.get('time')) + ':00Z',
      ).toISOString();
      const created = await api<Appointment>('appointments', {
        method: 'POST',
        body: JSON.stringify({
          patient_name: data.get('patient'),
          doctor_id: data.get('doctor'),
          reason: data.get('reason'),
          starts_at,
        }),
      });
      setAppointments((current) =>
        [...current, created].sort((a, b) =>
          a.starts_at.localeCompare(b.starts_at),
        ),
      );
      setDate(starts_at.slice(0, 10));
      setSearch('');
      setDoctor('');
      setStatus('all');
      setNotice('Appointment booked successfully.');
      closeBooking();
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }
  const daily = appointments.filter(
    (item) => item.starts_at.slice(0, 10) === date,
  );
  const visible = daily.filter(
    (item) =>
      (!doctor || item.doctor_id === doctor) &&
      (status === 'all' || item.status === status) &&
      (item.patient_name + ' ' + item.reason)
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const scheduled = daily.filter((item) => item.status === 'scheduled').length;
  const completed = daily.filter((item) => item.status === 'completed').length;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a href="/" className="brand" aria-label="Careline home">
          <span className="brand-icon">
            <HeartPulse size={24} />
          </span>
          careline<span className="brand-dot">.</span>
        </a>
        <div className="workspace-label">CLINIC WORKSPACE</div>
        <nav>
          <a href="/" className="nav-item active">
            <CalendarDays size={19} />
            Appointments
            <span className="nav-indicator" />
          </a>
        </nav>
        <div className="sidebar-note">
          <span className="tiny-icon">
            <Stethoscope size={20} />
          </span>
          <strong>
            A little more care.
            <br />A lot less admin.
          </strong>
          <p>Your day, thoughtfully organized.</p>
        </div>
        <div className="profile">
          <div className="avatar profile-avatar">AC</div>
          <div>
            <strong>Alex Carter</strong>
            <span>Clinic administrator</span>
          </div>
          <span className="online-dot" />
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <ChevronRight size={14} />
            <span>Appointments</span>
          </div>
          <div className="local-badge">
            <span />
            Local workspace
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">YOUR CLINIC, CONNECTED</div>
              <h1>Appointments</h1>
              <p>A clear view of your day. More time for your patients.</p>
            </div>
            <button
              className="primary"
              ref={bookingButton}
              disabled={loading || !doctors.length}
              onClick={() => {
                setFormError('');
                setBooking(true);
              }}
            >
              <Plus size={18} />
              New appointment
            </button>
          </div>
          <section className="stats" aria-label="Daily appointment summary">
            {[
              {
                label: 'Total appointments',
                value: daily.length,
                icon: CalendarDays,
                tone: 'green',
                detail: 'On the selected day',
              },
              {
                label: 'Scheduled',
                value: scheduled,
                icon: Clock3,
                tone: 'blue',
                detail: 'Scheduled appointments',
              },
              {
                label: 'Completed',
                value: completed,
                icon: Check,
                tone: 'purple',
                detail: 'Care, delivered',
              },
              {
                label: 'Available doctors',
                value: doctors.length,
                icon: Stethoscope,
                tone: 'orange',
                detail: 'Here for your patients',
              },
            ].map(({ label, value, icon: Icon, tone, detail }) => (
              <article className="stat-card" key={label}>
                <div className="stat-top">
                  <span>{label}</span>
                  <div className={'stat-icon ' + tone}>
                    <Icon size={19} />
                  </div>
                </div>
                <strong>
                  {loading ? '—' : value.toString().padStart(2, '0')}
                </strong>
                <small>{detail}</small>
              </article>
            ))}
          </section>
          <section className="schedule">
            <div className="schedule-heading">
              <div>
                <h2>
                  Appointment schedule <span>{daily.length}</span>
                </h2>
                <p>Keep every visit on track.</p>
              </div>
              <div className="date-controls">
                <button aria-label="Previous day" onClick={() => moveDate(-1)}>
                  <ChevronLeft size={17} />
                </button>
                <label className="date-picker">
                  <CalendarDays size={16} />
                  <span>
                    {dateLabel(date).split(', ').slice(1, 2).join('')}
                  </span>
                  <input
                    aria-label="Schedule date"
                    type="date"
                    value={date}
                    onChange={(e) => {
                      if (e.target.value) setDate(e.target.value);
                    }}
                  />
                </label>
                <button aria-label="Next day" onClick={() => moveDate(1)}>
                  <ChevronRight size={17} />
                </button>
                <button
                  className="today-button"
                  onClick={() => setDate(today())}
                >
                  Today
                </button>
              </div>
            </div>
            <div className="filters">
              <div className="tabs" aria-label="Filter appointment status">
                {['all', 'scheduled', 'completed', 'cancelled'].map((value) => (
                  <button
                    key={value}
                    aria-pressed={status === value}
                    className={status === value ? 'selected' : ''}
                    onClick={() => setStatus(value)}
                  >
                    {value === 'all'
                      ? 'All appointments'
                      : value[0].toUpperCase() + value.slice(1)}
                  </button>
                ))}
              </div>
              <div className="search-filters">
                <label className="search">
                  <Search size={16} />
                  <input
                    aria-label="Search appointments"
                    placeholder="Search patients..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
                <select
                  aria-label="Filter doctor"
                  value={doctor}
                  onChange={(e) => setDoctor(e.target.value)}
                >
                  <option value="">All doctors</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {error && (
              <div role="alert" className="alert">
                {error} <button onClick={() => void refresh()}>Retry</button>
              </div>
            )}
            {notice && (
              <div role="status" className="notice">
                <Check size={16} />
                {notice}
              </div>
            )}
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>
                      TIME <ArrowDown size={12} />
                    </th>
                    <th>PATIENT</th>
                    <th>DOCTOR</th>
                    <th>VISIT TYPE</th>
                    <th>STATUS</th>
                    <th className="actions-heading">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="empty">
                        Loading your schedule…
                      </td>
                    </tr>
                  ) : (
                    visible.map((item) => {
                      const d = doctors.find(
                        (value) => value.id === item.doctor_id,
                      );
                      return (
                        <tr key={item.id}>
                          <td className="time-cell">
                            <strong>
                              {new Date(item.starts_at).toLocaleTimeString(
                                'en-US',
                                {
                                  timeZone: 'UTC',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: false,
                                },
                              )}
                            </strong>
                            <small>30 min</small>
                          </td>
                          <td>
                            <div className="person">
                              <span
                                className={
                                  'avatar patient-avatar color-' +
                                  (item.patient_name.length % 4)
                                }
                              >
                                {item.patient_name
                                  .split(' ')
                                  .map((s) => s[0])
                                  .slice(0, 2)
                                  .join('')}
                              </span>
                              <div>
                                <strong>{item.patient_name}</strong>
                                <small>In-person appointment</small>
                              </div>
                            </div>
                          </td>
                          <td>
                            <strong className="doctor-name">{d?.name}</strong>
                            <small>{d?.specialty}</small>
                          </td>
                          <td className="reason">{item.reason}</td>
                          <td>
                            <span className={'status ' + item.status}>
                              <span />
                              {item.status[0].toUpperCase() +
                                item.status.slice(1)}
                            </span>
                          </td>
                          <td>
                            {item.status === 'scheduled' ? (
                              <div className="row-actions">
                                <button
                                  aria-label={
                                    'Complete appointment for ' +
                                    item.patient_name
                                  }
                                  title="Mark completed"
                                  disabled={busy === item.id}
                                  onClick={() =>
                                    void updateStatus(item.id, 'completed')
                                  }
                                >
                                  <Check size={16} />
                                </button>
                                <button
                                  aria-label={
                                    'Cancel appointment for ' +
                                    item.patient_name
                                  }
                                  title="Cancel appointment"
                                  disabled={busy === item.id}
                                  onClick={() =>
                                    void updateStatus(item.id, 'cancelled')
                                  }
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            ) : (
                              <span className="finished">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                  {!loading && !visible.length && (
                    <tr>
                      <td colSpan={6} className="empty">
                        {error
                          ? 'Schedule unavailable. Retry when the database is running.'
                          : 'No appointments found. Try another date or book a new visit.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="table-footer">
              <span>
                Showing {visible.length} of {daily.length} appointments
              </span>
              <span>
                <Clock3 size={13} />
                All times in UTC · 30-minute visits
              </span>
            </div>
          </section>
          <div className="care-banner">
            <div className="care-symbol">
              <Activity size={23} />
            </div>
            <div>
              <strong>Good care starts with a well-planned day.</strong>
              <p>Every appointment is a chance to make someone feel better.</p>
            </div>
            <HeartPulse size={40} className="banner-heart" />
          </div>
          <footer>
            <span>Careline · A healthier way to manage your day</span>
            <span>Development workspace · Fictional patient data</span>
          </footer>
        </main>
      </div>
      <dialog
        ref={dialog}
        onCancel={closeBooking}
        onClose={() => {
          if (booking) closeBooking();
        }}
      >
        <form onSubmit={submit}>
          <div className="dialog-heading">
            <div>
              <div className="eyebrow">MAKE ROOM FOR CARE</div>
              <h2>New appointment</h2>
            </div>
            <button
              type="button"
              className="icon-button"
              aria-label="Close booking"
              onClick={closeBooking}
            >
              <X size={20} />
            </button>
          </div>
          <p className="dialog-description">
            Book a 30-minute, in-person visit. All times are in UTC.
          </p>
          <label>
            Patient name
            <input
              name="patient"
              placeholder="e.g. Jamie Morgan"
              minLength={2}
              maxLength={100}
              required
              autoFocus
            />
          </label>
          <label>
            Doctor
            <select aria-label="Doctor" name="doctor" required defaultValue="">
              <option value="" disabled>
                Select a doctor
              </option>
              {doctors.map((d) => (
                <option value={d.id} key={d.id}>
                  {d.name} · {d.specialty}
                </option>
              ))}
            </select>
          </label>
          <label>
            Date and time (UTC)
            <input name="time" type="datetime-local" required />
          </label>
          <label>
            Visit reason
            <input
              name="reason"
              placeholder="e.g. General consultation"
              minLength={2}
              maxLength={250}
              required
            />
          </label>
          {formError && (
            <div role="alert" className="alert">
              {formError}
            </div>
          )}
          <div className="dialog-actions">
            <button type="button" className="secondary" onClick={closeBooking}>
              Cancel
            </button>
            <button className="primary" disabled={saving}>
              {saving ? 'Booking…' : 'Book appointment'}
              <ArrowUpRight size={16} />
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
