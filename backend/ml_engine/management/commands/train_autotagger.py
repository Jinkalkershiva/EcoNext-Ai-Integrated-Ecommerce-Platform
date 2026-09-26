from django.core.management.base import BaseCommand
from ml_engine.auto_tagger import ProductAutoTagger

class Command(BaseCommand):
    help = 'Train the product auto-tagger models.'

    def handle(self, *args, **options):
        self.stdout.write('Training product auto-tagger...')
        tagger = ProductAutoTagger()
        tagger.train()
        self.stdout.write(self.style.SUCCESS('Successfully trained product auto-tagger.'))
