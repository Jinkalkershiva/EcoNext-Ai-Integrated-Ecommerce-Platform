from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.contrib.auth.hashers import make_password
from accounts.models import UserProfile


DEMO_STAFF_ACCOUNTS = [
    {
        'role': 'ROLE_ADMIN',
        'username': 'admin',
        'email': 'admin@econext.org',
        'first_name': 'Admin',
        'last_name': 'Operator',
        'password': 'AdminStaff@2026',
        'is_superuser': False,
        'department': 'Administration'
    },
    {
        'role': 'ROLE_WAREHOUSE',
        'username': 'warehouse_demo',
        'email': 'warehouse@econext.org',
        'first_name': 'Vikram',
        'last_name': 'Warehouse',
        'password': 'StaffDemo@2026',
        'is_superuser': False,
        'department': 'Inventory/Warehouse'
    },
    {
        'role': 'ROLE_ORDER_MANAGER',
        'username': 'order_demo',
        'email': 'order@econext.org',
        'first_name': 'Omkar',
        'last_name': 'Orders',
        'password': 'StaffDemo@2026',
        'is_superuser': False,
        'department': 'Order Management'
    },
    {
        'role': 'ROLE_FULFILLMENT',
        'username': 'fulfillment_demo',
        'email': 'fulfillment@econext.org',
        'first_name': 'Farhan',
        'last_name': 'Fulfillment',
        'password': 'StaffDemo@2026',
        'is_superuser': False,
        'department': 'Fulfillment/Logistics'
    },
    {
        'role': 'ROLE_FINANCE',
        'username': 'finance_demo',
        'email': 'finance@econext.org',
        'first_name': 'Pooja',
        'last_name': 'Finance',
        'password': 'StaffDemo@2026',
        'is_superuser': False,
        'department': 'Finance/Payments'
    },
    {
        'role': 'ROLE_SUPPORT',
        'username': 'support_demo',
        'email': 'support@econext.org',
        'first_name': 'Sunita',
        'last_name': 'Support',
        'password': 'StaffDemo@2026',
        'is_superuser': False,
        'department': 'Customer Support'
    },
    {
        'role': 'ROLE_DRIVER',
        'username': 'driver_demo',
        'email': 'driver@econext.org',
        'first_name': 'Dev',
        'last_name': 'Driver',
        'password': 'StaffDemo@2026',
        'is_superuser': False,
        'department': 'Driver/Fleet'
    },
    {
        'role': 'ROLE_NOTIFICATIONS',
        'username': 'notifications_demo',
        'email': 'notifications@econext.org',
        'first_name': 'Neha',
        'last_name': 'Notifications',
        'password': 'StaffDemo@2026',
        'is_superuser': False,
        'department': 'Notifications/Communications'
    }
]


class Command(BaseCommand):
    help = 'Idempotently seeds or reuses exactly ONE demo staff account per operational role.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Verifying platform owner Super Admin status..."))
        try:
            owner = User.objects.get(username__iexact='Jinkalker_Shiva')
            owner_profile, _ = UserProfile.objects.get_or_create(user=owner)
            if not isinstance(owner_profile.preferences, dict):
                owner_profile.preferences = {}
            owner_profile.preferences['role'] = 'ROLE_SUPER_ADMIN'
            owner_profile.preferences['roles'] = ['ROLE_SUPER_ADMIN']
            owner_profile.preferences['status'] = 'ACTIVE'
            owner_profile.preferences['department'] = 'Platform Governance'
            owner_profile.save()
            owner.is_staff = True
            owner.is_superuser = True
            owner.save(update_fields=['is_staff', 'is_superuser'])
            self.stdout.write(self.style.SUCCESS(
                f"[SUPER_ADMIN] Owner verified: {owner.username} ({owner.email}) -> ROLE_SUPER_ADMIN [Platform Governance]"
            ))
        except User.DoesNotExist:
            self.stdout.write(self.style.WARNING("Platform owner 'Jinkalker_Shiva' not found. Run assign_super_admin first."))

        self.stdout.write(self.style.NOTICE("\nSeeding exactly ONE demo account per operational role..."))

        results = []
        for account in DEMO_STAFF_ACCOUNTS:
            role = account['role']
            username = account['username']
            email = account['email']
            first_name = account['first_name']
            last_name = account['last_name']
            password = account['password']
            dept = account['department']

            # Find by username or email to prevent duplicates
            user = User.objects.filter(username__iexact=username).first()
            if not user:
                user = User.objects.filter(email__iexact=email).first()

            created = False
            if not user:
                user = User.objects.create(
                    username=username,
                    email=email,
                    first_name=first_name,
                    last_name=last_name,
                    is_staff=True,
                    is_superuser=account['is_superuser'],
                    password=make_password(password)
                )
                created = True
            else:
                user.is_staff = True
                user.first_name = first_name
                user.last_name = last_name
                user.email = email
                # For admin account, preserve existing credentials if set, else ensure password is known
                if user.username != 'admin':
                    user.password = make_password(password)
                user.save()

            profile, _ = UserProfile.objects.get_or_create(user=user)
            if not isinstance(profile.preferences, dict):
                profile.preferences = {}
            profile.preferences['role'] = role
            profile.preferences['roles'] = [role]
            profile.preferences['status'] = 'ACTIVE'
            profile.preferences['department'] = dept
            profile.save()

            status_str = "CREATED" if created else "REUSED & CONFIGURED"
            results.append({
                'role': role,
                'username': user.username,
                'email': user.email,
                'name': f"{user.first_name} {user.last_name}",
                'department': dept,
                'status': status_str
            })

            self.stdout.write(self.style.SUCCESS(
                f"[{role}] {status_str}: @{user.username} ({user.email}) - {user.first_name} {user.last_name}"
            ))

        # Also synchronize Spring Boot microservice database (econext_auth_db)
        try:
            from accounts.sync_auth_db import sync_auth_db
            sync_auth_db()
            self.stdout.write(self.style.SUCCESS("Synchronized microservice database (econext_auth_db) successfully."))
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"Note: Could not sync econext_auth_db: {e}"))

        self.stdout.write(self.style.SUCCESS("\nDemo staff seeding completed successfully."))
        self.stdout.write("================================================================================")
        self.stdout.write("ROLE                  USERNAME            EMAIL                  NAME")
        self.stdout.write("--------------------------------------------------------------------------------")
        self.stdout.write(f"ROLE_SUPER_ADMIN      Jinkalker_Shiva     jinkalkers@gmail.com   Shiva Jinkalker")
        for r in results:
            self.stdout.write(f"{r['role']:<22}{r['username']:<20}{r['email']:<23}{r['name']}")
        self.stdout.write("================================================================================")
