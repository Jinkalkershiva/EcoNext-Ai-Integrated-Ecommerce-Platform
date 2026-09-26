from django.http import JsonResponse

def welcome(request):
    return JsonResponse({
        "message": "Welcome to EcoNext API",
        "version": "1.0.0",
        "endpoints": {
            "products": "/api/products/",
            "admin": "/admin/"
        }
    })

def test(request):
    return JsonResponse({"message": "EcoNext API working!"})
