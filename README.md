# Market Sentiment Pulse

A lightweight Flask application that surfaces a single, readable statement of
current stock market sentiment. The backend aggregates data from three public
sources and summarises the overall mood, while the frontend presents the status
in a clean, mobile-friendly interface.

## Getting started

1. Create and activate a Python 3.11 virtual environment.
2. Install the dependencies:

   ```bash
   pip install -r requirements.txt
   ```

3. Start the development server:

   ```bash
   flask --app app run --debug
   ```

4. Open <http://127.0.0.1:5000> in a browser (desktop or mobile) to view the
   live sentiment summary.

### Static hosting

The repository now also includes a pre-built `index.html` at the project root.
When served from a static host (for example GitHub Pages), the page will load a
bundled demo sentiment snapshot from `static/sentiment-sample.json` if the live
Flask API is not available. This allows visitors to experience the interface
without deploying the backend, while still showing live data whenever the API
is reachable.

#### Using the live API from a static host

Static hosts such as GitHub Pages cannot run the Flask backend. To surface live
sentiment data you need to deploy `app.py` to a serverless provider (Render,
Railway, Fly.io, etc.) and then point the static UI at that URL. The frontend
now supports runtime configuration without editing the source code:

1. Deploy the Flask app and note the public URL of the `/api/sentiment`
   endpoint (for example `https://your-service.onrender.com/api/sentiment`).
2. Visit your static site and append the query parameter
   `?api=https://your-service.onrender.com/api/sentiment` to the URL.
3. The page stores the value in `localStorage`, removes the query parameters,
   and uses the live API on subsequent visits.
4. Optional: add `&fallback=https://.../static/sentiment-sample.json` to point
   to an alternate demo file, or append `?resetConfig=1` to clear the stored
   configuration.

These steps keep GitHub Pages serving the static assets while deferring API
requests to your hosted backend, eliminating the "Demo data loaded" message
whenever the live service is reachable.

The backend retrieves live data from the following sources at request time:

- CNN Fear & Greed Index summary
- Alternative.me Fear & Greed Index
- Alpha Vantage News Sentiment API (using the public `demo` key)

Each source is resilient to parsing failures. When one or more sources cannot
be reached, the interface will show the information gathered from the
remaining sources and note any connection errors.

## Notes

- Network access is required for the application to reach the sentiment data
  providers. If running inside a restricted environment, the refresh action
  may show an error message until connectivity is restored.
- The UI is responsive and optimised for modern mobile and desktop browsers.
