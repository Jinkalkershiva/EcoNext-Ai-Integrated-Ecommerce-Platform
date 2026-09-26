from django.core.management.base import BaseCommand
from products.models import Product
from ml_engine.auto_tagger import ProductAutoTagger

class Command(BaseCommand):
    help = 'Auto-tag products that have not been tagged yet.'

    def handle(self, *args, **options):
        self.stdout.write('Starting product auto-tagging...')
        tagger = ProductAutoTagger()
        tagger.load_models()

        products_to_tag = Product.objects.filter(auto_tagged=False)
        for product in products_to_tag:
            tagger.predict(product)
            product.auto_tagged = True
            product.save()
            self.stdout.write(f'Tagged product: {product.name}')

        self.stdout.write(self.style.SUCCESS('Successfully auto-tagged products.'))
