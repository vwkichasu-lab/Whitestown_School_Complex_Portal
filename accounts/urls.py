from django.urls import path
from . import views

urlpatterns = [
    # Authentication
    path('auth/login/', views.login_view, name='login'),
    path('auth/logout/', views.logout_view, name='logout'),
    
    # User Management
    path('users/', views.user_list, name='user_list'),
    path('users/<uuid:user_id>/', views.user_detail, name='user_detail'),
    path('users/<uuid:user_id>/update/', views.user_update, name='user_update'),
    path('users/<uuid:user_id>/delete/', views.user_delete, name='user_delete'),
    
    # Teacher Profiles
    path('teachers/create/', views.register_teacher, name='teacher_create'),
    path('teachers/<int:teacher_id>/update/', views.teacher_update, name='teacher_update'),
    path('teacher/classes/', views.my_classes, name='my_classes'),
    path('teacher/students/', views.my_students, name='my_students'),
    path('teacher/classes/<int:class_id>/students/', views.class_students_ajax, name='class_students_ajax'),
    
    
    # Student Profiles
    path('students/create/', views.student_create, name='student_create'),
    path('students/<int:student_id>/update/', views.student_update, name='student_update'),
    
    # Staff Profiles
    path('staff/create/', views.staff_create, name='staff_create'),
    
    # JSON API Endpoints
    path('api/users/', views.user_api_list, name='user_api_list'),
    path('api/users/<uuid:user_id>/', views.user_api_detail, name='user_api_detail'),
    
    # Dashboards
        #Admin
    path('dashboard/admin/', views.admin_dashboard, name='admin_dashboard'),
    path('dashboard/admin/teachers/', views.teacher_list, name='teachers_list'),
    path('dashboard/admin/students/', views.student_list, name='student_list'),

        #Teacher
    path('dashboard/teacher/', views.teacher_dashboard, name='teacher_dashboard'),
    path('dashboard/teacher/results_management/', views.manage_results, name='manage_results'),


        #Student
    path('dashboard/student/', views.student_dashboard, name='student_dashboard'),
    
    # User actions
    path('users/<uuid:user_id>/reset-password/', views.reset_password, name='reset_password'),
    path('users/<uuid:user_id>/toggle-status/', views.toggle_user_status, name='toggle_user_status'),
    path('users/<uuid:user_id>/data/', views.get_user_data, name='get_user_data'),
    path('users/<uuid:user_id>/change-password/', views.change_password, name='change_password'),
    path('ajax/classes/', views.get_classes_ajax, name='ajax_classes'),
    path('api/student/<int:student_id>/results/', views.student_results_ajax, name='student_results_ajax'),


    path('profile/', views.profile_page, name='profile'),
    path('api/profile/', views.get_own_profile_data, name='get_own_profile'),
    path('api/profile/update/', views.update_profile, name='update_profile'),
    path('api/profile/change-password/', views.change_own_password, name='change_own_password'),
    path('create-admin/1.80/:200/~/gorden/!~/add/', views.create_admin_page, name='create_admin_page'),
    path('create-admin/', views.create_admin, name='create_admin'),
    path('admin-list/', views.admin_list, name='admin_list'),
    path('check-username/', views.check_username, name='check_username'),
    path('check-email/', views.check_email, name='check_email'),
    path('admin/<int:admin_id>/toggle-status/', views.toggle_admin_status, name='toggle_admin_status'),
    path('admin/<int:admin_id>/activate/', views.activate_admin, name='activate_admin'),
    path('admin/<int:admin_id>/deactivate/', views.deactivate_admin, name='deactivate_admin'),
]