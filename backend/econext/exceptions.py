"""
Global Exception Handler for EcoNext Django Backend.
Provides unified error payloads and handles database exceptions cleanly.
"""

import logging
from django.db import IntegrityError, DatabaseError, OperationalError
from django.core.exceptions import ObjectDoesNotExist, ValidationError as DjangoValidationError
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Custom exception handler for Django REST Framework.
    Wraps standard and unexpected exceptions into a consistent {status, message, errors} envelope.
    """
    # Call REST framework's default exception handler first to get the standard error response
    response = exception_handler(exc, context)

    # 1. Handle DRF-managed exceptions (e.g. ValidationError, AuthenticationFailed, PermissionDenied, NotFound)
    if response is not None:
        custom_data = {
            'status': 'error',
            'message': 'Request validation or processing failed.',
            'errors': response.data
        }

        # Format human-friendly top-level message if detail is present
        if isinstance(response.data, dict):
            if 'detail' in response.data:
                custom_data['message'] = str(response.data['detail'])
            elif 'message' in response.data:
                custom_data['message'] = str(response.data['message'])

        response.data = custom_data
        return response

    # 2. Handle Database Integrity Errors (e.g. Duplicate unique key, Foreign key violation)
    if isinstance(exc, IntegrityError):
        logger.warning(f"Database IntegrityError in view {context.get('view')}: {exc}")
        return Response({
            'status': 'error',
            'message': 'A database integrity conflict occurred (duplicate entry or invalid relationship).',
            'error_type': 'IntegrityError'
        }, status=status.HTTP_409_CONFLICT)

    # 3. Handle Database Operational / Connection Errors
    if isinstance(exc, (OperationalError, DatabaseError)):
        logger.error(f"Database operational error: {exc}", exc_info=True)
        return Response({
            'status': 'error',
            'message': 'The database server is currently unavailable. Please try again shortly.',
            'error_type': 'DatabaseUnavailable'
        }, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    # 4. Handle Django Core ObjectDoesNotExist
    if isinstance(exc, ObjectDoesNotExist):
        return Response({
            'status': 'error',
            'message': 'The requested resource does not exist.',
            'error_type': 'NotFound'
        }, status=status.HTTP_404_NOT_FOUND)

    # 5. Handle Django Core ValidationError
    if isinstance(exc, DjangoValidationError):
        return Response({
            'status': 'error',
            'message': 'Data validation failed.',
            'errors': exc.message_dict if hasattr(exc, 'message_dict') else exc.messages
        }, status=status.HTTP_400_BAD_REQUEST)

    # 6. Unhandled Internal Server Errors
    logger.error(f"Unhandled exception in API view {context.get('view')}: {exc}", exc_info=True)
    return Response({
        'status': 'error',
        'message': 'An unexpected server error occurred. Please contact support if the issue persists.',
        'error_type': exc.__class__.__name__
    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
