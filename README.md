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
