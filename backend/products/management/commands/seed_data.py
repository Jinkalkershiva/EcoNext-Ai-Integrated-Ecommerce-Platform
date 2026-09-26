"""
Django Management Command: seed_data
Populates the database with realistic demo data:
- Taxonomies (AgeGroup, GenderCategory, EcoTag, Season, Occasion, SkinOrBodyFit)
- Categories & Subcategories
- 25+ Rich, authentic sustainable products across all segments
- 60-day historical PriceHistory for every product (required for AI Price Prediction)
- Demo Admin and Shopper users with secure hashed credentials
- Demo Orders and OrderItems to populate the Admin Dashboard & Analytics

Usage:
    python manage.py seed_data
"""

import random
from datetime import date, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils import timezone

from products.models import (
    Category, SubCategory, AgeGroup, GenderCategory,
    EcoTag, SkinOrBodyFit, Season, Occasion, Product, PriceHistory,
    ProductView, ProductSearch
)
from accounts.models import UserProfile
from order_service.models import Order, OrderItem
from site_analytics.models import DailyStats


class Command(BaseCommand):
    help = "Seeds the EcoNext database with demo data for development/testing only."

    def add_arguments(self, parser):
        parser.add_argument(
            '--dev',
            action='store_true',
            help='Explicit confirmation to run demo seeding in development mode.',
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing products, price history, and sample orders before seeding.',
        )

    def handle(self, *args, **options):
        if not options.get('dev'):
            self.stderr.write(self.style.ERROR(
                "[SECURITY] Seed data command is strictly restricted to development environments.\n"
                "To seed demo data for local testing, explicitly pass the --dev flag:\n"
                "  python manage.py seed_data --dev\n"
                "In production, use the EcoNext Admin Management System to create catalog and staff records."
            ))
            return

        self.stdout.write(self.style.SUCCESS("[*] Starting EcoNext Development Data Seeding Pipeline..."))

        if options.get('clear'):
            self.stdout.write("Wiping existing product and order demo records...")
            PriceHistory.objects.all().delete()
            OrderItem.objects.all().delete()
            Order.objects.all().delete()
            Product.objects.all().delete()

        # 1. Taxonomies
        self.stdout.write("1. Provisioning taxonomies and attributes...")
        age_groups = {
            'Kids': AgeGroup.objects.get_or_create(name='Kids')[0],
            'Teens': AgeGroup.objects.get_or_create(name='Teens')[0],
            'Adults': AgeGroup.objects.get_or_create(name='Adults')[0],
            'Seniors': AgeGroup.objects.get_or_create(name='Seniors')[0],
        }

        gender_categories = {
            'Men': GenderCategory.objects.get_or_create(name='Men')[0],
            'Women': GenderCategory.objects.get_or_create(name='Women')[0],
            'Unisex': GenderCategory.objects.get_or_create(name='Unisex')[0],
        }

        eco_tags = {
            'organic': EcoTag.objects.get_or_create(name='100% Organic Cotton')[0],
            'recycled_plastic': EcoTag.objects.get_or_create(name='Recycled Ocean Plastic')[0],
            'carbon_neutral': EcoTag.objects.get_or_create(name='Carbon-Neutral Certified')[0],
            'fair_trade': EcoTag.objects.get_or_create(name='Fair Trade Certified')[0],
            'biodegradable': EcoTag.objects.get_or_create(name='Biodegradable & Compostable')[0],
            'vegan': EcoTag.objects.get_or_create(name='PETA-Approved Vegan')[0],
            'zero_waste': EcoTag.objects.get_or_create(name='Zero Waste Packaging')[0],
            'upcycled': EcoTag.objects.get_or_create(name='Upcycled Materials')[0],
        }

        seasons = {
            'all': Season.objects.get_or_create(name='All Season')[0],
            'summer': Season.objects.get_or_create(name='Summer')[0],
            'winter': Season.objects.get_or_create(name='Winter')[0],
            'spring': Season.objects.get_or_create(name='Spring')[0],
            'monsoon': Season.objects.get_or_create(name='Monsoon')[0],
        }

        occasions = {
            'casual': Occasion.objects.get_or_create(name='Casual')[0],
            'formal': Occasion.objects.get_or_create(name='Formal')[0],
            'outdoor': Occasion.objects.get_or_create(name='Outdoor & Adventure')[0],
            'everyday': Occasion.objects.get_or_create(name='Everyday Essentials')[0],
            'activewear': Occasion.objects.get_or_create(name='Activewear')[0],
        }

        fits = {
            'regular': SkinOrBodyFit.objects.get_or_create(name='Regular Fit')[0],
            'slim': SkinOrBodyFit.objects.get_or_create(name='Slim Fit')[0],
            'relaxed': SkinOrBodyFit.objects.get_or_create(name='Relaxed Fit')[0],
            'sensitive': SkinOrBodyFit.objects.get_or_create(name='Hypoallergenic & Sensitive Safe')[0],
        }

        # 2. Categories
        self.stdout.write("2. Provisioning product categories...")
        categories = {
            'clothing': Category.objects.get_or_create(name='Apparel & Clothing', defaults={'description': 'Eco-conscious garments woven from organic cotton, hemp, and linen.'})[0],
            'footwear': Category.objects.get_or_create(name='Sustainable Footwear', defaults={'description': 'Footwear engineered with recycled ocean plastics, natural rubber, and cork.'})[0],
            'home': Category.objects.get_or_create(name='Home & Living', defaults={'description': 'Zero-waste home essentials, organic cotton bedding, and biodegradable utensils.'})[0],
            'personal_care': Category.objects.get_or_create(name='Personal Care & Beauty', defaults={'description': 'Clean, cruelty-free, plant-based toiletries with plastic-free packaging.'})[0],
            'bags': Category.objects.get_or_create(name='Bags & Travel Gear', defaults={'description': 'Durable bags crafted from upcycled canvas and recycled water bottles.'})[0],
            'accessories': Category.objects.get_or_create(name='Eco Accessories', defaults={'description': 'Sustainable sunglasses, bamboo watches, and reusable bottles.'})[0],
        }

        # 3. Product Catalog Definitions
        self.stdout.write("3. Seeding catalog products...")
        catalog_items = [
            # Men's Apparel
            {
                'name': 'Men Organic Hemp Overshirt',
                'description': 'Breathable, durable casual overshirt tailored from 100% sustainably grown industrial hemp. Naturally odor-resistant with coconut shell buttons.',
                'category': categories['clothing'],
                'current_price': Decimal('2499.00'),
                'image_url': 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=800&q=80',
                'stock': 35,
                'sustainability_score': 9.4,
                'popularity_score': 4.8,
                'tags': ['hemp', 'shirt', 'men', 'organic', 'breathable', 'casual', 'sustainable'],
                'age_groups': [age_groups['Adults']],
                'gender': [gender_categories['Men']],
                'eco': [eco_tags['organic'], eco_tags['carbon_neutral']],
                'season': seasons['all'],
                'occasion': occasions['casual'],
                'fit': fits['relaxed'],
            },
            {
                'name': 'Men Recycled Wool Minimalist Peacoat',
                'description': 'Warm winter peacoat constructed from post-consumer recycled wool fibers. Designed for lifetime durability and circular economy recycling.',
                'category': categories['clothing'],
                'current_price': '5499.00',
                'image_url': 'https://images.unsplash.com/photo-1544923246-77307dd654cb?auto=format&fit=crop&w=800&q=80',
                'stock': 12,
                'sustainability_score': 9.1,
                'popularity_score': 4.9,
                'tags': ['wool', 'peacoat', 'jacket', 'winter', 'men', 'recycled', 'warm'],
                'age_groups': [age_groups['Adults'], age_groups['Seniors']],
                'gender': [gender_categories['Men']],
                'eco': [eco_tags['upcycled'], eco_tags['fair_trade']],
                'season': seasons['winter'],
                'occasion': occasions['formal'],
                'fit': fits['regular'],
            },
            {
                'name': 'Men Classic Organic Cotton Crewneck',
                'description': 'Ultra-soft everyday crewneck t-shirt made with GOTS-certified 100% combed organic cotton using non-toxic natural dyes.',
                'category': categories['clothing'],
                'current_price': '899.00',
                'image_url': 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80',
                'stock': 80,
                'sustainability_score': 9.7,
                'popularity_score': 4.9,
                'tags': ['tshirt', 'crewneck', 'cotton', 'men', 'organic', 'everyday', 'white'],
                'age_groups': [age_groups['Adults'], age_groups['Teens']],
                'gender': [gender_categories['Men'], gender_categories['Unisex']],
                'eco': [eco_tags['organic'], eco_tags['zero_waste']],
                'season': seasons['summer'],
                'occasion': occasions['everyday'],
                'fit': fits['regular'],
            },

            # Women's Apparel
            {
                'name': 'Women Pure French Linen Maxi Dress',
                'description': 'Effortless, flowy summer maxi dress crafted from certified organic European flax. Zero chemical pesticides and 100% compostable.',
                'category': categories['clothing'],
                'current_price': '3299.00',
                'image_url': 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=800&q=80',
                'stock': 28,
                'sustainability_score': 9.6,
                'popularity_score': 4.9,
                'tags': ['linen', 'dress', 'maxi', 'women', 'summer', 'organic', 'breathable'],
                'age_groups': [age_groups['Adults']],
                'gender': [gender_categories['Women']],
                'eco': [eco_tags['organic'], eco_tags['biodegradable']],
                'season': seasons['summer'],
                'occasion': occasions['casual'],
                'fit': fits['relaxed'],
            },
            {
                'name': 'Women Recycled Denim Trucker Jacket',
                'description': 'Timeless denim jacket tailored with 40% post-consumer recycled denim and 60% organic cotton, saving over 2,000 liters of water per garment.',
                'category': categories['clothing'],
                'current_price': '2999.00',
                'image_url': 'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=800&q=80',
                'stock': 20,
                'sustainability_score': 9.2,
                'popularity_score': 4.7,
                'tags': ['denim', 'jacket', 'women', 'recycled', 'blue', 'casual', 'outerwear'],
                'age_groups': [age_groups['Adults'], age_groups['Teens']],
                'gender': [gender_categories['Women']],
                'eco': [eco_tags['upcycled'], eco_tags['fair_trade']],
                'season': seasons['all'],
                'occasion': occasions['casual'],
                'fit': fits['regular'],
            },
            {
                'name': 'Women Bamboo Fiber Knit Cardigan',
                'description': 'Silky soft, temperature-regulating ribbed cardigan made from sustainably harvested closed-loop bamboo viscose.',
                'category': categories['clothing'],
                'current_price': '2199.00',
                'image_url': 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=800&q=80',
                'stock': 40,
                'sustainability_score': 9.5,
                'popularity_score': 4.6,
                'tags': ['cardigan', 'bamboo', 'knitwear', 'women', 'soft', 'cozy', 'layer'],
                'age_groups': [age_groups['Adults'], age_groups['Seniors']],
                'gender': [gender_categories['Women']],
                'eco': [eco_tags['vegan'], eco_tags['biodegradable']],
                'season': seasons['spring'],
                'occasion': occasions['casual'],
                'fit': fits['relaxed'],
            },

            # Kids Apparel
            {
                'name': 'Kids Organic Cotton Dungaree Romper',
                'description': 'Play-friendly, durable overalls crafted from chemical-free organic cotton canvas with nickel-free snaps and adjustable shoulder straps.',
                'category': categories['clothing'],
                'current_price': '1299.00',
                'image_url': 'https://images.unsplash.com/photo-1519689680058-324335c77eba?auto=format&fit=crop&w=800&q=80',
                'stock': 45,
                'sustainability_score': 9.8,
                'popularity_score': 4.9,
                'tags': ['kids', 'romper', 'dungaree', 'cotton', 'organic', 'children', 'toddler'],
                'age_groups': [age_groups['Kids']],
                'gender': [gender_categories['Unisex']],
                'eco': [eco_tags['organic'], eco_tags['zero_waste']],
                'season': seasons['all'],
                'occasion': occasions['everyday'],
                'fit': fits['sensitive'],
            },
            {
                'name': 'Kids Recycled Sherpa Zip Fleece',
                'description': 'Plush, ultra-warm kids jacket made from 100% recycled plastic bottles transformed into super-soft sherpa fleece.',
                'category': categories['clothing'],
                'current_price': '1699.00',
                'image_url': 'https://images.unsplash.com/photo-1503919545889-aef636e10ad4?auto=format&fit=crop&w=800&q=80',
                'stock': 30,
                'sustainability_score': 9.3,
                'popularity_score': 4.7,
                'tags': ['kids', 'fleece', 'sherpa', 'winter', 'warm', 'recycled', 'jacket'],
                'age_groups': [age_groups['Kids']],
                'gender': [gender_categories['Unisex']],
                'eco': [eco_tags['recycled_plastic'], eco_tags['vegan']],
                'season': seasons['winter'],
                'occasion': occasions['outdoor'],
                'fit': fits['regular'],
            },

            # Teens Apparel
            {
                'name': 'Teens Organic Cotton Graphic Hoodie',
                'description': 'Comfortable relaxed-fit streetwear hoodie featuring plant-based water ink illustrations on brushed heavyweight organic cotton fleece.',
                'category': categories['clothing'],
                'current_price': '1899.00',
                'image_url': 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=800&q=80',
                'stock': 25,
                'sustainability_score': 9.4,
                'popularity_score': 4.8,
                'tags': ['teens', 'hoodie', 'streetwear', 'cotton', 'organic', 'graphic', 'cozy'],
                'age_groups': [age_groups['Teens']],
                'gender': [gender_categories['Unisex']],
                'eco': [eco_tags['organic'], eco_tags['fair_trade']],
                'season': seasons['all'],
                'occasion': occasions['casual'],
                'fit': fits['relaxed'],
            },
            {
                'name': 'Teens Eco Hemp Cargo Skate Pants',
                'description': 'Rugged and flexible skateboard-inspired cargo trousers woven from hemp and organic twill with reinforced knee stitching.',
                'category': categories['clothing'],
                'current_price': '1999.00',
                'image_url': 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=800&q=80',
                'stock': 20,
                'sustainability_score': 9.1,
                'popularity_score': 4.6,
                'tags': ['teens', 'cargo', 'pants', 'hemp', 'skate', 'green', 'trousers'],
                'age_groups': [age_groups['Teens'], age_groups['Adults']],
                'gender': [gender_categories['Unisex']],
                'eco': [eco_tags['organic'], eco_tags['vegan']],
                'season': seasons['all'],
                'occasion': occasions['casual'],
                'fit': fits['relaxed'],
            },

            # Footwear
            {
                'name': 'Ocean Knit Recycled Runners',
                'description': 'Lightweight athletic running shoes featuring a 3D-knit upper spun from intercepted marine plastic waste and natural sugarcane foam soles.',
                'category': categories['footwear'],
                'current_price': '3899.00',
                'image_url': 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80',
                'stock': 18,
                'sustainability_score': 9.6,
                'popularity_score': 4.9,
                'tags': ['sneakers', 'footwear', 'running', 'recycled', 'plastic', 'sport', 'shoes'],
                'age_groups': [age_groups['Adults'], age_groups['Teens']],
                'gender': [gender_categories['Unisex']],
                'eco': [eco_tags['recycled_plastic'], eco_tags['carbon_neutral']],
                'season': seasons['all'],
                'occasion': occasions['activewear'],
                'fit': fits['regular'],
            },
            {
                'name': 'Natural Cork Sole Slip-On Loafers',
                'description': 'Handmade minimalist loafers featuring breathable organic hemp uppers, harvested Portuguese cork footbeds, and natural gum soles.',
                'category': categories['footwear'],
                'current_price': '3499.00',
                'image_url': 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=800&q=80',
                'stock': 15,
                'sustainability_score': 9.7,
                'popularity_score': 4.7,
                'tags': ['loafers', 'cork', 'shoes', 'footwear', 'organic', 'handmade', 'casual'],
                'age_groups': [age_groups['Adults'], age_groups['Seniors']],
                'gender': [gender_categories['Unisex']],
                'eco': [eco_tags['biodegradable'], eco_tags['vegan']],
                'season': seasons['summer'],
                'occasion': occasions['casual'],
                'fit': fits['regular'],
            },

            # Home & Living
            {
                'name': 'Handwoven Organic Waffle Blanket',
                'description': 'Artisan-woven queen size throw blanket made with 100% GOTS-certified ring-spun organic cotton. Breathable, hypoallergenic, and machine washable.',
                'category': categories['home'],
                'current_price': '2299.00',
                'image_url': 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=800&q=80',
                'stock': 25,
                'sustainability_score': 9.8,
                'popularity_score': 4.8,
                'tags': ['blanket', 'waffle', 'home', 'cotton', 'organic', 'bedding', 'cozy'],
                'age_groups': [age_groups['Adults'], age_groups['Seniors']],
                'gender': [gender_categories['Unisex']],
                'eco': [eco_tags['organic'], eco_tags['fair_trade']],
                'season': seasons['all'],
                'occasion': occasions['everyday'],
                'fit': fits['regular'],
            },
            {
                'name': 'Zero-Waste Bamboo Cutlery Travel Kit',
                'description': 'Portable travel set including fork, knife, spoon, chopsticks, and straw handcrafted from sustainably harvested fast-growing bamboo.',
                'category': categories['home'],
                'current_price': '499.00',
                'image_url': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=800&q=80',
                'stock': 100,
                'sustainability_score': 9.9,
                'popularity_score': 4.9,
                'tags': ['bamboo', 'cutlery', 'travel', 'zerowaste', 'kitchen', 'plasticfree', 'utensils'],
                'age_groups': [age_groups['Adults'], age_groups['Teens'], age_groups['Seniors']],
                'gender': [gender_categories['Unisex']],
                'eco': [eco_tags['biodegradable'], eco_tags['zero_waste']],
                'season': seasons['all'],
                'occasion': occasions['outdoor'],
                'fit': fits['regular'],
            },
            {
                'name': 'Reclaimed Coconut Shell Artisan Bowls (Set of 2)',
                'description': 'Smooth polished handmade bowls upcycled from discarded coconut shells. Finished with organic virgin coconut oil for a water-resistant sheen.',
                'category': categories['home'],
                'current_price': '799.00',
                'image_url': 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=800&q=80',
                'stock': 4,
                'sustainability_score': 9.8,
                'popularity_score': 4.6,
                'tags': ['coconut', 'bowl', 'kitchen', 'upcycled', 'handmade', 'tableware', 'artisan'],
                'age_groups': [age_groups['Adults']],
                'gender': [gender_categories['Unisex']],
                'eco': [eco_tags['upcycled'], eco_tags['biodegradable']],
                'season': seasons['all'],
                'occasion': occasions['everyday'],
                'fit': fits['regular'],
            },

            # Personal Care
            {
                'name': 'Organic Argan & Rosemary Solid Shampoo Bar',
                'description': 'Concentrated zero-plastic shampoo bar equivalent to 3 liquid plastic bottles. Enriched with cold-pressed Moroccan argan oil and rosemary extract.',
                'category': categories['personal_care'],
                'current_price': '449.00',
                'image_url': 'https://images.unsplash.com/photo-1608248597359-009772a5a58d?auto=format&fit=crop&w=800&q=80',
                'stock': 65,
                'sustainability_score': 9.9,
                'popularity_score': 4.8,
                'tags': ['shampoo', 'soap', 'argan', 'haircare', 'plasticfree', 'vegan', 'zerowaste'],
                'age_groups': [age_groups['Adults'], age_groups['Teens']],
                'gender': [gender_categories['Unisex']],
                'eco': [eco_tags['zero_waste'], eco_tags['vegan'], eco_tags['biodegradable']],
                'season': seasons['all'],
                'occasion': occasions['everyday'],
                'fit': fits['sensitive'],
            },
            {
                'name': 'Biodegradable Bamboo Toothbrush Family Pack',
                'description': 'Pack of 4 numbered charcoal-infused soft bristle toothbrushes with 100% compostable MOSO bamboo handles and plant-based packaging.',
                'category': categories['personal_care'],
                'current_price': '349.00',
                'image_url': 'https://images.unsplash.com/photo-1593487568720-92097fb460fb?auto=format&fit=crop&w=800&q=80',
                'stock': 120,
                'sustainability_score': 9.9,
                'popularity_score': 4.9,
                'tags': ['toothbrush', 'bamboo', 'hygiene', 'oralcare', 'plasticfree', 'family', 'eco'],
                'age_groups': [age_groups['Adults'], age_groups['Kids'], age_groups['Teens'], age_groups['Seniors']],
                'gender': [gender_categories['Unisex']],
                'eco': [eco_tags['biodegradable'], eco_tags['zero_waste']],
                'season': seasons['all'],
                'occasion': occasions['everyday'],
                'fit': fits['regular'],
            },

            # Bags & Travel
            {
                'name': 'Upcycled Heavy Canvas Weekender Duffel',
                'description': 'Water-resistant travel duffel constructed from reclaimed military cotton canvas with reinforced recycled webbing and brass hardware.',
                'category': categories['bags'],
                'current_price': '3499.00',
                'image_url': 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80',
                'stock': 14,
                'sustainability_score': 9.5,
                'popularity_score': 4.8,
                'tags': ['duffel', 'bag', 'travel', 'canvas', 'upcycled', 'luggage', 'weekender'],
                'age_groups': [age_groups['Adults'], age_groups['Teens']],
                'gender': [gender_categories['Unisex']],
                'eco': [eco_tags['upcycled'], eco_tags['fair_trade']],
                'season': seasons['all'],
                'occasion': occasions['outdoor'],
                'fit': fits['regular'],
            },
            {
                'name': 'Recycled PET Urban Commuter Laptop Backpack',
                'description': 'Sleek, ergonomic 20L daypack made from 24 recycled plastic bottles. Features a padded 16-inch laptop compartment and hidden anti-theft pocket.',
                'category': categories['bags'],
                'current_price': '2799.00',
                'image_url': 'https://images.unsplash.com/photo-1546938576-6e6a64f317cc?auto=format&fit=crop&w=800&q=80',
                'stock': 22,
                'sustainability_score': 9.3,
                'popularity_score': 4.9,
                'tags': ['backpack', 'laptop', 'bag', 'recycled', 'plastic', 'work', 'commute'],
                'age_groups': [age_groups['Adults'], age_groups['Teens']],
                'gender': [gender_categories['Unisex']],
                'eco': [eco_tags['recycled_plastic'], eco_tags['carbon_neutral']],
                'season': seasons['all'],
                'occasion': occasions['everyday'],
                'fit': fits['regular'],
            },

            # Eco Accessories
            {
                'name': 'Handmade Bamboo Polarized Sunglasses',
                'description': 'Floating sunglasses hand-carved from sustainable bamboo temples with UV400 polarized scratch-resistant TAC lenses.',
                'category': categories['accessories'],
                'current_price': '1499.00',
                'image_url': 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=800&q=80',
                'stock': 40,
                'sustainability_score': 9.4,
                'popularity_score': 4.7,
                'tags': ['sunglasses', 'bamboo', 'eyewear', 'polarized', 'summer', 'accessories', 'handmade'],
                'age_groups': [age_groups['Adults'], age_groups['Teens']],
                'gender': [gender_categories['Unisex']],
                'eco': [eco_tags['biodegradable'], eco_tags['zero_waste']],
                'season': seasons['summer'],
                'occasion': occasions['outdoor'],
                'fit': fits['regular'],
            },
            {
                'name': 'Insulated Stainless Steel Water Bottle (750ml)',
                'description': 'Double-walled vacuum insulated bottle keeping drinks cold for 24h or hot for 12h. Food-grade 18/8 stainless steel with natural bamboo cap.',
                'category': categories['accessories'],
                'current_price': '899.00',
                'image_url': 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=800&q=80',
                'stock': 50,
                'sustainability_score': 9.8,
                'popularity_score': 5.0,
                'tags': ['bottle', 'stainless', 'water', 'bamboo', 'reusable', 'zerowaste', 'drinkware'],
                'age_groups': [age_groups['Adults'], age_groups['Kids'], age_groups['Teens'], age_groups['Seniors']],
                'gender': [gender_categories['Unisex']],
                'eco': [eco_tags['zero_waste'], eco_tags['carbon_neutral']],
                'season': seasons['all'],
                'occasion': occasions['everyday'],
                'fit': fits['regular'],
            }
        ]

        created_products = []
        for item in catalog_items:
            product, created = Product.objects.update_or_create(
                name=item['name'],
                defaults={
                    'description': item['description'],
                    'category': item['category'],
                    'current_price': Decimal(str(item['current_price'])),
                    'image_url': item['image_url'],
                    'stock': item['stock'],
                    'sustainability_score': item['sustainability_score'],
                    'popularity_score': item['popularity_score'],
                    'tags': item['tags'],
                    'season': item.get('season'),
                    'occasion': item.get('occasion'),
                    'skin_or_body_fit': item.get('fit'),
                }
            )
            if 'age_groups' in item:
                product.age_groups.set(item['age_groups'])
            if 'gender' in item:
                product.gender_categories.set(item['gender'])
            if 'eco' in item:
                product.eco_tags.set(item['eco'])

            created_products.append(product)

        self.stdout.write(self.style.SUCCESS(f"Successfully seeded {len(created_products)} catalog products."))

        # 4. Generate 60-day historical PriceHistory for all products
        self.stdout.write("4. Generating 60-day PriceHistory for AI 'Buy or Wait' Predictor...")
        today = date.today()
        price_history_records = []

        for p in created_products:
            PriceHistory.objects.filter(product=p).delete()
            base_price = float(p.current_price)
            trend_direction = random.choice([-0.0015, -0.0005, 0.0, 0.0008, 0.0018])
            sim_price = base_price * random.uniform(0.88, 1.08)

            for d in range(60, 0, -1):
                hist_date = today - timedelta(days=d)
                fluctuation = random.gauss(trend_direction, 0.012)
                sim_price *= (1 + fluctuation)
                sim_price = max(sim_price, base_price * 0.55)
                price_history_records.append(
                    PriceHistory(
                        product=p,
                        price=Decimal(str(round(sim_price, 2))),
                        date=hist_date
                    )
                )

            # Today's price = current price
            price_history_records.append(
                PriceHistory(product=p, price=p.current_price, date=today)
            )

        PriceHistory.objects.bulk_create(price_history_records, ignore_conflicts=True)
        self.stdout.write(self.style.SUCCESS(f"Created {len(price_history_records)} historical price data points."))

        # 5. Create Demo Accounts
        self.stdout.write("5. Provisioning staff, admin, and demo users...")
        users_to_create = [
            {
                'username': 'admin',
                'email': 'admin@econext.org',
                'first_name': 'EcoNext',
                'last_name': 'Admin',
                'password': 'adminpassword123',
                'is_staff': True,
                'is_superuser': True,
            },
            {
                'username': 'manager',
                'email': 'manager@econext.org',
                'first_name': 'Store',
                'last_name': 'Manager',
                'password': 'managerpassword123',
                'is_staff': True,
                'is_superuser': False,
            },
            {
                'username': 'demouser',
                'email': 'demouser@econext.org',
                'first_name': 'Aarav',
                'last_name': 'Patel',
                'password': 'demopassword123',
                'is_staff': False,
                'is_superuser': False,
            }
        ]

        created_users = []
        for u_data in users_to_create:
            user = User.objects.filter(username=u_data['username']).first()
            if not user:
                user = User.objects.create_user(
                    username=u_data['username'],
                    email=u_data['email'],
                    password=u_data['password'],
                    first_name=u_data['first_name'],
                    last_name=u_data['last_name']
                )
            user.is_staff = u_data['is_staff']
            user.is_superuser = u_data['is_superuser']
            user.save()
            UserProfile.objects.get_or_create(
                user=user,
                defaults={
                    'phone': '+91 98765 43210',
                    'address': 'Flat 402, Green Meadows, Eco Residency',
                    'city': 'Mumbai',
                    'state': 'Maharashtra',
                    'zipcode': '400001',
                    'country': 'India'
                }
            )
            created_users.append(user)

        # Ensure existing user Shiva has staff access
        shiva = User.objects.filter(username='Jinkalker_Shiva').first()
        if shiva:
            shiva.is_staff = True
            shiva.is_superuser = True
            shiva.save()
            created_users.append(shiva)

        # 6. Sample Demo Orders for Analytics & Dashboard
        self.stdout.write("6. Creating realistic demo orders for Admin Dashboard...")
        demo_customer = User.objects.filter(username='demouser').first() or created_users[0]
        
        orders_data = [
            {
                'status': 'delivered',
                'days_ago': 6,
                'items': [(created_products[0], 1), (created_products[14], 2)],
                'city': 'Mumbai',
            },
            {
                'status': 'delivered',
                'days_ago': 4,
                'items': [(created_products[3], 1), (created_products[10], 1)],
                'city': 'Bengaluru',
            },
            {
                'status': 'shipped',
                'days_ago': 2,
                'items': [(created_products[17], 1), (created_products[18], 1)],
                'city': 'Delhi',
            },
            {
                'status': 'confirmed',
                'days_ago': 1,
                'items': [(created_products[2], 2), (created_products[15], 1)],
                'city': 'Hyderabad',
            },
            {
                'status': 'pending',
                'days_ago': 0,
                'items': [(created_products[6], 1), (created_products[7], 1)],
                'city': 'Pune',
            },
        ]

        for o_info in orders_data:
            order_total = sum(p.current_price * qty for p, qty in o_info['items'])
            order_date = timezone.now() - timedelta(days=o_info['days_ago'])
            
            order = Order.objects.create(
                user=demo_customer,
                status=o_info['status'],
                total_price=order_total,
                shipping_address="42 Green Avenue, Sustainable Colony",
                city=o_info['city'],
                state="Maharashtra",
                zipcode="400050",
                country="India",
            )
            # Update created_at timestamp
            Order.objects.filter(pk=order.pk).update(created_at=order_date)

            for prod, qty in o_info['items']:
                OrderItem.objects.create(
                    order=order,
                    product=prod,
                    quantity=qty,
                    price_at_purchase=prod.current_price
                )

        # 7. Daily Stats for Analytics
        DailyStats.objects.update_or_create(
            date=today,
            defaults={
                'active_users_count': 42,
                'total_views': 310,
                'total_searches': 185,
                'total_sales': Decimal('14995.00'),
                'trending_products': [{'product_id': p.id, 'count': random.randint(10, 50)} for p in created_products[:5]]
            }
        )

        self.stdout.write(self.style.SUCCESS("\n========================================================"))
        self.stdout.write(self.style.SUCCESS("[OK] EcoNext Demo Data Seeding Completed Successfully!"))
        self.stdout.write(self.style.SUCCESS("========================================================"))
        self.stdout.write(f"- Catalog Products: {Product.objects.count()}")
        self.stdout.write(f"- Price Histories: {PriceHistory.objects.count()} (60-day trend per product)")
        self.stdout.write(f"- Categories: {Category.objects.count()}")
        self.stdout.write(f"- Platform Users: {User.objects.count()}")
        self.stdout.write(f"- Demo Orders: {Order.objects.count()}")
        self.stdout.write("\nAdmin Login Credentials:")
        self.stdout.write("  Username: admin")
        self.stdout.write("  Password: adminpassword123")
        self.stdout.write("  Email:    admin@econext.org")
        self.stdout.write("\nCustomer Login Credentials:")
        self.stdout.write("  Username: demouser")
        self.stdout.write("  Password: demopassword123")
        self.stdout.write("========================================================\n")
