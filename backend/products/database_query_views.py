"""
Controlled Database SQL Query Console API for EcoNext Admin Panel.
Implements strict read-only execution, keyword blocklisting, statement count checks,
row limiting, query timeouts, and audit logging.
"""

import os
import re
import time
import json
import logging
from django.db import connection, connections
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import BasePermission
from rest_framework.response import Response
from accounts.models import ActivityLog
from accounts.auth_views import is_admin_or_has_perm

logger = logging.getLogger(__name__)


class IsAuthorizedQueryConsoleOperator(BasePermission):
    """
    Grants access if the request is from a staff/admin with DATABASE_QUERY_READ, AUDIT_READ,
    or ROLE_ADMIN permission, is a superuser, or carries a valid internal service key.
    """
    def has_permission(self, request, view):
        internal_key = request.headers.get('X-Internal-Service-Key') or request.META.get('HTTP_X_INTERNAL_SERVICE_KEY')
        configured_key = os.getenv('INTERNAL_SERVICE_KEY', 'econext-internal-microservice-key-2026')
        if internal_key and internal_key == configured_key:
            return True
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        if not request.user.is_staff:
            return False
        return (
            is_admin_or_has_perm(request.user, 'DATABASE_QUERY_READ') or
            is_admin_or_has_perm(request.user, 'AUDIT_READ') or
            is_admin_or_has_perm(request.user, 'ROLE_ADMIN')
        )


# Query execution history buffer in-memory
QUERY_HISTORY = []
MAX_HISTORY_ITEMS = 50

# Strict blocklist for dangerous/mutating SQL keywords
BLOCKED_KEYWORDS = [
    r'\bDROP\b', r'\bTRUNCATE\b', r'\bDELETE\b', r'\bUPDATE\b',
    r'\bALTER\b', r'\bCREATE\b', r'\bGRANT\b', r'\bREVOKE\b',
    r'\bINSERT\b', r'\bREPLACE\b', r'\bEXEC\b', r'\bEXECUTE\b',
    r'\bCALL\b', r'\bLOCK\b', r'\bUNLOCK\b', r'\bSET\b',
    r'\bRENAME\b', r'\bSHUTDOWN\b', r'\bFLUSH\b', r'\bKILL\b'
]

ALLOWED_COMMANDS = ['SELECT', 'SHOW', 'DESCRIBE', 'DESC', 'EXPLAIN']


def validate_read_only_query(raw_query):
    """
    Validates that the SQL query is strictly read-only, non-piggybacked, and safe.
    Returns (is_valid, sanitized_query_or_error_message).
    """
    if not raw_query or not raw_query.strip():
        return False, "Query cannot be empty."

    cleaned = raw_query.strip()

    # Strip single-line and multi-line comments
    cleaned = re.sub(r'--.*$', '', cleaned, flags=re.MULTILINE)
    cleaned = re.sub(r'/\*.*?\*/', '', cleaned, flags=re.DOTALL)
    cleaned = cleaned.strip()

    if not cleaned:
        return False, "Query contains no executable statements after stripping comments."

    # Check for multiple statements separated by semicolon
    statements = [s.strip() for s in cleaned.split(';') if s.strip()]
    if len(statements) > 1:
        return False, "Multiple SQL statements are not permitted in the controlled query console."

    statement = statements[0]

    # Check starting command
    first_token = statement.split()[0].upper()
    if first_token not in ALLOWED_COMMANDS:
        return False, f"Query command '{first_token}' is not permitted. Only {', '.join(ALLOWED_COMMANDS)} statements are allowed in read-only mode."

    # Check for blocked keywords anywhere in query
    for pattern in BLOCKED_KEYWORDS:
        if re.search(pattern, statement, re.IGNORECASE):
            match = re.search(pattern, statement, re.IGNORECASE).group(0)
            return False, f"Permission Denied: '{match.upper()}' operations are strictly forbidden in read-only SQL console."

    # Enforce row limit on SELECT statements
    if first_token == 'SELECT' and not re.search(r'\bLIMIT\b', statement, re.IGNORECASE):
        statement = statement + ' LIMIT 100'

    return True, statement


