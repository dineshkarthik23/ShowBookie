import mysql2 from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql2.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export async function get_all() {
  try {
    const [rows] = await pool.query("SELECT * FROM shows");
    return rows;
  } catch (error) {
    console.error('Error fetching shows:', error);
    throw error;
  }
}

export async function get_t() {
  try {
    const [rows] = await pool.query("SELECT * FROM screen");
    return rows;
  } catch (error) {
    console.error('Error fetching screens:', error);
    throw error;
  }
}

export async function get_t_by_id() {
  try {
    const [rows] = await pool.query("SELECT * FROM theater");
    return rows;
  } catch (error) {
    console.error('Error fetching theaters:', error);
    throw error;
  }
}

export async function get_user_by_email(email) {
  try {
    const [rows] = await pool.query('SELECT * FROM user WHERE Email = ?', [email]);
    return rows;
  } catch (error) {
    console.error('Error in get_user_by_email:', error.message);
    throw error;
  }
}

export async function insert_user(name, email, password) {
  try {
      const [maxIdResult] = await pool.query("SELECT MAX(UserID) AS maxId FROM user");
      const maxId = maxIdResult[0].maxId || 130; 
      const newUserId = maxId + 1;
      const query = "INSERT INTO user (UserID, name, email, password) VALUES (?, ?, ?, ?)";
      const [result] = await pool.query(query, [newUserId, name, email, password]);

      return result;
  } catch (error) {
      console.error('Error inserting user:', error);
      throw error;
  }
}

