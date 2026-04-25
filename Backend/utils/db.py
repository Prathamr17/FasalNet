"""
FasalNet – Database Utilities
Thread-safe PostgreSQL connection pool using psycopg2.
"""
import psycopg2
import psycopg2.pool
from psycopg2.extras import RealDictCursor
from flask import g, current_app
from setting import Config

# Module-level connection pool (initialised once on first import)
_pool: psycopg2.pool.ThreadedConnectionPool | None = None


def get_pool() -> psycopg2.pool.ThreadedConnectionPool:
    """Return (or create) the shared connection pool."""
    global _pool
    if _pool is None:
        _pool = psycopg2.pool.ThreadedConnectionPool(
            minconn=1,
            maxconn=10,
            dsn=Config.DATABASE_URL
        )
    return _pool


def get_db():
    """
    Return a DB connection bound to the current Flask request context.
    The connection is automatically returned to the pool after the request.
    """
    if "db_conn" not in g:
        g.db_conn = get_pool().getconn()
    return g.db_conn


def close_db(error=None):
    """Return the request-scoped connection back to the pool."""
    conn = g.pop("db_conn", None)
    if conn is not None:
        get_pool().putconn(conn)


def query(sql: str, params=None, fetchone=False, fetchall=False, commit=False):
    """
    Convenience wrapper.
    Returns:
        fetchone  → single dict or None
        fetchall  → list of dicts
        commit    → lastrowid (for INSERT RETURNING id)
        default   → None
    """
    conn = get_db()
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(sql, params or ())
        if commit:
            conn.commit()
            # Attempt to return the inserted id if query had RETURNING
            try:
                row = cur.fetchone()
                return dict(row) if row else None
            except Exception:
                return None
        if fetchone:
            row = cur.fetchone()
            return dict(row) if row else None
        if fetchall:
            rows = cur.fetchall()
            return [dict(r) for r in rows]
    return None


def init_app(app):
    """Register teardown hook with the Flask app."""
    app.teardown_appcontext(close_db)
