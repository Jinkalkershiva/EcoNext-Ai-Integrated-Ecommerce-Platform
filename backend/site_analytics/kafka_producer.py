"""
EcoNext Kafka Event Producer for Live Data Ingestion & Big Data Streaming.
Publishes customer search clickstream, product view impressions, cart updates, and order lifecycle events.
Fault-tolerant & non-blocking: e-commerce requests proceed smoothly even if Kafka is unreachable.
"""

import os
import json
import uuid
import logging
from datetime import datetime, timezone
import threading

logger = logging.getLogger(__name__)

KAFKA_BOOTSTRAP_SERVERS = os.getenv('KAFKA_BOOTSTRAP_SERVERS', 'localhost:9092')
KAFKA_ENABLED = os.getenv('KAFKA_ENABLED', 'True').lower() in ('true', '1', 'yes')

# Kafka Topics
TOPIC_SEARCH_EVENTS = 'user-search-events'
TOPIC_PRODUCT_VIEWS = 'product-view-events'
TOPIC_CART_EVENTS = 'cart-events'
TOPIC_ORDER_EVENTS = 'order-events'
TOPIC_INVENTORY_EVENTS = 'inventory-events'
TOPIC_SHIPMENT_STATUS = 'shipment.status.updated'
TOPIC_SHIPMENT_LOCATION = 'shipment.location.updated'
TOPIC_CONTAINER_STATUS = 'container.status.updated'

_producer = None
_producer_lock = threading.Lock()
_kafka_available = None


def _get_producer():
    global _producer, _kafka_available
    if not KAFKA_ENABLED:
        return None

    if _producer is not None:
        return _producer

    with _producer_lock:
        if _producer is not None:
            return _producer
        try:
            from kafka import KafkaProducer
            _producer = KafkaProducer(
                bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS.split(','),
                value_serializer=lambda v: json.dumps(v).encode('utf-8'),
                key_serializer=lambda k: k.encode('utf-8') if k else None,
                request_timeout_ms=2000,
                max_block_ms=1000,
                retries=1
            )
            _kafka_available = True
            logger.info("Kafka Producer successfully initialized connected to %s", KAFKA_BOOTSTRAP_SERVERS)
        except Exception as exc:
            _kafka_available = False
            logger.debug("Kafka broker not reached (%s). Operating in graceful local mode.", exc)
            _producer = None
    return _producer


def send_event_async(topic, payload, key=None):
    """
    Sends event to Kafka asynchronously without blocking the calling thread.
    """
    def _send():
        try:
            envelope = {
                'eventId': str(uuid.uuid4()),
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'topic': topic,
                'data': payload
            }
            producer = _get_producer()
            if producer:
                producer.send(topic, key=str(key) if key else None, value=envelope)
                logger.debug("Emitted event to Kafka topic %s: %s", topic, payload)
            else:
                logger.debug("Local telemetry event for %s (Kafka detached): %s", topic, payload)
        except Exception as err:
            logger.debug("Failed to stream event to topic %s: %s", topic, err)

    threading.Thread(target=_send, daemon=True).start()


def publish_search_event(user, query, results_count=0, category_id=None):
    """Emits search query clickstream event."""
    user_id = str(user.id) if user and user.is_authenticated else 'anonymous'
    payload = {
        'userId': user_id,
        'query': query,
        'resultsCount': results_count,
        'categoryId': category_id,
        'source': 'ECONEXT_DJANGO_FRONTEND'
    }
    send_event_async(TOPIC_SEARCH_EVENTS, payload, key=user_id)


def publish_product_view_event(user, product_id, category_name=None, duration_ms=0):
    """Emits product view impression event."""
    user_id = str(user.id) if user and user.is_authenticated else 'anonymous'
    payload = {
        'userId': user_id,
        'productId': product_id,
        'category': category_name,
        'durationMs': duration_ms,
        'source': 'ECONEXT_DJANGO_FRONTEND'
    }
    send_event_async(TOPIC_PRODUCT_VIEWS, payload, key=str(product_id))


def publish_order_event(order_id, user_id, total_amount, status, items_count=1):
    """Emits order lifecycle event."""
    payload = {
        'orderId': order_id,
        'userId': str(user_id),
        'totalAmount': float(total_amount),
        'status': status,
        'itemsCount': items_count,
        'source': 'ECONEXT_DJANGO_CHECKOUT'
    }
    send_event_async(TOPIC_ORDER_EVENTS, payload, key=str(order_id))


def publish_shipment_status_event(shipment_id, order_id, status, tracking_number=None, carrier_name=None, shipment_number=None):
    """Emits shipment status updated event."""
    payload = {
        'shipmentId': shipment_id,
        'shipmentNumber': shipment_number or f"SHP-{order_id}-{shipment_id}",
        'orderId': order_id,
        'status': status,
        'carrierName': carrier_name or 'EcoExpress Carbon-Neutral',
        'trackingNumber': tracking_number or '',
        'source': 'ECONEXT_FULFILLMENT'
    }
    send_event_async(TOPIC_SHIPMENT_STATUS, payload, key=str(shipment_id))


def publish_shipment_location_event(shipment_id, order_id, latitude, longitude, location_name='', status='IN_TRANSIT', tracking_number=None, vehicle_number=None, shipment_number=None):
    """Emits real-time shipment GPS vehicle location update event."""
    payload = {
        'shipmentId': shipment_id,
        'shipmentNumber': shipment_number or f"SHP-{order_id}-{shipment_id}",
        'orderId': order_id,
        'latitude': float(latitude) if latitude is not None else None,
        'longitude': float(longitude) if longitude is not None else None,
        'locationName': location_name,
        'status': status,
        'trackingNumber': tracking_number or '',
        'vehicleNumber': vehicle_number or '',
        'source': 'ECONEXT_GPS_TRACKING'
    }
    send_event_async(TOPIC_SHIPMENT_LOCATION, payload, key=str(shipment_id))


def publish_container_status_event(container_id, container_code, status, origin='', destination=''):
    """Emits container status transition event."""
    payload = {
        'containerId': container_id,
        'containerCode': container_code,
        'status': status,
        'origin': origin,
        'destination': destination,
        'source': 'ECONEXT_CONTAINER_OPS'
    }
    send_event_async(TOPIC_CONTAINER_STATUS, payload, key=str(container_id))

