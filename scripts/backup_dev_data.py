"""
EcoNext Pre-Reset Development Data Backup Utility
Exports all existing order, shipment, payment, tracking, and fulfillment records
to a timestamped JSON backup file before any deletion takes place.
"""

import os
import sys
import json
from datetime import datetime, date
from decimal import Decimal
import MySQLdb
import MySQLdb.cursors

def serialize_item(obj):
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    if isinstance(obj, Decimal):
        return str(obj)
    if isinstance(obj, bytes):
        return obj.decode('utf-8', errors='replace')
    raise TypeError(f"Type {type(obj)} not serializable")

def run_backup():
    print("Starting pre-reset development database backup...")
    host = '127.0.0.1'
    port = 3306
    user = 'root'
    passwd = 'shivaJ@123'

    backup_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'scratch', 'backups')
    os.makedirs(backup_dir, exist_ok=True)
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_file = os.path.join(backup_dir, f'econext_dev_data_backup_{timestamp}.json')

    data = {
        'timestamp': datetime.now().isoformat(),
        'host': host,
        'databases': {}
    }

    targets = {
        'econext': [
            'order_service_order',
            'order_service_orderitem',
            'order_service_orderstatushistory',
            'order_service_notificationlog',
            'order_service_orderreturn',
            'order_service_shipment',
            'order_service_shipmentitem',
            'order_service_container',
            'order_service_deliveryverificationaudit',
            'order_service_routeexceptionaudit',
            'order_service_logisticstrackingevent',
            'shipment_events',
        ],
        'econext_order_db': [
            'operational_orders',
            'operational_order_items',
            'operational_order_transitions',
            'shipments',
            'shipment_items',
            'shipment_events',
            'delivery_verification_audits',
            'logistics_tracking_events',
            'route_exception_audits',
            'order_return_requests',
        ],
        'econext_payment_db': [
            'payment_transactions',
            'refund_transactions',
        ],
        'econext_notification_db': [
            'notifications',
        ],
    }

    conn = MySQLdb.connect(host=host, user=user, passwd=passwd, port=port, charset='utf8mb4')
    cur = conn.cursor(MySQLdb.cursors.DictCursor)

    total_records = 0
    for db_name, tables in targets.items():
        data['databases'][db_name] = {}
        for tbl in tables:
            try:
                cur.execute(f"SELECT * FROM `{db_name}`.`{tbl}`")
                rows = cur.fetchall()
                data['databases'][db_name][tbl] = list(rows)
                cnt = len(rows)
                total_records += cnt
                print(f"  Backed up {db_name}.{tbl}: {cnt} rows")
            except Exception as e:
                print(f"  Note on {db_name}.{tbl}: {e}")

    # Also backup accounts_activitylog purchase entries
    try:
        cur.execute("SELECT * FROM `econext`.`accounts_activitylog` WHERE action = 'purchase'")
        rows = cur.fetchall()
        data['databases']['econext']['accounts_activitylog_purchase'] = list(rows)
        cnt = len(rows)
        total_records += cnt
        print(f"  Backed up econext.accounts_activitylog (purchase): {cnt} rows")
    except Exception as e:
        print(f"  Note on activity log: {e}")

    with open(backup_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, default=serialize_item, indent=2)

    cur.close()
    conn.close()

    print(f"\nSUCCESS: Exported {total_records} records across 4 databases to:")
    print(f"  {backup_file}")
    return backup_file

if __name__ == '__main__':
    run_backup()
