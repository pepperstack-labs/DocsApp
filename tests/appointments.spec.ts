import { test, expect } from '@playwright/test';

test('book, reject overlapping visits, reload, filter and complete an appointment', async ({
  page,
  request,
}) => {
  const patient = 'Browser Patient ' + Date.now();
  const starts = new Date(Date.now() + 3 * 86400000);
  starts.setUTCHours(12, 0, 0, 0);
  const time = starts.toISOString().slice(0, 16);
  let createdId: string | undefined;
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: 'Appointments', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'New appointment', exact: true }),
    ).toBeEnabled();
    await page
      .getByRole('button', { name: 'New appointment', exact: true })
      .click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page
      .getByRole('button', { name: 'Book appointment', exact: true })
      .click();
    await expect(page.getByLabel('Patient name')).toBeFocused();
    await page.getByLabel('Patient name').fill(patient);
    await page
      .getByLabel('Doctor', { exact: true })
      .selectOption({ label: 'Dr. Sarah Mitchell · General medicine' });
    await page.getByLabel('Date and time (UTC)').fill(time);
    await page.getByLabel('Visit reason').fill('Browser verification');
    await page
      .getByRole('button', { name: 'Book appointment', exact: true })
      .click();
    await expect(page.getByRole('status')).toHaveText(
      'Appointment booked successfully.',
    );
    createdId = (await (await request.get('/api/appointments')).json()).find(
      (a: { patient_name: string }) => a.patient_name === patient,
    ).id;
    await expect(
      page.getByRole('row').filter({ hasText: patient }),
    ).toContainText('Scheduled');
    await page.reload();
    await expect(
      page.getByRole('button', { name: 'New appointment', exact: true }),
    ).toBeEnabled();
    await page.getByLabel('Schedule date').fill(time.slice(0, 10));
    await page.getByLabel('Search appointments').fill(patient);
    await expect(
      page.getByRole('row').filter({ hasText: patient }),
    ).toBeVisible();
    // The browser displays the database's conflict rather than silently double-booking.
    await page
      .getByRole('button', { name: 'New appointment', exact: true })
      .click();
    await page.getByLabel('Patient name').fill('Conflicting Patient');
    await page
      .getByLabel('Doctor', { exact: true })
      .selectOption({ label: 'Dr. Sarah Mitchell · General medicine' });
    await page.getByLabel('Date and time (UTC)').fill(time);
    await page.getByLabel('Visit reason').fill('Overlapping visit');
    await page
      .getByRole('button', { name: 'Book appointment', exact: true })
      .click();
    await expect(page.getByRole('alert')).toContainText(
      'already has an appointment',
    );
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(
      page.getByRole('button', { name: 'New appointment', exact: true }),
    ).toBeFocused();
    await page
      .getByRole('button', {
        name: 'Complete appointment for ' + patient,
        exact: true,
      })
      .click();
    await expect(
      page.getByRole('row').filter({ hasText: patient }),
    ).toContainText('Completed');
    await page.reload();
    await expect(
      page.getByRole('button', { name: 'New appointment', exact: true }),
    ).toBeEnabled();
    await page.getByLabel('Schedule date').fill(time.slice(0, 10));
    await page.getByLabel('Search appointments').fill(patient);
    await expect(
      page.getByRole('row').filter({ hasText: patient }),
    ).toContainText('Completed');
    await page.getByRole('button', { name: 'Scheduled', exact: true }).click();
    await expect(
      page.getByText('No appointments found.', { exact: false }),
    ).toBeVisible();
    expect(errors).toEqual([]);
  } finally {
    if (createdId)
      await request.patch('/api/appointments/' + createdId, {
        data: { status: 'cancelled' },
      });
  }
});

test('mobile layout and recoverable API error', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/api/appointments', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'The local database is unavailable.' }),
    }),
  );
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText(
    'database is unavailable',
  );
  await page.unroute('**/api/appointments');
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByRole('alert')).not.toBeVisible();
  await expect(
    page.getByRole('button', { name: 'New appointment', exact: true }),
  ).toBeEnabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByLabel('Search appointments').fill('No matching patient');
  await expect(
    page.getByText('No appointments found.', { exact: false }),
  ).toBeVisible();
});

test('filter doctors and cancel a persisted appointment', async ({
  page,
  request,
}) => {
  const patient = 'Cancellation Patient ' + Date.now();
  const starts = new Date(Date.now() + 5 * 86400000);
  starts.setUTCHours(13, 0, 0, 0);
  const response = await request.post('/api/appointments', {
    data: {
      patient_name: patient,
      doctor_id: '00000000-0000-4000-8000-000000000003',
      starts_at: starts.toISOString(),
      reason: 'Cancellation verification',
    },
  });
  expect(response.status()).toBe(201);
  const { id } = await response.json();
  try {
    await page.goto('/');
    await expect(
      page.getByRole('button', { name: 'New appointment', exact: true }),
    ).toBeEnabled();
    await page
      .getByLabel('Schedule date')
      .fill(starts.toISOString().slice(0, 10));
    await page.getByLabel('Search appointments').fill(patient);
    await page
      .getByLabel('Filter doctor')
      .selectOption('00000000-0000-4000-8000-000000000001');
    await expect(
      page.getByText('No appointments found.', { exact: false }),
    ).toBeVisible();
    await page
      .getByLabel('Filter doctor')
      .selectOption('00000000-0000-4000-8000-000000000003');
    await page
      .getByRole('button', {
        name: 'Cancel appointment for ' + patient,
        exact: true,
      })
      .click();
    await expect(
      page.getByRole('row').filter({ hasText: patient }),
    ).toContainText('Cancelled');
    await page.reload();
    await expect(
      page.getByRole('button', { name: 'New appointment', exact: true }),
    ).toBeEnabled();
    await page
      .getByLabel('Schedule date')
      .fill(starts.toISOString().slice(0, 10));
    await page.getByLabel('Search appointments').fill(patient);
    await page.getByRole('button', { name: 'Cancelled', exact: true }).click();
    await expect(
      page.getByRole('row').filter({ hasText: patient }),
    ).toContainText('Cancelled');
  } finally {
    await request.patch('/api/appointments/' + id, {
      data: { status: 'cancelled' },
    });
  }
});
