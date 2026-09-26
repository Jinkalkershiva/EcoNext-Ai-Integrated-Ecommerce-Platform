from rest_framework import serializers
from .models import KidsProduct, KidsCategory

class KidsCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = KidsCategory
        fields = ['id', 'name']

class KidsProductSerializer(serializers.ModelSerializer):
    category = KidsCategorySerializer()
    age_group = serializers.StringRelatedField()
    gender = serializers.StringRelatedField()

    class Meta:
        model = KidsProduct
        fields = [
            'id', 'name', 'description', 'age_group', 'gender', 
            'category', 'price', 'image_url', 'stock'
        ]
