export type Equipment = {
  id: string;
  name: string;
  location: string;
};

export type Booking = {
  id: string;
  equipmentId: string;
  borrowerName: string;
  startAt: string;
  endAt: string;
  purpose: string;
};

export type Env = {
  DB: D1Database;
};