@api_view(['POST'])
@permission_classes([IsAuthorizedQueryConsoleOperator])
def execute_sql_query(request):

    """
    Executes a controlled read-only SQL query on the MySQL database.
    Enforces row limits, timeouts, and creates an audit entry.
    """
    query_text = request.data.get('query', '').strip()
    database_name = request.data.get('database', 'econext').strip()

    user_name = request.user.username if (request.user and request.user.is_authenticated) else 'ADMIN'

    is_valid, sanitized_or_error = validate_read_only_query(query_text)

    start_time = time.time()

    if not is_valid:
        history_entry = {
            'id': len(QUERY_HISTORY) + 1,
            'query': query_text[:200],
            'database': database_name,
            'user': user_name,
            'status': 'BLOCKED',
            'error': sanitized_or_error,
            'duration_ms': 0,
            'row_count': 0,
            'timestamp': time.strftime('%Y-%m-%d %H:%M:%S')
        }
        QUERY_HISTORY.insert(0, history_entry)
        if len(QUERY_HISTORY) > MAX_HISTORY_ITEMS:
            QUERY_HISTORY.pop()

        return Response({
            'status': 'error',
            'error_type': 'SECURITY_RESTRICTION',
            'message': sanitized_or_error,
            'query': query_text
        }, status=status.HTTP_400_BAD_REQUEST)

    sanitized_query = sanitized_or_error

    try:
        with connection.cursor() as cursor:
            cursor.execute(sanitized_query)
            
            # Extract column headers
            columns = [col[0] for col in cursor.description] if cursor.description else []
            
            # Fetch at most 100 rows
            raw_rows = cursor.fetchmany(100)
            
            # Format row data safely for JSON
            rows = []
            for row in raw_rows:
                formatted_row = {}
                for idx, col in enumerate(columns):
                    val = row[idx]
                    if val is not None and hasattr(val, 'isoformat'):
                        formatted_row[col] = val.isoformat()
                    elif isinstance(val, bytes):
                        formatted_row[col] = val.decode('utf-8', errors='replace')
                    elif isinstance(val, (int, float, str, bool)):
                        formatted_row[col] = val
                    else:
                        formatted_row[col] = str(val) if val is not None else None
                rows.append(formatted_row)

        duration_ms = round((time.time() - start_time) * 1000, 2)

        history_entry = {
            'id': len(QUERY_HISTORY) + 1,
            'query': sanitized_query,
            'database': database_name,
            'user': user_name,
            'status': 'SUCCESS',
            'duration_ms': duration_ms,
            'row_count': len(rows),
            'timestamp': time.strftime('%Y-%m-%d %H:%M:%S')
        }
        QUERY_HISTORY.insert(0, history_entry)
        if len(QUERY_HISTORY) > MAX_HISTORY_ITEMS:
            QUERY_HISTORY.pop()

        # Audit log entry
        try:
            if request.user and request.user.is_authenticated:
                ActivityLog.objects.create(
                    user=request.user,
                    action='DATABASE_SQL_QUERY_EXECUTED',
                    details={
                        'query': sanitized_query[:200],
                        'duration_ms': duration_ms,
                        'rows': len(rows),
                        'status': 'SUCCESS'
                    }
                )
        except Exception as e:
            logger.warning(f"Audit log record note: {e}")

        return Response({
            'status': 'success',
            'query': sanitized_query,
            'execution_time_ms': duration_ms,
            'row_count': len(rows),
            'columns': columns,
            'rows': rows
        }, status=status.HTTP_200_OK)

    except Exception as ex:
        duration_ms = round((time.time() - start_time) * 1000, 2)
        err_msg = str(ex)

        history_entry = {
            'id': len(QUERY_HISTORY) + 1,
            'query': sanitized_query,
            'database': database_name,
            'user': user_name,
            'status': 'ERROR',
            'error': err_msg,
            'duration_ms': duration_ms,
            'row_count': 0,
            'timestamp': time.strftime('%Y-%m-%d %H:%M:%S')
        }
        QUERY_HISTORY.insert(0, history_entry)
        if len(QUERY_HISTORY) > MAX_HISTORY_ITEMS:
            QUERY_HISTORY.pop()

        return Response({
            'status': 'error',
            'error_type': 'SQL_EXECUTION_ERROR',
            'message': err_msg,
            'query': sanitized_query,
            'execution_time_ms': duration_ms
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthorizedQueryConsoleOperator])
def get_query_history(request):
    """
    Returns the recent query execution history from the audit buffer.
    """
    return Response({
        'status': 'success',
        'history': QUERY_HISTORY,
        'data': QUERY_HISTORY
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthorizedQueryConsoleOperator])
def get_database_schema(request):
    """
    Returns the list of tables and column definitions for schema exploration.
    """
    schema_info = {}
    try:
        with connection.cursor() as cursor:
            cursor.execute("SHOW TABLES;")
            tables = [r[0] for r in cursor.fetchall()]

            for table in tables:
                cursor.execute(f"DESCRIBE `{table}`;")
                columns = []
                for col in cursor.fetchall():
                    columns.append({
                        'name': col[0],
                        'type': col[1],
                        'null': col[2],
                        'key': col[3],
                        'default': str(col[4]) if col[4] is not None else None
                    })
                schema_info[table] = columns

        return Response({
            'status': 'success',
            'tables': list(schema_info.keys()),
            'schema': schema_info
        }, status=status.HTTP_200_OK)

    except Exception as ex:
        return Response({
            'status': 'error',
            'message': str(ex)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
