from psycopg.rows import dict_row


_SQL_INSERT_EMAIL_LOG = """
INSERT INTO tender_supplier_lot_emails (
    tsl_id, tender_id, supplier_id, technical_lot_id, direction,
    subject, body_envoi, body_recu, tracking_token, message_id, in_reply_to,
    from_address, to_address, sent_at, received_at, status_id, error_message
) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
RETURNING id
"""

async def insert_email_log(
    conn, tsl_id: int | None, tender_id: int, supplier_id: int, technical_lot_id: int,
    direction: str, subject: str | None = None,
    body_envoi: str | None = None, body_recu: str | None = None,
    tracking_token: str | None = None, message_id: str | None = None,
    in_reply_to: str | None = None, from_address: str | None = None,
    to_address: str | None = None, sent_at=None, received_at=None,
    status_id: int | None = None, error_message: str | None = None,
) -> int:
    async with conn.cursor() as cur:
        await cur.execute(_SQL_INSERT_EMAIL_LOG, (
            tsl_id, tender_id, supplier_id, technical_lot_id, direction,
            subject, body_envoi, body_recu, tracking_token, message_id, in_reply_to,
            from_address, to_address, sent_at, received_at, status_id, error_message,
        ))
        row = await cur.fetchone()
        return row[0]


_SQL_GET_EMAIL_LOG_BY_TOKEN = """
SELECT tsl_id, tender_id, technical_lot_id, supplier_id
FROM tender_supplier_lot_emails
WHERE tracking_token = %s
LIMIT 1
"""

async def get_email_log_by_token(conn, token: str) -> dict | None:
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(_SQL_GET_EMAIL_LOG_BY_TOKEN, (token,))
        return await cur.fetchone()


_SQL_GET_EMAIL_LOG_BY_MESSAGE_ID = """
SELECT tsl_id, tender_id, technical_lot_id, supplier_id
FROM tender_supplier_lot_emails
WHERE message_id = %s
LIMIT 1
"""

async def get_email_log_by_message_id(conn, message_id: str) -> dict | None:
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(_SQL_GET_EMAIL_LOG_BY_MESSAGE_ID, (message_id,))
        return await cur.fetchone()


_SQL_GET_LOGS_BY_TSL = """
SELECT
    e.id, e.direction, e.subject, e.body_envoi, e.body_recu, e.from_address, e.to_address,
    e.sent_at, e.received_at, e.status_id, tsls.name AS status_name,
    e.error_message, e.created_at
FROM tender_supplier_lot_emails e
LEFT JOIN tender_supplier_lots_status tsls ON tsls.id = e.status_id
WHERE e.tsl_id = %s
ORDER BY e.created_at DESC
"""

async def get_email_logs_by_tsl(conn, tsl_id: int) -> list[dict]:
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(_SQL_GET_LOGS_BY_TSL, (tsl_id,))
        return await cur.fetchall()


_SQL_GET_LOG_BY_ID = "SELECT id, tsl_id FROM tender_supplier_lot_emails WHERE id = %s"

async def get_email_log_by_id(conn, log_id: int) -> dict | None:
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(_SQL_GET_LOG_BY_ID, (log_id,))
        return await cur.fetchone()


_SQL_DELETE_LOG = "DELETE FROM tender_supplier_lot_emails WHERE id = %s"

async def delete_email_log(conn, log_id: int) -> bool:
    async with conn.cursor() as cur:
        await cur.execute(_SQL_DELETE_LOG, (log_id,))
        return cur.rowcount > 0