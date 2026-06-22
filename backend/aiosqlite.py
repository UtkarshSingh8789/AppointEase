"""Minimal local compatibility shim for SQLAlchemy's sqlite+aiosqlite dialect.

This project environment does not ship the real `aiosqlite` package, so we
provide the small subset of the interface that SQLAlchemy's async SQLite
dialect expects. The implementation uses the built-in `sqlite3` module under
the hood and exposes async methods so the rest of the FastAPI app can run
without any network installs.
"""

from __future__ import annotations

import asyncio
import sqlite3
from threading import Thread
from typing import Any, Iterable, Mapping, Optional

DatabaseError = sqlite3.DatabaseError
Error = sqlite3.Error
IntegrityError = sqlite3.IntegrityError
NotSupportedError = sqlite3.NotSupportedError
OperationalError = sqlite3.OperationalError
ProgrammingError = sqlite3.ProgrammingError
sqlite_version = sqlite3.sqlite_version
sqlite_version_info = sqlite3.sqlite_version_info
PARSE_COLNAMES = sqlite3.PARSE_COLNAMES
PARSE_DECLTYPES = sqlite3.PARSE_DECLTYPES
Binary = sqlite3.Binary


class _ImmediateQueue:
    """Queue-like object used by SQLAlchemy's isolation level setter."""

    def __init__(self, connection: "Connection") -> None:
        self._connection = connection

    def put_nowait(self, item: tuple[asyncio.Future[Any], Any]) -> None:
        future, function = item
        try:
            function()
        except Exception as exc:  # pragma: no cover - defensive bridge code
            if not future.done():
                future.set_exception(exc)
        else:
            if not future.done():
                future.set_result(None)


class Cursor:
    """Async wrapper around `sqlite3.Cursor`."""

    def __init__(self, connection: "Connection", cursor: sqlite3.Cursor) -> None:
        self._connection = connection
        self._cursor = cursor
        self.arraysize = 1
        self.description = None
        self.rowcount = -1
        self.lastrowid = None

    async def execute(self, operation: Any, parameters: Optional[Any] = None) -> "Cursor":
        if parameters is None:
            self._cursor.execute(operation)
        else:
            self._cursor.execute(operation, parameters)
        self.description = self._cursor.description
        self.rowcount = self._cursor.rowcount
        self.lastrowid = self._cursor.lastrowid
        return self

    async def executemany(self, operation: Any, seq_of_parameters: Iterable[Any]) -> "Cursor":
        self._cursor.executemany(operation, seq_of_parameters)
        self.description = self._cursor.description
        self.rowcount = self._cursor.rowcount
        self.lastrowid = self._cursor.lastrowid
        return self

    async def fetchall(self) -> list[Any]:
        return self._cursor.fetchall()

    async def fetchone(self) -> Any:
        return self._cursor.fetchone()

    async def fetchmany(self, size: Optional[int] = None) -> list[Any]:
        return self._cursor.fetchmany(size or self.arraysize)

    async def close(self) -> None:
        self._cursor.close()

    async def __aenter__(self) -> "Cursor":
        return self

    async def __aexit__(self, exc_type, exc, tb) -> None:
        await self.close()


class Connection:
    """Async wrapper around `sqlite3.Connection`."""

    def __init__(self, database: str, **kwargs: Any) -> None:
        kwargs = dict(kwargs)
        kwargs.setdefault("check_same_thread", False)
        self._conn = sqlite3.connect(database, **kwargs)
        self._conn.row_factory = None
        self._thread = Thread()
        self._thread.daemon = True
        self._tx = _ImmediateQueue(self)
        self._closed = False

    @property
    def isolation_level(self) -> Optional[str]:
        return self._conn.isolation_level

    @isolation_level.setter
    def isolation_level(self, value: Optional[str]) -> None:
        self._conn.isolation_level = value

    async def cursor(self) -> Cursor:
        return Cursor(self, self._conn.cursor())

    async def execute(self, operation: Any, parameters: Optional[Any] = None) -> Cursor:
        cursor = await self.cursor()
        await cursor.execute(operation, parameters)
        return cursor

    async def executemany(self, operation: Any, seq_of_parameters: Iterable[Any]) -> Cursor:
        cursor = await self.cursor()
        await cursor.executemany(operation, seq_of_parameters)
        return cursor

    async def executescript(self, script: str) -> Cursor:
        self._conn.executescript(script)
        return await self.cursor()

    async def commit(self) -> None:
        self._conn.commit()

    async def rollback(self) -> None:
        self._conn.rollback()

    async def close(self) -> None:
        if self._closed:
            return
        self._conn.close()
        self._closed = True

    async def create_function(self, *args: Any, **kwargs: Any) -> None:
        self._conn.create_function(*args, **kwargs)

    async def set_progress_handler(self, *args: Any, **kwargs: Any) -> None:
        self._conn.set_progress_handler(*args, **kwargs)

    async def set_trace_callback(self, *args: Any, **kwargs: Any) -> None:
        self._conn.set_trace_callback(*args, **kwargs)

    async def enable_load_extension(self, *args: Any, **kwargs: Any) -> None:
        self._conn.enable_load_extension(*args, **kwargs)

    async def interrupt(self) -> None:
        self._conn.interrupt()

    async def backup(self, *args: Any, **kwargs: Any) -> Any:
        return self._conn.backup(*args, **kwargs)

    async def __aenter__(self) -> "Connection":
        return self

    async def __aexit__(self, exc_type, exc, tb) -> None:
        await self.close()

    def __await__(self):
        async def _ready():
            return self

        return _ready().__await__()

    def __getattr__(self, name: str) -> Any:  # pragma: no cover - bridge helper
        return getattr(self._conn, name)


def connect(database: str, *args: Any, **kwargs: Any) -> Connection:
    """Return a local SQLite connection object that mimics aiosqlite."""
    return Connection(database, **kwargs)
