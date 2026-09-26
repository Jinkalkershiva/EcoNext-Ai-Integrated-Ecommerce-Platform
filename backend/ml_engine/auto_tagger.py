from products.models import Product, AgeGroup, GenderCategory
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
import joblib
import os

class ProductAutoTagger:
    def __init__(self):
        self.age_group_classifier = None
        self.gender_category_classifier = None
        self.vectorizer = TfidfVectorizer()
        self.age_model_path = 'ml_engine/age_group_classifier.joblib'
        self.gender_model_path = 'ml_engine/gender_category_classifier.joblib'
        self.vectorizer_path = 'ml_engine/tagger_vectorizer.joblib'

    def train(self):
        products = Product.objects.exclude(age_groups=None).exclude(gender_categories=None)
        if not products.exists():
            return

        texts = [f"{p.name} {p.description}" for p in products]
        
        # Train Age Group Classifier
        age_labels = [p.age_groups.first().name for p in products]
        X = self.vectorizer.fit_transform(texts)
        self.age_group_classifier = MultinomialNB()
        self.age_group_classifier.fit(X, age_labels)
        joblib.dump(self.age_group_classifier, self.age_model_path)
        joblib.dump(self.vectorizer, self.vectorizer_path)

        # Train Gender Category Classifier
        gender_labels = [p.gender_categories.first().name for p in products]
        self.gender_category_classifier = MultinomialNB()
        self.gender_category_classifier.fit(X, gender_labels)
        joblib.dump(self.gender_category_classifier, self.gender_model_path)

    def load_models(self):
        if os.path.exists(self.age_model_path):
            self.age_group_classifier = joblib.load(self.age_model_path)
            self.vectorizer = joblib.load(self.vectorizer_path)
        if os.path.exists(self.gender_model_path):
            self.gender_category_classifier = joblib.load(self.gender_model_path)

    def predict(self, product):
        if self.age_group_classifier is None or self.gender_category_classifier is None:
            self.load_models()
            if self.age_group_classifier is None or self.gender_category_classifier is None:
                # Models not trained yet
                return

        text = f"{product.name} {product.description}"
        X = self.vectorizer.transform([text])
        
        age_group_name = self.age_group_classifier.predict(X)[0]
        gender_category_name = self.gender_category_classifier.predict(X)[0]

        age_group = AgeGroup.objects.get(name=age_group_name)
        gender_category = GenderCategory.objects.get(name=gender_category_name)

        product.age_groups.add(age_group)
        product.gender_categories.add(gender_category)
        product.save()
