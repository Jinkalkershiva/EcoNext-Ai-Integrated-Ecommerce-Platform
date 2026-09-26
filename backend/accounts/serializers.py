from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from .models import UserProfile

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name')
        read_only_fields = ('id',)

class UserProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = UserProfile
        fields = ('user', 'phone', 'address', 'city', 'state', 'zipcode', 'country', 'created_at')

class SignUpSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, style={'input_type': 'password'})
    password_confirm = serializers.CharField(write_only=True, style={'input_type': 'password'})
    email = serializers.EmailField(required=True)

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'password_confirm', 'first_name', 'last_name')

    def validate(self, data):
        if data['password'] != data.pop('password_confirm'):
            raise serializers.ValidationError({'password': 'Passwords do not match'})

        if User.objects.filter(username__iexact=data['username']).exists():
            raise serializers.ValidationError({'username': 'Username already exists'})

        if User.objects.filter(email__iexact=data['email']).exists():
            raise serializers.ValidationError({'email': 'Email already exists'})

        # AUTH_PASSWORD_VALIDATORS was configured in settings but never actually
        # run, because create_user() bypasses it. Enforce it here so minimum
        # length, common-password and numeric-only rules apply at signup.
        try:
            validate_password(data['password'])
        except DjangoValidationError as exc:
            raise serializers.ValidationError({'password': list(exc.messages)})

        return data

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', '')
        )
        UserProfile.objects.create(user=user)
        return user

class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True, style={'input_type': 'password'})
