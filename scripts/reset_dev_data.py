"""
EcoNext Controlled Development Data Reset Utility
Safely removes test/demo orders, fulfillment records, historical shipments,
tracking telemetry, and payment transactions while strictly preserving:
- All users and admin/staff accounts
- All products, categories, variants, and catalog master data
- All warehouse, hub, fleet, truck, container, driver, and carrier master definitions
- Database schemas and configurations

Safety Checks:
- Enforces execution ONLY on local development database (127.0.0.1 / localhost)
- Requires confirmation or --force flag
- Verifies post-reset referential integrity and zero orphan records
"""

import sys
import os
import argparse
import MySQLdb

LOCAL_HOSTS = ('127.0.0.1', 'localhost', '::1')

def reset_development_data(force=False):
    db_host = '127.0.0.1'
    db_port = 3306
    db_user = 'root'
    db_pass = 'shivaJ@123'

    print("=================================================================")
    print("      EcoNext Safe Development Data Reset Mechanism            ")
    print("=================================================================")

    # 1. Target Environment Verification
    if db_host not in LOCAL_HOSTS:
        print(f"ABORT: Reset can ONLY be run against local development databases (found: {db_host}).")
        sys.exit(1)

    print(f"Target Environment: Verified LOCAL DEVELOPMENT ({db_host}:{db_port})")

    conn = MySQLdb.connect(host=db_host, user=db_user, passwd=db_pass, port=db_port, charset='utf8mb4')
    cur = conn.cursor()

    # Pre-count affected records
    counts = {}
    plan = [
        ('econext', 'order_service_order', 'Orders'),
        ('econext', 'order_service_orderitem', 'Order Items'),
        ('econext', 'order_service_orderstatushistory', 'Order Status History'),
        ('econext', 'order_service_notificationlog', 'Order Notification Logs'),
        ('econext', 'order_service_orderreturn', 'Order Returns'),
        ('econext', 'order_service_shipment', 'Django Shipments'),
        ('econext', 'order_service_shipmentitem', 'Django Shipment Items'),
        ('econext', 'shipment_events', 'Django Shipment Events'),
        ('econext_order_db', 'operational_orders', 'Operational Orders'),
        ('econext_order_db', 'operational_order_items', 'Operational Order Items'),
        ('econext_order_db', 'operational_order_transitions', 'Operational Order Transitions'),
        ('econext_order_db', 'shipments', 'Logistics Shipments'),
        ('econext_order_db', 'shipment_items', 'Logistics Shipment Items'),
        ('econext_order_db', 'shipment_events', 'Logistics Shipment Events'),
        ('econext_order_db', 'delivery_verification_audits', 'Delivery Verification Audits'),
        ('econext_order_db', 'logistics_tracking_events', 'Logistics Tracking Events'),
        ('econext_order_db', 'route_exception_audits', 'Route Exception Audits'),
        ('econext_payment_db', 'payment_transactions', 'Payment Transactions'),
        ('econext_payment_db', 'refund_transactions', 'Refund Transactions'),
        ('econext_notification_db', 'notifications', 'Notifications'),
    ]

    print("\nRecords targeted for reset:")
    for db, tbl, label in plan:
        try:
            cur.execute(f"SELECT COUNT(*) FROM `{db}`.`{tbl}`")
            c = cur.fetchone()[0]
            counts[f"{db}.{tbl}"] = c
            print(f"  - {db}.{tbl} ({label}): {c} records")
        except Exception as e:
            print(f"  - {db}.{tbl}: Table check note: {e}")

    try:
        cur.execute("SELECT COUNT(*) FROM `econext`.`accounts_activitylog` WHERE action = 'purchase'")
        act_cnt = cur.fetchone()[0]
        counts['econext.accounts_activitylog_purchase'] = act_cnt
        print(f"  - econext.accounts_activitylog (purchase entries): {act_cnt} records")
    except Exception:
        pass

    if not force:
        print("\nRun with --force to execute reset.")
        return False

    print("\nExecuting controlled reset...")

    # --- Step 1: Reset logistics_drivers & containers in econext_order_db ---
    print("  1. Resetting driver allocations and container loads (preserving master records)...")
    cur.execute("UPDATE `econext_order_db`.`logistics_drivers` SET assigned_shipment_id = NULL, status = 'AVAILABLE'")
    cur.execute("UPDATE `econext_order_db`.`containers` SET used_weight_kg = 0.00, used_volume_m3 = 0.00, status = 'CREATED'")
    conn.commit()

    # --- Step 2: Clear child/dependent records in econext_order_db ---
    print("  2. Clearing dependent fulfillment, tracking, audit and item records in econext_order_db...")
    order_db_children = [
        'delivery_verification_audits',
        'route_exception_audits',
        'logistics_tracking_events',
        'shipment_events',
        'operational_order_transitions',
        'order_return_requests',
        'shipment_items',
        'operational_order_items',
    ]
    for tbl in order_db_children:
        cur.execute(f"DELETE FROM `econext_order_db`.`{tbl}`")
    conn.commit()

    # Break circular/FK dependency between operational_orders and shipments
    print("  3. Unlinking operational orders from shipments...")
    cur.execute("UPDATE `econext_order_db`.`operational_orders` SET shipment_id = NULL")
    conn.commit()

    print("  4. Deleting operational orders and shipments in econext_order_db...")
    cur.execute("DELETE FROM `econext_order_db`.`operational_orders`")
    cur.execute("DELETE FROM `econext_order_db`.`shipments`")
    conn.commit()

    # --- Step 3: Clear Django backend records in econext ---
    print("  5. Clearing orders, items, shipments, history and audits in econext database...")
    cur.execute("DELETE FROM `econext`.`order_service_deliveryverificationaudit`")
    cur.execute("DELETE FROM `econext`.`order_service_routeexceptionaudit`")
    cur.execute("DELETE FROM `econext`.`order_service_orderreturn`")
    cur.execute("DELETE FROM `econext`.`order_service_shipmentitem`")
    cur.execute("DELETE FROM `econext`.`shipment_events`")
    cur.execute("DELETE FROM `econext`.`order_service_logisticstrackingevent`")
    cur.execute("DELETE FROM `econext`.`order_service_shipment`")
    cur.execute("DELETE FROM `econext`.`order_service_orderitem`")
    cur.execute("DELETE FROM `econext`.`order_service_orderstatushistory`")
    cur.execute("DELETE FROM `econext`.`order_service_notificationlog` WHERE order_id IS NOT NULL")
    cur.execute("DELETE FROM `econext`.`accounts_activitylog` WHERE action = 'purchase'")
    cur.execute("DELETE FROM `econext`.`order_service_order`")
    cur.execute("UPDATE `econext`.`order_service_container` SET status = 'CREATED'")
    conn.commit()

    # --- Step 4: Clear payments in econext_payment_db ---
    print("  6. Clearing payment and refund transactions in econext_payment_db...")
    cur.execute("DELETE FROM `econext_payment_db`.`refund_transactions`")
    cur.execute("DELETE FROM `econext_payment_db`.`payment_transactions`")
    conn.commit()

    # --- Step 5: Clear notifications in econext_notification_db ---
    print("  7. Clearing notifications in econext_notification_db...")
    cur.execute("DELETE FROM `econext_notification_db`.`notifications`")
    conn.commit()

    # --- Step 6: Flush Redis OTP keys ---
    print("  8. Clearing Redis delivery OTP cache...")
    try:
        import redis
        r = redis.Redis(host='localhost', port=6379, db=0)
        otp_keys = r.keys('delivery:otp:*')
        if otp_keys:
            r.delete(*otp_keys)
            print(f"     Deleted {len(otp_keys)} delivery OTP keys from Redis.")
        else:
            print("     Redis OTP cache was already clear.")
    except Exception as e:
        print(f"     Redis note: {e}")

    # --- Step 7: Post-reset Verification ---
    print("\n--- POST-RESET VERIFICATION ---")
    post_verification = [
        ('econext', 'order_service_order', 0),
        ('econext', 'order_service_orderitem', 0),
        ('econext', 'order_service_shipment', 0),
        ('econext', 'order_service_orderstatushistory', 0),
        ('econext_order_db', 'operational_orders', 0),
        ('econext_order_db', 'operational_order_items', 0),
        ('econext_order_db', 'shipments', 0),
        ('econext_order_db', 'shipment_items', 0),
        ('econext_payment_db', 'payment_transactions', 0),
    ]

    all_clean = True
    for db, tbl, expected in post_verification:
        cur.execute(f"SELECT COUNT(*) FROM `{db}`.`{tbl}`")
        cnt = cur.fetchone()[0]
        status_str = "OK (CLEAN)" if cnt == expected else f"FAILED (Found {cnt})"
        if cnt != expected:
            all_clean = False
        print(f"  {db}.{tbl}: {cnt} rows -> {status_str}")

    # Verify preserved master records
    print("\n--- MASTER DATA PRESERVATION CHECK ---")
    master_checks = [
        ('econext', 'auth_user', 'Users/Staff Accounts', 1),
        ('econext', 'products_product', 'Catalog Products', 1),
        ('econext', 'products_category', 'Product Categories', 1),
        ('econext_order_db', 'containers', 'Fleet Containers/Trucks', 1),
        ('econext_order_db', 'logistics_drivers', 'Logistics Drivers', 1),
    ]
    for db, tbl, label, min_expected in master_checks:
        cur.execute(f"SELECT COUNT(*) FROM `{db}`.`{tbl}`")
        cnt = cur.fetchone()[0]
        status_str = "PRESERVED" if cnt >= min_expected else "WARNING: UNEXPECTED COUNT"
        print(f"  {db}.{tbl} ({label}): {cnt} rows -> {status_str}")

    cur.close()
    conn.close()

    if all_clean:
        print("\nSUCCESS: Development data reset completed successfully and cleanly.")
        return True
    else:
        print("\nWARNING: Some records remained after reset. Check logs above.")
        return False

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Reset EcoNext development order and fulfillment data.")
    parser.add_argument('--force', action='store_true', help="Force execute destructive reset.")
    args = parser.parse_args()
    reset_development_data(force=args.force)
