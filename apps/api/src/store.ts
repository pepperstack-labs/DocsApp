import postgres from 'postgres';

export type Doctor = {
  id: string;
  name: string;
  specialty: string;
  initials: string;
};
export type Appointment = {
  id: string;
  patient_name: string;
  doctor_id: string;
  starts_at: string;
  reason: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  created_at: string;
};
export type Booking = Pick<
  Appointment,
  'patient_name' | 'doctor_id' | 'starts_at' | 'reason'
>;
export interface Store {
  health(): Promise<void>;
  doctors(): Promise<Doctor[]>;
  appointments(): Promise<Appointment[]>;
  create(input: Booking): Promise<Appointment>;
  status(
    id: string,
    status: Appointment['status'],
  ): Promise<Appointment | undefined>;
  close(): Promise<void>;
}

export function createStore(url: string): Store {
  const sql = postgres(url, { max: 5, connect_timeout: 5 });
  return {
    async health() {
      await sql`select 1 from public.doctors limit 1`;
    },
    async doctors() {
      return sql<Doctor[]>`select * from public.doctors order by name`;
    },
    async appointments() {
      return sql<
        Appointment[]
      >`select * from public.appointments order by starts_at`;
    },
    async create(input) {
      const [appointment] = await sql<Appointment[]>`
        insert into public.appointments ${sql(input)} returning *`;
      return appointment!;
    },
    async status(id, status) {
      const [appointment] = await sql<Appointment[]>`
        update public.appointments set status = ${status} where id = ${id} returning *`;
      return appointment;
    },
    async close() {
      await sql.end();
    },
  };
}
