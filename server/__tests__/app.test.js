process.env.NODE_ENV = 'test';
const request = require('supertest');
const db = require('../db');
const app = require('../app');

beforeAll(async () => {
  const createSpacesTable = `CREATE TABLE public.spaces (
    id BIGSERIAL PRIMARY KEY,
    nightly_rate_cents INT NOT NULL,
    cleaning_fee_cents INT NOT NULL,
    service_fee_cents INT NOT NULL,
    tax_rate_cents INT NOT NULL,
    max_adult_guests INT NOT NULL,
    min_stay_nights INT NOT NULL
  )`;
  await db.query(createSpacesTable);

  const insertSpaces = `INSERT INTO public.spaces (nightly_rate_cents, cleaning_fee_cents, service_fee_cents, tax_rate_cents, max_adult_guests, min_stay_nights) VALUES
  (10000, 2500, 2000, 10, 2, 2),
  (15000, 3000, 2500, 10, 4, 3)`;
  await db.query(insertSpaces);
});

beforeEach(async () => {
  const createReservationsTable = `CREATE TABLE public.reservations (
    id BIGSERIAL PRIMARY KEY,
    checkin_date DATE NOT NULL DEFAULT CURRENT_DATE,
    checkout_date DATE NOT NULL DEFAULT CURRENT_DATE,
    space_id INT REFERENCES public.spaces (id)
  )`;
  await db.query(createReservationsTable);

  const reservations = `INSERT INTO public.reservations (checkin_date, checkout_date, space_id) VALUES
  ('2020-01-27', '2020-01-28', 1),
  ('2020-01-29', '2020-01-31', 2)`;
  await db.query(reservations);
});

afterEach(async () => {
  await db.query('DROP TABLE reservations');
});

afterAll(async () => {
  await db.query('DROP TABLE spaces');
  db.end();
});

// Integration testing
describe('GET /reservations', () => {
  test('It responds with an array of reservation objects', () => {
    return request(app).get('/reservations')
      .then((response) => {
        expect(response.body.length).toBe(2);
        expect(response.body[0]).toHaveProperty('checkin_date');
        expect(response.body[0]).toHaveProperty('checkout_date');
        expect(response.body[0]).toHaveProperty('space_id');
        expect(response.statusCode).toBe(200);
      })
      .catch((error) => console.log(error));
  });
});

describe('POST /reservations', () => {
  test('It responds with the newly added reservation', () => {
    const spaceId = 1;
    return request(app)
      .post(`${spaceId}/reservations`)
      .send({
        checkinDate: '2099-01-01',
        checkoutDate: '2099-12-31',
      })
      .then((response) => {
        expect(response.body.checkin_date.substring(0, 10)).toBe('2099-01-01');
        expect(response.statusCode).toBe(200);
      })
      .then(() => {
        return request(app).get(`${spaceId}/reservations`);
      })
      .then((response) => expect(response.body.length).toBe(3))
      .catch((error) => console.log(error));
  });
});
