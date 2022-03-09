const express = require('express');
const router = express.Router();
const db = require('../database');

// list reviews
router.get('/reviews', (req, res) => {
  let { product_id } = req.query;
  let count = req.query.count || 5;
  let page = req.query.page || 1;
  let sort = req.query.sort || 'newest';

  if (sort === 'newest') {
    sort = 'ORDER BY review_date DESC';
  } else if (sort === 'helpful') {
    sort = 'ORDER BY helpfulness DESC';
  } else if (sort === 'relevant') {
    sort = 'ORDER BY helpfulness DESC, review_date DESC';
  }

  db.query(
    `SELECT
      json_build_object(
        'review_id', r.id,
        'rating', r.rating,
        'summary', r.summary,
        'recommend', r.recommend,
        'response', r.response,
        'body', r.body,
        'date', to_char(to_timestamp(r.review_date), 'DD-MM-YYYY"T"HH24:MI:SS.MS"Z"'),
        'reviewer_name', r.reviewer_name,
        'helpfulness', r.helpfulness,
        'photos',
        (SELECT coalesce
          (array_agg
            (json_build_object(
              'id', p.id,
              'url', p.url)),
              '{}')
        AS photos FROM reviews_photos p WHERE r.id = p.review_id)
      )
    FROM reviews r WHERE product_id = $1 AND reported = false ${sort} LIMIT $2 OFFSET ${count * page - count}`, [product_id, count])
    .then((result) => {
      let response = {
        product: product_id,
        page,
        count,
        results: result.rows.map(row => { return row.json_build_object })
      }
      res.status(200).send(response);
    })
    .catch((err) => res.status(400).send(err.message));
});

// reviews metadata
router.get('/reviews/meta', (req, res) => {
  let { product_id } = req.query;

  db.query(
    `SELECT reviews.product_id,
      (SELECT json_build_object(
        1, (SELECT count(*) filter (where rating = 1)),
        2, (SELECT count(*) filter (where rating = 2)),
        3, (SELECT count(*) filter (where rating = 3)),
        4, (SELECT count(*) filter (where rating = 4)),
        5, (SELECT count(*) filter (where rating = 5))
        ))
      AS ratings,
      (SELECT (json_build_object(
        true, count(recommend) filter (where recommend = true),
        false, count(recommend) filter (where recommend = false)
      )))
      AS recommended,
      (SELECT json_object_agg(name,
        json_build_object('id', characteristics.id,
        'value', (SELECT CAST(avg(value) AS TEXT) FROM characteristic_reviews WHERE characteristic_id = characteristics.id)))
        AS characteristics FROM characteristics
        JOIN characteristic_reviews ON characteristics.id = characteristic_reviews.id AND reviews.product_id = characteristics.product_id)
      FROM reviews
    WHERE reviews.product_id = $1
    GROUP BY reviews.product_id`, [product_id])
      .then((results) => res.status(200).send(results.rows[0]))
      .catch((err) => res.status(400).send(err.message));
});

// post a new review
router.post('/reviews', async (req, res) => {
  const {
    product_id, rating, summary, body, recommend, reviewer_name, reviewer_email, photos, characteristics
  } = req.body;
  // const date = Date.now();

  try {
    await db.query(
      `INSERT INTO REVIEWS (product_id, rating, review_date, summary, body, recommend, reviewer_name, reviewer_email)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id`, [product_id, rating, Date.now(), summary, body, recommend, reviewer_name, reviewer_email])
      .then(async ({ rows }) => {
        const review_id = rows[0].review_id;
        try {
          if (photos.length > 0) {
            photos.forEach(photo => {
              db.query(`INSERT INTO reviews_photos (review_id, url) VALUES ($1, $2)`, [review_id, photo])
            })
          }
          for (let [characteristic, rating] of Object.entries(characteristics)) {
            await db.query(`INSERT INTO characteristic_reviews (characteristic_id, review_id, value) VALUES ($1, $2, $3)`, [characteristic, review_id, rating])
          }
          res.status(200).send('Review has been posted');
        }
        catch (err) {
          res.status(400).send(err.message);
        }
      })
  }
  catch (err) {
    res.status(400).send(err.message);
  }
});

// mark review helpful
router.put('/reviews/:review_id/helpful', (req, res) => {
  const { review_id } = req.params;
  db.query(`UPDATE reviews SET helpfulness = helpfulness + 1 WHERE id = $1`, [review_id])
    .then(() => res.status(200).send('Review marked helpful'))
    .catch((err) => res.status(400).send(err.message));
});

// report review
router.put('/reviews/:review_id/report', (req, res) => {
  const { review_id } = req.params;
  db.query(`UPDATE reviews set reported = true WHERE id = $1`, [review_id])
    .then(() => res.status(200).send('Review has been repored'))
    .catch((err) => res.status(400).send(err.message));
});

module.exports = router;