export async function create_booking_for_user({
  userId,
  movieTitle,
  theaterName,
  selectedSeats = [],
  paymentMode = 'Card',
}) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const normalizedMovie = (movieTitle || '').trim();
    const normalizedTheater = (theaterName || '').trim();

    let showRow;

    if (normalizedMovie && normalizedTheater) {
      const [rowsByMovieAndTheater] = await connection.query(
        `SELECT s.ShowID, s.ScreenID, m.Title AS MovieTitle, t.Name AS TheaterName, s.ShowTime
         FROM shows s
         JOIN movie m ON m.MovieID = s.MovieID
         JOIN screen sc ON sc.ScreenID = s.ScreenID
         JOIN theater t ON t.TheaterID = sc.TheaterID
         WHERE UPPER(m.Title) LIKE CONCAT('%', UPPER(?), '%')
           AND UPPER(REPLACE(REPLACE(t.Name, ',', ''), ' ', '')) LIKE CONCAT('%', UPPER(REPLACE(REPLACE(?, ',', ''), ' ', '')), '%')
         ORDER BY s.ShowTime DESC
         LIMIT 1`,
        [normalizedMovie, normalizedTheater]
      );
      showRow = rowsByMovieAndTheater[0];
    }

    if (!showRow && normalizedMovie) {
      const [rowsByMovie] = await connection.query(
        `SELECT s.ShowID, s.ScreenID, m.Title AS MovieTitle, t.Name AS TheaterName, s.ShowTime
         FROM shows s
         JOIN movie m ON m.MovieID = s.MovieID
         JOIN screen sc ON sc.ScreenID = s.ScreenID
         JOIN theater t ON t.TheaterID = sc.TheaterID
         WHERE UPPER(m.Title) LIKE CONCAT('%', UPPER(?), '%')
         ORDER BY s.ShowTime DESC
         LIMIT 1`,
        [normalizedMovie]
      );
      showRow = rowsByMovie[0];
    }

    if (!showRow) {
      const [fallbackRows] = await connection.query(
        `SELECT s.ShowID, s.ScreenID, m.Title AS MovieTitle, t.Name AS TheaterName, s.ShowTime
         FROM shows s
         JOIN movie m ON m.MovieID = s.MovieID
         JOIN screen sc ON sc.ScreenID = s.ScreenID
         JOIN theater t ON t.TheaterID = sc.TheaterID
         ORDER BY s.ShowTime DESC
         LIMIT 1`
      );
      showRow = fallbackRows[0];
    }

    if (!showRow) {
      throw new Error('No show records are available to create booking.');
    }

    const [bookingIdRows] = await connection.query(
      'SELECT COALESCE(MAX(BookingID), 0) AS maxId FROM booking'
    );
    const bookingId = bookingIdRows[0].maxId + 1;
    const totalSeats = Array.isArray(selectedSeats) ? selectedSeats.length : 0;
    const pricePerSeat = 190.23;
    const totalPrice = Number((totalSeats * pricePerSeat).toFixed(2));

    await connection.query(
      `INSERT INTO booking (BookingID, UserID, ShowID, BookingDate, TotalSeats, TotalPrice)
       VALUES (?, ?, ?, NOW(), ?, ?)`,
      [bookingId, userId, showRow.ShowID, totalSeats, totalPrice]
    );

    const [paymentIdRows] = await connection.query(
      'SELECT COALESCE(MAX(PaymentID), 0) AS maxId FROM payment'
    );
    const paymentId = paymentIdRows[0].maxId + 1;

    await connection.query(
      `INSERT INTO payment (PaymentID, BookingID, PaymentDate, PaymentMode, PaymentStatus, AmountPaid)
       VALUES (?, ?, NOW(), ?, ?, ?)`,
      [paymentId, bookingId, paymentMode, 'Completed', totalPrice]
    );

    if (totalSeats > 0) {
      const [seatIdRows] = await connection.query(
        'SELECT COALESCE(MAX(SeatID), 0) AS maxId FROM seat'
      );
      let seatId = seatIdRows[0].maxId;
      for (const seatNumber of selectedSeats) {
        seatId += 1;
        await connection.query(
          `INSERT INTO seat (SeatID, SeatNumber, BookingID, ScreenID, Status)
           VALUES (?, ?, ?, ?, ?)`,
          [seatId, seatNumber, bookingId, showRow.ScreenID, 'Booked']
        );
      }
    }

    await connection.commit();

    return {
      bookingId,
      showId: showRow.ShowID,
      movieTitle: showRow.MovieTitle,
      theaterName: showRow.TheaterName,
      showTime: showRow.ShowTime,
      totalSeats,
      totalPrice,
      paymentStatus: 'Completed',
      selectedSeats,
    };
  } catch (error) {
    await connection.rollback();
    console.error('Error creating booking:', error.message);
    throw error;
  } finally {
    connection.release();
  }
}

export async function get_bookings_by_user_id(userId) {
  try {
    const [rows] = await pool.query(
      `SELECT
         b.BookingID,
         b.BookingDate,
         b.TotalSeats,
         b.TotalPrice,
         m.Title AS MovieTitle,
         t.Name AS TheaterName,
         s.ShowTime,
         COALESCE(p.PaymentStatus, 'Completed') AS PaymentStatus,
         GROUP_CONCAT(se.SeatNumber ORDER BY se.SeatNumber SEPARATOR ', ') AS Seats
       FROM booking b
       LEFT JOIN shows s ON s.ShowID = b.ShowID
       LEFT JOIN movie m ON m.MovieID = s.MovieID
       LEFT JOIN screen sc ON sc.ScreenID = s.ScreenID
       LEFT JOIN theater t ON t.TheaterID = sc.TheaterID
       LEFT JOIN payment p ON p.BookingID = b.BookingID
       LEFT JOIN seat se ON se.BookingID = b.BookingID AND se.Status = 'Booked'
       WHERE b.UserID = ?
       GROUP BY
         b.BookingID,
         b.BookingDate,
         b.TotalSeats,
         b.TotalPrice,
         m.Title,
         t.Name,
         s.ShowTime,
         p.PaymentStatus
       ORDER BY b.BookingDate DESC`,
      [userId]
    );
    return rows;
  } catch (error) {
    console.error('Error in get_bookings_by_user_id:', error.message);
    throw error;
  }
}
