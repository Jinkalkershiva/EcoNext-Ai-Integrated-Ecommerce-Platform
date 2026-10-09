from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth.models import User
from accounts.models import UserProfile


class Command(BaseCommand):
    help = 'Idempotently assigns exactly ONE platform Super Admin / Platform Owner account.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--username',
            type=str,
            default='Jinkalker_Shiva',
            help='Username of the authorized project owner account (default: Jinkalker_Shiva)'
        )

    def handle(self, *args, **options):
        target_username = options['username'].strip()
        self.stdout.write(self.style.NOTICE(f"Locating authorized platform owner account '{target_username}'..."))

        try:
            target_user = User.objects.get(username__iexact=target_username)
        except User.DoesNotExist:
            raise CommandError(f"User with username '{target_username}' was not found in the database.")

        # Ensure staff and superuser flags are enabled
        target_user.is_staff = True
        target_user.is_superuser = True
        target_user.save(update_fields=['is_staff', 'is_superuser'])

        profile, _ = UserProfile.objects.get_or_create(user=target_user)
        if not isinstance(profile.preferences, dict):
            profile.preferences = {}

        profile.preferences['role'] = 'ROLE_SUPER_ADMIN'
        profile.preferences['roles'] = ['ROLE_SUPER_ADMIN']
        profile.preferences['status'] = 'ACTIVE'
        profile.save()

        self.stdout.write(self.style.SUCCESS(
            f"Super Admin role successfully assigned to '{target_user.username}' (ID: {target_user.id}, Email: {target_user.email})."
        ))

        # Enforce singleton invariant: ensure NO other account possesses ROLE_SUPER_ADMIN
        demoted_count = 0
        for other_profile in UserProfile.objects.exclude(user=target_user):
            pref = other_profile.preferences or {}
            role = pref.get('role', '')
            roles = pref.get('roles', [])
            if role == 'ROLE_SUPER_ADMIN' or 'ROLE_SUPER_ADMIN' in roles:
                other_profile.preferences['role'] = 'ROLE_ADMIN'
                other_profile.preferences['roles'] = ['ROLE_ADMIN']
                other_profile.save()
                demoted_count += 1
                self.stdout.write(self.style.WARNING(
                    f"Demoted non-owner user '{other_profile.user.username}' (ID: {other_profile.user.id}) from ROLE_SUPER_ADMIN to ROLE_ADMIN."
                ))

        self.stdout.write(self.style.SUCCESS(
            f"Invariant verified: Exactly ONE Super Admin exists in the platform ('{target_user.username}'). {demoted_count} duplicate(s) demoted."
        ))
