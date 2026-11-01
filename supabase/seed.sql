-- Fictional demonstration data only. Dates follow the day of reset in UTC.
insert into public.doctors (id, name, specialty, initials) values
 ('00000000-0000-4000-8000-000000000001', 'Dr. Sarah Mitchell', 'General medicine', 'SM'),
 ('00000000-0000-4000-8000-000000000002', 'Dr. James Chen', 'Cardiology', 'JC'),
 ('00000000-0000-4000-8000-000000000003', 'Dr. Amara Patel', 'Pediatrics', 'AP');

insert into public.appointments (patient_name, doctor_id, starts_at, reason, status) values
 ('Olivia Bennett', '00000000-0000-4000-8000-000000000001', (current_date + time '09:00') at time zone 'UTC', 'Annual wellness visit', 'completed'),
 ('Noah Williams', '00000000-0000-4000-8000-000000000002', (current_date + time '09:30') at time zone 'UTC', 'Heart health follow-up', 'scheduled'),
 ('Emma Thompson', '00000000-0000-4000-8000-000000000003', (current_date + time '10:00') at time zone 'UTC', 'Routine check-up', 'scheduled'),
 ('Liam Anderson', '00000000-0000-4000-8000-000000000001', (current_date + time '11:00') at time zone 'UTC', 'General consultation', 'scheduled'),
 ('Sophia Martinez', '00000000-0000-4000-8000-000000000002', (current_date + time '14:00') at time zone 'UTC', 'Blood pressure review', 'scheduled'),
 ('Ethan Davis', '00000000-0000-4000-8000-000000000003', (current_date + time '15:30') at time zone 'UTC', 'Routine check-up', 'cancelled');
