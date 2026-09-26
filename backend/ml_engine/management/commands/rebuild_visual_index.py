from django.core.management.base import BaseCommand
from ml_engine.visual_search import visual_search_engine

class Command(BaseCommand):
    help = 'Rebuilds the CLIP and histogram embeddings index for visual search'

    def handle(self, *args, **options):
        self.stdout.write("Refreshing feature vectors... This may take a few minutes as it downloads product images.")
        visual_search_engine.refresh_feature_vectors()
        self.stdout.write(self.style.SUCCESS('Successfully rebuilt visual search index!'))
