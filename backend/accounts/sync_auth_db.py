import os
import MySQLdb
import datetime
import bcrypt

def sync_auth_db():
    conn = MySQLdb.connect(
        host=os.environ.get('DB_HOST', '127.0.0.1'),
        port=int(os.environ.get('DB_PORT', 3306)),
        user=os.environ.get('DB_USER', 'root'),
        passwd=os.environ.get('DB_PASSWORD', 'shivaJ@123'),
        db=os.environ.get('AUTH_DB_NAME', 'econext_auth_db')
    )
    cur = conn.cursor()

    # Get existing usernames
    cur.execute('SELECT username, email FROM admin_staff_members')
    existing_staff = {row[0].lower(): row[1] for row in cur.fetchall()}
    print('Existing staff usernames in econext_auth_db:', list(existing_staff.keys()))

    demo_pw_hash = bcrypt.hashpw(b'StaffDemo@2026', bcrypt.gensalt(10)).decode('utf-8').replace('$2b$', '$2a$')
    owner_pw_hash = bcrypt.hashpw(b'AdminStaff@2026', bcrypt.gensalt(10)).decode('utf-8').replace('$2b$', '$2a$')

    staff_to_seed = [
        {
            'username': 'Jinkalker_Shiva',
            'name': 'Shiva Jinkalker',
            'email': 'jinkalkers@gmail.com',
            'phone': '+91 99999 11111',
            'role_name': 'ROLE_SUPER_ADMIN',
            'password_hash': owner_pw_hash,
            'status': 'ACTIVE',
            'created_by': 'SYSTEM_BOOTSTRAP'
        },
        {
            'username': 'warehouse_demo',
            'name': 'Vikram Warehouse',
            'email': 'warehouse@econext.org',
            'phone': '+91 99999 22222',
            'role_name': 'INVENTORY_MANAGER',
            'password_hash': demo_pw_hash,
            'status': 'ACTIVE',
            'created_by': 'admin'
        },
        {
            'username': 'order_demo',
            'name': 'Omkar Orders',
            'email': 'order@econext.org',
            'phone': '+91 99999 33333',
            'role_name': 'ORDER_MANAGER',
            'password_hash': demo_pw_hash,
            'status': 'ACTIVE',
            'created_by': 'admin'
        },
        {
            'username': 'fulfillment_demo',
            'name': 'Farhan Fulfillment',
            'email': 'fulfillment@econext.org',
            'phone': '+91 99999 44444',
            'role_name': 'ORDER_PROCESSING_STAFF',
            'password_hash': demo_pw_hash,
            'status': 'ACTIVE',
            'created_by': 'admin'
        },
        {
            'username': 'finance_demo',
            'name': 'Pooja Finance',
            'email': 'finance@econext.org',
            'phone': '+91 99999 55555',
            'role_name': 'DATA_ANALYST',
            'password_hash': demo_pw_hash,
            'status': 'ACTIVE',
            'created_by': 'admin'
        },
        {
            'username': 'support_demo',
            'name': 'Sunita Support',
            'email': 'support@econext.org',
            'phone': '+91 99999 66666',
            'role_name': 'ROLE_SUPPORT',
            'password_hash': demo_pw_hash,
            'status': 'ACTIVE',
            'created_by': 'admin'
        },
        {
            'username': 'driver_demo',
            'name': 'Dev Driver',
            'email': 'driver@econext.org',
            'phone': '+91 99999 77777',
            'role_name': 'DELIVERY_STAFF',
            'password_hash': demo_pw_hash,
            'status': 'ACTIVE',
            'created_by': 'admin'
        },
        {
            'username': 'notifications_demo',
            'name': 'Neha Notifications',
            'email': 'notifications@econext.org',
            'phone': '+91 99999 88888',
            'role_name': 'ROLE_NOTIFICATIONS',
            'password_hash': demo_pw_hash,
            'status': 'ACTIVE',
            'created_by': 'admin'
        }
    ]

    now = datetime.datetime.now()
    for s in staff_to_seed:
        u_lower = s['username'].lower()
        if u_lower not in existing_staff:
            cur.execute(
                """INSERT INTO admin_staff_members
                   (username, name, email, phone, role_name, password_hash, status, must_change_password, created_by, created_at, updated_at)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                (s['username'], s['name'], s['email'], s['phone'], s['role_name'], s['password_hash'], s['status'], 0, s['created_by'], now, now)
            )
            print(f"Inserted staff: {s['username']} ({s['role_name']})")
        else:
            print(f"Staff {s['username']} already exists")

    conn.commit()

    cur.execute('SELECT id, username, name, email, role_name, status FROM admin_staff_members')
    print('\nAll staff members now in econext_auth_db:')
    for row in cur.fetchall():
        print(row)

    conn.close()

if __name__ == '__main__':
    sync_auth_db()
