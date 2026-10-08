"""
Django management command to reset development and demo orders/fulfillment data safely.
Usage:
    python manage.py reset_demo_data [--force]
"""

import sys
import subprocess
import os
from django.core.management.base import BaseCommand
from django.conf import settings

class Command(BaseCommand):
    help = 'Safely resets development/demo order and fulfillment data across databases'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Execute the destructive reset without prompt',
        )

    def handle(self, *args, **options):
        force = options['force']
        base_dir = settings.BASE_DIR.parent
        script_path = os.path.join(base_dir, 'scripts', 'reset_dev_data.py')

        if not os.path.exists(script_path):
            self.stderr.write(self.style.ERROR(f"Reset script not found at {script_path}"))
            return

        cmd = [sys.executable, script_path]
        if force:
            cmd.append('--force')

        self.stdout.write(self.style.NOTICE("Invoking EcoNext Controlled Reset Mechanism..."))
        result = subprocess.run(cmd)
        if result.returncode == 0:
            self.stdout.write(self.style.SUCCESS("Demo data reset process completed successfully."))
        else:
            self.stderr.write(self.style.ERROR(f"Reset process exited with code {result.returncode}."))
