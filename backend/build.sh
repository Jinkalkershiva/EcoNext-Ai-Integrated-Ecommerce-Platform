#!/usr/bin/env bash
# exit on error
set -o errexit

echo "Installing requirements..."
pip install -r requirements.txt

echo "Running migrations..."
python manage.py migrate --noinput

echo "Collecting static files..."
python manage.py collectstatic --noinput --clear
