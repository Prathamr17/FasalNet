"""
FasalNet – Database Utilities
Thread-safe PostgreSQL connection pool using psycopg2.
"""
import psycopg2
import psycopg2.pool
from psycopg2.extras import RealDictCursor
from flask import g, current_app
from settings import Config

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
    Return a DB connection bound to the current Flask request context if available,
    otherwise borrow a connection directly from the pool.
    """
    from flask import has_app_context
    if has_app_context():
        if "db_conn" not in g:
            g.db_conn = get_pool().getconn()
        return g.db_conn
    return get_pool().getconn()


def close_db(error=None):
    """Return the request-scoped connection back to the pool."""
    conn = g.pop("db_conn", None)
    if conn is not None and _pool is not None:
        try:
            _pool.putconn(conn)
        except Exception:
            try:
                conn.close()
            except Exception:
                pass


def query(sql: str, params=None, fetchone=False, fetchall=False, commit=False):
    """
    Convenience wrapper.
    Returns:
        fetchone  → single dict or None
        fetchall  → list of dicts
        commit    → lastrowid (for INSERT RETURNING id)
        default   → None
    """
    from flask import has_app_context
    in_ctx = has_app_context()
    conn = get_db()
    try:
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
    finally:
        if not in_ctx and _pool is not None:
            try:
                _pool.putconn(conn)
            except Exception:
                pass


def init_app(app):
    """Register teardown hook with the Flask app."""
    app.teardown_appcontext(close_db)
