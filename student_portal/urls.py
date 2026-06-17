"""
URL configuration for student_portal project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.urls import path
from django.conf.urls import handler400, handler403, handler404, handler500
from django.shortcuts import render


urlpatterns = [
    path('admin/', admin.site.urls),
    path('account/', include("accounts.urls")),
    path('academics/', include("academics.urls")),
    path('', include("core.urls"))
]

def custom_404(request, exception):
    return render(request, "errors/404.html", status=404)

def custom_500(request):
    return render(request, "errors/500.html", status=500)

def custom_403(request, exception):
    return render(request, "errors/403.html", status=403)

def custom_400(request, exception):
    return render(request, "errors/400.html", status=400)


handler404 = "student_portal.urls.custom_404"
handler500 = "student_portal.urls.custom_500"
handler403 = "student_portal.urls.custom_403"
handler400 = "student_portal.urls.custom_400"

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)