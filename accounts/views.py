from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required, user_passes_test
from django.contrib.auth import login, logout, authenticate, update_session_auth_hash
from django.contrib import messages
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods, require_POST
from django.core.paginator import Paginator
import json
from .models import User, TeacherProfile, StudentProfile, StaffProfile, ParentProfile
from academics.models import Subject, ClassLevel, Term, Result, AcademicYear, ClassSubject, SchoolDivision, ClassStream
from django.utils import timezone
from datetime import timedelta
from django.db import transaction
from .utils.generateID import generate_teacher_id, generate_student_id, generate_staff_id
from core.views import get_recent_activities, get_teacher_workload
from django.db.models import Case, When, Q, Count, Avg, Max
from django.db import models, IntegrityError
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.utils import timezone
from .utils.redirect_to_dashboard import redirect_to_dashboard
from .utils.cache_failed_attempt import cache_failed_attempt
from .utils.get_client_ip import get_client_ip



@require_http_methods(["GET", "POST"])
def login_view(request):
    """User login with brute force protection"""
    
    if request.user.is_authenticated:
        return redirect_to_dashboard(request.user)
    
    # Check for too many failed attempts
    ip_address = get_client_ip(request)
    failed_attempts = cache.get(f'failed_login_attempts_{ip_address}', 0)
    
    if failed_attempts >= 5:  # Lock after 5 failed attempts
        messages.error(request, 'Too many failed login attempts. Please try again in 15 minutes.')
        return render(request, 'accounts/login.html')
    
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        
        if not username or not password:
            messages.error(request, 'Please enter both username and password.')
            return render(request, 'accounts/login.html')
        
        # Check if user exists and is active
        try:
            User = get_user_model()
            user_obj = User.objects.filter(username=username).first()
        except:
            user_obj = None
        
        if not user_obj:
            cache_failed_attempt(ip_address)
            messages.error(request, 'Invalid username or password.')
            return render(request, 'accounts/login.html')
        
        # Check if user is active
        if not user_obj.is_active:
            messages.error(request, 
                'Your account has been deactivated. '
                'Please contact the system administrator for assistance.'
            )
            return render(request, 'accounts/login.html')
        
        user = authenticate(request, username=username, password=password)
        
        if user is not None and user.is_active:
            # Successful login - clear failed attempts
            cache.delete(f'failed_login_attempts_{ip_address}')
            
            login(request, user)
            messages.success(request, f'Welcome back, {user.get_full_name() or user.username}!')
            
            return redirect_to_dashboard(user)
        else:
            # Failed login - increment counter
            cache_failed_attempt(ip_address)
            messages.error(request, 'Invalid username or password.')
    
    return render(request, 'accounts/login.html')



@login_required
def logout_view(request):
    """User logout"""
    logout(request)
    messages.success(request, 'You have been logged out successfully.')
    return redirect('login')


# ============ User Management Views ============

def is_admin(user):
    return user.is_authenticated and user.role in ['admin', 'proprietor', 'headmaster', 'assistant_head', 'manager']


@login_required
@user_passes_test(is_admin)
@require_http_methods(["POST"])
@transaction.atomic
def register_teacher(request):
    """API endpoint for registering teachers"""
    try:
        if request.content_type == 'application/json':
            data = json.loads(request.body)
        else:
            data = request.POST

        first_name = data.get("first_name")
        last_name = data.get("last_name")
        email = data.get("email")
        phone_number = data.get("phone_number")
        gender = data.get("gender")
        password = data.get("password")
        date_of_birth = data.get("date_of_birth")
        profile_picture = request.FILES.get("profile_picture")
        employment_type = data.get("employment_type", "full_time")
        teaching_level = data.get("teaching_level") or "primary"
        department = data.get("department")
        job_title = data.get("job_title") or "Teacher"
        highest_qualification = data.get("highest_qualification")
        appointment_date = data.get("appointment_date") or None
        notes = data.get("notes")
        is_class_teacher = data.get("is_class_teacher") == "on" or data.get("is_class_teacher") == "true"
        class_teacher_of_id = data.get("class_teacher_of")

        if not all([first_name, last_name, email, employment_type, teaching_level]):
            return JsonResponse({
                'success': False, 
                'error': 'First name, last name, email, employment type, and teaching level are required.'
            }, status=400)
        
        if User.objects.filter(email=email).exists():
            return JsonResponse({
                'success': False, 
                'error': 'A user with this email already exists.'
            }, status=400)
        
        employee_id = generate_teacher_id()

        user = User.objects.create_user(
            username=employee_id,
            email=email,
            password=password or "changeme123",
            first_name=first_name,
            last_name=last_name,
            role="teacher",
            phone_number=phone_number,
            gender=gender,
            date_of_birth=date_of_birth,
        )
        
        if profile_picture:
            user.profile_picture = profile_picture
            user.save()
        
        
        teacher_profile = TeacherProfile.objects.create(
            user=user,
            employee_id=employee_id,
            employment_type=employment_type,
            teaching_level=teaching_level,
            department=department,
            job_title=job_title,
            highest_qualification=highest_qualification,
            appointment_date=appointment_date,
            notes=notes,
            class_teacher_of=ClassLevel.objects.filter(id=class_teacher_of_id).first() if class_teacher_of_id else None
        )
        
        response_data = {
            'success': True,
            'message': f'Teacher {user.get_full_name()} registered successfully with ID {employee_id}.',
        }
        
        if not request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            messages.success(request, response_data['message'])
        
        return JsonResponse(response_data)
        
    except Exception as e:
        return JsonResponse({
            'success': False, 
            'error': f'An error occurred while registering teacher: {str(e)}'
        }, status=400)



@login_required
def user_list(request):
    """List all users with filtering and search"""
    users = User.objects.select_related(
        'teacher_profile', 'student_profile', 'staff_profile'
    ).all()
    
    # Filter by role
    role = request.GET.get('role')
    if role:
        users = users.filter(role=role)
    
    # Search
    search = request.GET.get('search')
    if search:
        users = users.filter(
            Q(username__icontains=search) |
            Q(first_name__icontains=search) |
            Q(last_name__icontains=search) |
            Q(email__icontains=search)
        )
    
    # Pagination
    paginator = Paginator(users, 20)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    context = {
        'page_obj': page_obj,
        'role': role,
        'search': search,
    }
    return render(request, 'accounts/user_list.html', context)


@login_required
def user_detail(request, user_id):
    """View user details"""
    user = get_object_or_404(User, id=user_id)
    
    context = {
        'user': user,
    }
    
    if user.role == 'teacher' and hasattr(user, 'teacher_profile'):
        context['profile'] = user.teacher_profile
    elif user.role == 'student' and hasattr(user, 'student_profile'):
        context['profile'] = user.student_profile
    elif user.role == 'admin' and hasattr(user, 'staff_profile'):
        context['profile'] = user.staff_profile
    
    return render(request, 'accounts/user_detail.html', context)


@login_required
@require_http_methods(["GET", "POST"])
def user_update(request, user_id):
    """Update user details"""
    user = get_object_or_404(User, id=user_id)
    
    if request.method == 'POST':
        try:
            user.first_name = request.POST.get('first_name')
            user.last_name = request.POST.get('last_name')
            user.email = request.POST.get('email')
            user.phone_number = request.POST.get('phone_number')
            user.date_of_birth = request.POST.get('date_of_birth') or None
            user.gender = request.POST.get('gender') or None
            user.emergency_contact_name = request.POST.get('emergency_contact_name')
            user.emergency_contact_phone = request.POST.get('emergency_contact_phone')
            
            if request.FILES.get('profile_picture'):
                user.profile_picture = request.FILES['profile_picture']
            
            user.save()
            messages.success(request, 'User updated successfully!')
            return redirect('user_detail', user_id=user.id)
            
        except Exception as e:
            messages.error(request, f'Error updating user: {str(e)}')
    
    context = {
        'user': user,
        'genders': User.GENDER_CHOICES,
    }
    return render(request, 'accounts/user_form.html', context)


@login_required
@require_http_methods(["POST"])
def user_delete(request, user_id):
    """Delete a user"""
    user = get_object_or_404(User, id=user_id)
    
    try:
        username = user.username
        user.delete()
        messages.success(request, f'{username} deleted successfully!')
    except Exception as e:
        messages.error(request, f'Error deleting user: {str(e)}')
    
    return redirect('user_list')


@login_required
@require_http_methods(["POST"])
def change_password(request, user_id):
    """Change user password"""
    try:
        user = get_object_or_404(User, id=user_id)
        data = json.loads(request.body)
        
        new_password = data.get('new_password')
        confirm_password = data.get('confirm_password')
        
        if new_password != confirm_password:
            return JsonResponse({'success': False, 'error': 'Passwords do not match'}, status=400)
        
        if len(new_password) < 8:
            return JsonResponse({'success': False, 'error': 'Password must be at least 8 characters long'}, status=400)
        
        user.set_password(new_password)
        user.save()
        
        messages.success(request, f'Password for {user.get_full_name()} changed successfully!')
        
        return JsonResponse({'success': True, 'message': 'Password changed successfully!'})
        
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)

# ============ Teacher Profile Views ============


@login_required
def teacher_list(request):
    """List all teachers with filtering and pagination"""
    teachers = TeacherProfile.objects.select_related('user').prefetch_related(
        'subjects',
        'user__class_levels_taught'
    ).order_by('user__first_name', 'user__last_name')
    

    emp_type = request.GET.get('employment_type')
    if emp_type:
        teachers = teachers.filter(employment_type=emp_type)
    

    status = request.GET.get('status')
    if status == 'active':
        teachers = teachers.filter(is_active=True)
    elif status == 'inactive':
        teachers = teachers.filter(is_active=False)
    
    search = request.GET.get('search')
    if search:
        teachers = teachers.filter(
            Q(user__first_name__icontains=search) |
            Q(user__last_name__icontains=search) |
            Q(employee_id__icontains=search) |
            Q(user__email__icontains=search)
        )
    
    # Get counts for stats
    total_teachers = teachers.count()
    full_time_teachers = teachers.filter(employment_type='full_time').count()
    part_time_teachers = teachers.filter(employment_type='part_time').count()
    contract_teachers = teachers.filter(employment_type='contract').count()
    
    # Pagination
    paginator = Paginator(teachers, 20)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    context = {
        'page_obj': page_obj,
        'employment_types': TeacherProfile.EMPLOYMENT_TYPE_CHOICES,
        'teaching_levels': TeacherProfile.TEACHING_LEVEL_CHOICES,
        'emp_type': emp_type,
        'search': search,
        'status': status,
        'total_teachers': total_teachers,
        'full_time_teachers': full_time_teachers,
        'part_time_teachers': part_time_teachers,
        'contract_teachers': contract_teachers,
    }
    return render(request, 'pages/admin_dashboard/teachers.html', {'context': context})


@login_required
def student_list(request):
    """List all students with filtering and pagination"""
    students = StudentProfile.objects.select_related('user', 'current_class')
    
    # Filter by class
    class_filter = request.GET.get('class')
    if class_filter:
        students = students.filter(current_class_id=class_filter)
    
    # Filter by active status
    status = request.GET.get('status')
    if status == 'active':
        students = students.filter(is_active=True)
    elif status == 'inactive':
        students = students.filter(is_active=False)
    
    # Search
    search = request.GET.get('search')
    if search:
        students = students.filter(
            Q(user__first_name__icontains=search) |
            Q(user__last_name__icontains=search) |
            Q(student_id__icontains=search) |
            Q(user__email__icontains=search)
        )
    
    # Get counts and classes for filters
    total_students = students.count()
    classes = ClassLevel.objects.all()
    
    # Pagination
    paginator = Paginator(students, 20)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    context = {
        'page_obj': page_obj,
        'classes': classes,
        'class_filter': class_filter,
        'search': search,
        'status': status,
        'total_students': total_students,
    }
    return render(request, 'pages/admin_dashboard/students.html', {'context': context})


@login_required
@require_http_methods(["POST"])
def user_update(request, user_id):
    """Update an existing user"""
    try:
        user = get_object_or_404(User, id=user_id)
        data = request.POST
        files = request.FILES
        
        # Update basic user fields
        user.first_name = data.get('first_name', user.first_name)
        user.last_name = data.get('last_name', user.last_name)
        user.email = data.get('email', user.email)
        user.phone_number = data.get('phone_number', user.phone_number)
        user.date_of_birth = data.get('date_of_birth') or user.date_of_birth
        user.gender = data.get('gender', user.gender)
        
        if files.get('profile_picture'):
            user.profile_picture = files['profile_picture']
        
        user.save()
        
        # Update profile based on role
        if user.role == 'teacher' and hasattr(user, 'teacher_profile'):
            teacher_profile = user.teacher_profile
            teacher_profile.employment_type = data.get('employment_type', teacher_profile.employment_type)
            teacher_profile.teaching_level = data.get('teaching_level', teacher_profile.teaching_level)
            teacher_profile.department = data.get('department', teacher_profile.department)
            teacher_profile.job_title = data.get('job_title', teacher_profile.job_title)
            teacher_profile.highest_qualification = data.get('highest_qualification', teacher_profile.highest_qualification)
            teacher_profile.appointment_date = data.get('appointment_date') or teacher_profile.appointment_date
            teacher_profile.class_teacher_of_id = data.get('class_teacher_of') or None
            teacher_profile.is_active = data.get('is_active') == 'on'
            teacher_profile.notes = data.get('notes', teacher_profile.notes)
            teacher_profile.save()
            
            # Update subjects
            subjects = data.getlist('subjects')
            if subjects:
                teacher_profile.subjects.set(subjects)
            
        elif user.role == 'student' and hasattr(user, 'student_profile'):
            student_profile = user.student_profile
            student_profile.current_class_id = data.get('current_class', student_profile.current_class_id)
            student_profile.academic_year = data.get('academic_year', student_profile.academic_year)
            student_profile.parent_full_name = data.get('parent_full_name', student_profile.parent_full_name)
            student_profile.parent_phone = data.get('parent_phone', student_profile.parent_phone)
            student_profile.parent_email = data.get('parent_email', student_profile.parent_email)
            student_profile.parent_address = data.get('parent_address', student_profile.parent_address)
            student_profile.emergency_contact_relation = data.get('emergency_contact_relation', student_profile.emergency_contact_relation)
            student_profile.is_active = data.get('is_active') == 'on'
            student_profile.notes = data.get('notes', student_profile.notes)
            student_profile.save()
        
        messages.success(request, f'User {user.get_full_name()} updated successfully!')
        
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({'success': True, 'message': 'User updated successfully!'})
        return redirect('teacher_list' if user.role == 'teacher' else 'student_list')
        
    except Exception as e:
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
        messages.error(request, f'Error updating user: {str(e)}')
        return redirect('teacher_list')


@login_required
@require_http_methods(["DELETE", "POST"])
def user_delete(request, user_id):
    """Delete a user"""
    try:
        user = get_object_or_404(User, id=user_id)
        user_name = user.get_full_name()
        user_role = user.role
        
        user.delete()
        
        messages.success(request, f'User {user_name} deleted successfully!')
        
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({'success': True, 'message': 'User deleted successfully!'})
        return redirect('teacher_list' if user_role == 'teacher' else 'student_list')
        
    except Exception as e:
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
        messages.error(request, f'Error deleting user: {str(e)}')
        return redirect('teacher_list')



@login_required
@require_http_methods(["POST"])
def reset_password(request, user_id):
    """Reset user password to default"""
    try:
        user = get_object_or_404(User, id=user_id)
        new_password = 'changeme123'
        user.set_password(new_password)
        user.save()
        
        messages.success(request, f'Password for {user.get_full_name()} reset to default!')
        
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({'success': True, 'message': 'Password reset successfully!'})
        return redirect('teacher_list' if user.role == 'teacher' else 'student_list')
        
    except Exception as e:
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
        messages.error(request, f'Error resetting password: {str(e)}')
        return redirect('teacher_list')


@login_required
@require_http_methods(["POST"])
def toggle_user_status(request, user_id):
    """Toggle user active status"""
    try:
        user = get_object_or_404(User, id=user_id)
        
        if user.role == 'teacher' and hasattr(user, 'teacher_profile'):
            profile = user.teacher_profile
        elif user.role == 'student' and hasattr(user, 'student_profile'):
            profile = user.student_profile
        else:
            raise ValueError("User profile not found")
        
        profile.is_active = not profile.is_active
        profile.save()
        
        status = "activated" if profile.is_active else "deactivated"
        messages.success(request, f'User {user.get_full_name()} {status} successfully!')
        
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({
                'success': True, 
                'message': f'User {status} successfully!',
                'is_active': profile.is_active
            })
        return redirect('teacher_list' if user.role == 'teacher' else 'student_list')
        
    except Exception as e:
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
        messages.error(request, f'Error toggling user status: {str(e)}')
        return redirect('teacher_list')


@login_required
def get_user_data(request, user_id):

    """Get user data for AJAX requests"""
    try:
        user = get_object_or_404(User, id=user_id)
        
        data = {
            'id': str(user.id),
            'first_name': user.first_name,
            'last_name': user.last_name,
            'email': user.email,
            'phone_number': user.phone_number,
            'date_of_birth': user.date_of_birth.isoformat() if user.date_of_birth else None,
            'gender': user.gender,
            'role': user.role,
        }
        
        if user.role == 'teacher' and hasattr(user, 'teacher_profile'):
            teacher_profile = user.teacher_profile
            data.update({
                'employee_id': teacher_profile.employee_id,
                'employment_type': teacher_profile.employment_type,
                'teaching_level': teacher_profile.teaching_level,
                'department': teacher_profile.department,
                'job_title': teacher_profile.job_title,
                'highest_qualification': teacher_profile.highest_qualification,
                'appointment_date': teacher_profile.appointment_date.isoformat() if teacher_profile.appointment_date else None,
                'is_class_teacher': teacher_profile.is_class_teacher,
                'class_teacher_of': str(teacher_profile.class_teacher_of.id) if teacher_profile.class_teacher_of else None,
                'is_active': teacher_profile.is_active,
                'notes': teacher_profile.notes,
                'subjects': list(teacher_profile.subjects.values_list('id', flat=True)),
            })
        
        elif user.role == 'student' and hasattr(user, 'student_profile'):
            student_profile = user.student_profile
            data.update({
                'student_id': student_profile.student_id,
                'current_class': str(student_profile.current_class.id) if student_profile.current_class else None,
                'academic_year': student_profile.academic_year,
                'parent_full_name': student_profile.parent_full_name,
                'parent_phone': student_profile.parent_phone,
                'parent_email': student_profile.parent_email,
                'parent_address': student_profile.parent_address,
                'emergency_contact_relation': student_profile.emergency_contact_relation,
                'is_active': student_profile.is_active,
                'notes': student_profile.notes,
            })
        
        return JsonResponse({'success': True, 'data': data})
        
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)
    


@login_required
@require_http_methods(["GET", "POST"])
def teacher_update(request, teacher_id):
    """Update teacher profile"""
    teacher = get_object_or_404(TeacherProfile, id=teacher_id)
    
    if request.method == 'POST':
        try:
            teacher.employee_id = request.POST.get('employee_id')
            teacher.employment_type = request.POST.get('employment_type')
            teacher.teaching_level = request.POST.get('teaching_level', teacher.teaching_level)
            teacher.department = request.POST.get('department', teacher.department)
            teacher.job_title = request.POST.get('job_title', teacher.job_title)
            teacher.highest_qualification = request.POST.get('highest_qualification', teacher.highest_qualification)
            teacher.appointment_date = request.POST.get('appointment_date') or teacher.appointment_date
            teacher.is_active = request.POST.get('is_active') == 'on'
            teacher.notes = request.POST.get('notes')
            
            # Update subjects
            subject_ids = request.POST.getlist('subjects')
            teacher.subjects.set(subject_ids)
            
            # Update class teacher of
            class_id = request.POST.get('class_teacher_of')
            teacher.class_teacher_of_id = class_id if class_id else None
            
            teacher.save()
            messages.success(request, 'Teacher profile updated successfully!')
            return redirect('user_detail', user_id=teacher.user.id)
            
        except Exception as e:
            messages.error(request, f'Error updating teacher profile: {str(e)}')
    
    context = {
        'teacher': teacher,
        'subjects': Subject.objects.all(),
        'classes': ClassLevel.objects.all(),
        'employment_types': TeacherProfile.EMPLOYMENT_TYPE_CHOICES,
        'teaching_levels': TeacherProfile.TEACHING_LEVEL_CHOICES,
    }
    return render(request, 'accounts/teacher_form.html', context)


# ============ Student Profile Views ============

@login_required
def student_list(request):
    """List all students with filtering and pagination"""
    students = StudentProfile.objects.select_related('user', 'current_class').order_by('user__first_name', 'user__last_name')
    
    class_id = request.GET.get('class')
    if class_id:
        students = students.filter(current_class_id=class_id)
    
    status = request.GET.get('status')
    if status == 'active':
        students = students.filter(is_active=True)
    elif status == 'inactive':
        students = students.filter(is_active=False)
    
    search = request.GET.get('search')
    if search:
        students = students.filter(
            Q(user__first_name__icontains=search) |
            Q(user__last_name__icontains=search) |
            Q(student_id__icontains=search)
        )
    
    total_students = students.count()
    active_students = students.filter(is_active=True).count()
    inactive_students = students.filter(is_active=False).count()
    
    class_counts = ClassLevel.objects.annotate(
        student_count=Count('students')
    ).values('name', 'student_count')
    

    paginator = Paginator(students, 20)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    context = {
        'page_obj': page_obj,
        'classes': ClassLevel.objects.all(),
        'class_id': class_id,
        'status': status,
        'search': search,
        'total_students': total_students,
        'active_students': active_students,
        'inactive_students': inactive_students,
        'class_counts': list(class_counts),
    }
    return render(request, 'pages/admin_dashboard/students.html', {'context': context})



@login_required
@user_passes_test(is_admin)
@require_http_methods(["POST"])
@transaction.atomic
def student_create(request):
    """API endpoint for registering students"""
    try:
        if request.content_type == 'application/json':
            data = json.loads(request.body)
        else:
            data = request.POST
        
        first_name = data.get("first_name")
        last_name = data.get("last_name")
        email = data.get("email")
        phone_number = data.get("phone_number")
        gender = data.get("gender")
        password = data.get("password")
        date_of_birth = data.get("date_of_birth")
        profile_picture = request.FILES.get("profile_picture")
        current_class_id = data.get("current_class")
        parent_full_name = data.get("parent_full_name")
        parent_phone = data.get("parent_phone")
        parent_email = data.get("parent_email")
        parent_address = data.get("parent_address")
        emergency_contact_relation = data.get("emergency_contact_relation")
        
        # Validation
        if not all([first_name, last_name]):
            return JsonResponse({
                'success': False, 
                'error': 'First name, last name, and email are required.'
            }, status=400)
        
        if User.objects.filter(email=email).exists():
            return JsonResponse({
                'success': False, 
                'error': 'A user with this email already exists.'
            }, status=400)
        

        student_id = generate_student_id()

        if User.objects.filter(username=student_id).exists():
            return JsonResponse({
                'success': False, 
                'error': 'A user with this username already exists.'
            }, status=400)
        
        
 
        user = User.objects.create_user(
            username=student_id,
            email=email,
            password=password or "changeme123",
            first_name=first_name,
            last_name=last_name,
            role="student",
            phone_number=phone_number,
            gender=gender,
            date_of_birth=date_of_birth,
        )
        
        if profile_picture:
            user.profile_picture = profile_picture
            user.save()
        

        student_profile = StudentProfile.objects.create(
            user=user,
            student_id=student_id,
            current_class_id=current_class_id,
            parent_full_name=parent_full_name,
            parent_phone=parent_phone,
            parent_email=parent_email,
            parent_address=parent_address,
            emergency_contact_relation=emergency_contact_relation,
        )
        
        response_data = {
            'success': True,
            'message': f'Student {user.get_full_name()} registered successfully with ID {student_id}.',
        }
        
        if not request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            messages.success(request, response_data['message'])
        
        return JsonResponse(response_data)
        
    except Exception as e:
        return JsonResponse({
            'success': False, 
            'error': f'An error occurred while registering student: {str(e)}'
        }, status=500)
    


@login_required
@require_http_methods(["GET", "POST"])
def student_update(request, student_id):
    """Update student profile"""
    student = get_object_or_404(StudentProfile, id=student_id)
    
    if request.method == 'POST':
        try:
            student.student_id = request.POST.get('student_id')
            student.current_class_id = request.POST.get('current_class') or None
            student.parent_full_name = request.POST.get('parent_full_name')
            student.parent_phone = request.POST.get('parent_phone')
            student.parent_email = request.POST.get('parent_email')
            student.parent_address = request.POST.get('parent_address')
            student.emergency_contact_relation = request.POST.get('emergency_contact_relation')
            student.is_active = request.POST.get('is_active') == 'on'
            student.notes = request.POST.get('notes')
            
            student.save()
            messages.success(request, 'Student profile updated successfully!')
            return redirect('user_detail', user_id=student.user.id)
            
        except Exception as e:
            messages.error(request, f'Error updating student profile: {str(e)}')
    
    context = {
        'student': student,
        'classes': ClassLevel.objects.all(),
    }
    return render(request, 'accounts/student_form.html', context)


@login_required
@require_http_methods(["GET", "POST"])
def staff_create(request):
    """Create staff profile"""
    if request.method == 'POST':
        try:
            user_id = request.POST.get('user_id')
            user = get_object_or_404(
                User,
                id=user_id,
                role__in=['admin', 'proprietor', 'headmaster', 'assistant_head', 'manager', 'non_teaching']
            )
            
            staff = StaffProfile.objects.create(
                user=user,
                staff_id=request.POST.get('staff_id'),
                staff_type=request.POST.get('staff_type'),
                staff_role=request.POST.get('staff_role') or user.role,
                department=request.POST.get('department'),
                job_title=request.POST.get('job_title'),
            )
            
            messages.success(request, 'Staff profile created successfully!')
            return redirect('user_detail', user_id=user.id)
            
        except Exception as e:
            messages.error(request, f'Error creating staff profile: {str(e)}')
    
    # Get users with admin role who don't have a profile
    available_staff = User.objects.filter(
        role__in=['admin', 'proprietor', 'headmaster', 'assistant_head', 'manager', 'non_teaching']
    ).exclude(
        staff_profile__isnull=False
    )
    
    context = {
        'available_staff': available_staff,
        'staff_types': StaffProfile.STAFF_TYPE_CHOICES,
        'staff_roles': StaffProfile.STAFF_ROLE_CHOICES,
    }
    return render(request, 'accounts/staff_form.html', context)


@login_required
def user_api_list(request):
    """JSON API for user list"""
    users = User.objects.all()
    
    role = request.GET.get('role')
    if role:
        users = users.filter(role=role)
    
    search = request.GET.get('search')
    if search:
        users = users.filter(
            Q(username__icontains=search) |
            Q(first_name__icontains=search) |
            Q(last_name__icontains=search) |
            Q(email__icontains=search)
        )
    
    data = []
    for user in users[:100]:  # Limit to 100 results
        data.append({
            'id': str(user.id),
            'username': user.username,
            'full_name': user.get_full_name(),
            'email': user.email,
            'role': user.role,
            'is_active': user.is_active,
        })
    
    return JsonResponse({'users': data})


@login_required
def user_api_detail(request, user_id):
    """JSON API for user detail"""
    user = get_object_or_404(User, id=user_id)
    
    data = {
        'id': str(user.id),
        'username': user.username,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'email': user.email,
        'role': user.role,
        'phone_number': user.phone_number,
        'date_of_birth': user.date_of_birth.isoformat() if user.date_of_birth else None,
        'gender': user.gender,
        'age': user.age,
        'is_active': user.is_active,
    }
    
    return JsonResponse(data)


@login_required
def admin_dashboard(request):
    """Admin dashboard with operational school statistics and actions."""
    today = timezone.now().date()

    total_users = User.objects.count()
    total_teachers = User.objects.filter(role='teacher').count()
    total_students = User.objects.filter(role='student').count()
    total_staff = User.objects.filter(role__in=['admin', 'proprietor', 'headmaster', 'assistant_head', 'manager', 'non_teaching']).count()
    total_parents = User.objects.filter(role='parent').count()
    
    active_students = StudentProfile.objects.filter(is_active=True).count()
    active_teachers = TeacherProfile.objects.filter(is_active=True).count()
    
    total_subjects = Subject.objects.filter(is_active=True).count()
    total_classes = ClassLevel.objects.filter(is_active=True).count()
    
    current_term = Term.objects.filter(is_current=True).first()
    if not current_term:
        current_term = Term.objects.filter(start_date__lte=today, end_date__gte=today).first()
    next_term = Term.objects.filter(start_date__gt=today).order_by('start_date').first()

    recent_results = Result.objects.filter(date_uploaded__gte=timezone.now()-timedelta(days=30)).count()
    
    avg_score = Result.objects.aggregate(avg_score=Avg('score'))['avg_score'] or 0
    
    recent_students = StudentProfile.objects.filter(
        created_at__gte=timezone.now()-timedelta(days=30)
    ).count()
    
    class_distribution = ClassLevel.objects.filter(is_active=True).annotate(
        student_count=Count('students')
    ).values('name', 'student_count').order_by('-student_count')
    class_capacity = ClassLevel.objects.filter(is_active=True).annotate(
        student_count=Count('students')
    ).values('id', 'name', 'capacity', 'student_count').order_by('display_order', 'name')[:8]
    
    teacher_employment = TeacherProfile.objects.values('employment_type').annotate(
        count=Count('id')
    )

    top_students = []
    if current_term:
        top_students = Result.objects.filter(
            term=current_term
        ).values(
            'student__id',
            'student__first_name',
            'student__last_name',
            'student__student_profile__student_id',
            'student__student_profile__current_class__name'
        ).annotate(
            avg_score=Avg('score')
        ).order_by('-avg_score')[:5]
    
    subject_stats = Subject.objects.filter(
        results__isnull=False
    ).annotate(
        student_count=Count('results__student', distinct=True),
        avg_score=Avg('results__score'),
        pass_rate=Avg(
            Case(
                When(results__score__gte=50, then=1),
                default=0,
                output_field=models.FloatField()
            )
        ) * 100
    ).values('name', 'student_count', 'avg_score', 'pass_rate').order_by('-avg_score')[:4]
    
    # Teacher workload (based on assigned subjects)
    # More detailed workload data
    teacher_workload = get_teacher_workload()

    for teacher in teacher_workload:
        teacher['id'] = str(teacher['id'])

    recent_activities = get_recent_activities()

    core_subjects = Subject.objects.filter(category='core', is_active=True).count()
    elective_subjects = Subject.objects.filter(category='elective', is_active=True).count()
    assigned_class_subjects = ClassSubject.objects.count()
    class_subjects_with_teachers = ClassSubject.objects.filter(teacher__isnull=False).count()
    class_subjects_without_teachers = ClassSubject.objects.filter(teacher__isnull=True).count()
    classes_without_form_teacher = ClassLevel.objects.filter(is_active=True, form_teacher__isnull=True).count()
    classes_without_subjects = ClassLevel.objects.filter(is_active=True).annotate(
        subject_total=Count('classsubject')
    ).filter(subject_total=0).count()
    students_without_class = StudentProfile.objects.filter(is_active=True, current_class__isnull=True).count()
    published_results = Result.objects.filter(is_published=True).count()
    unpublished_results = Result.objects.filter(is_published=False).count()
    total_divisions = SchoolDivision.objects.filter(is_active=True).count()
    total_streams = ClassStream.objects.filter(is_active=True).count()
    current_academic_year = AcademicYear.objects.filter(is_current=True).first()

    setup_alerts = []
    if total_classes == 0:
        setup_alerts.append({
            'title': 'No classes created',
            'detail': 'Create class streams before enrolling students.',
            'url': 'class_list',
            'icon': 'bi-building-add',
        })
    if total_subjects == 0:
        setup_alerts.append({
            'title': 'No active subjects',
            'detail': 'Add or activate GES subjects for your classes.',
            'url': 'class_list',
            'icon': 'bi-journal-plus',
        })
    if classes_without_form_teacher:
        setup_alerts.append({
            'title': f'{classes_without_form_teacher} class(es) need form teachers',
            'detail': 'Assign a form teacher to each class for accountability.',
            'url': 'class_list',
            'icon': 'bi-person-check',
        })
    if students_without_class:
        setup_alerts.append({
            'title': f'{students_without_class} student(s) not assigned to a class',
            'detail': 'Place students in their current class.',
            'url': 'student_list',
            'icon': 'bi-person-exclamation',
        })
    if class_subjects_without_teachers:
        setup_alerts.append({
            'title': f'{class_subjects_without_teachers} subject assignment(s) need teachers',
            'detail': 'Assign teachers so workloads and results are traceable.',
            'url': 'class_list',
            'icon': 'bi-diagram-3',
        })

    if current_term:
        term_total_days = max((current_term.end_date - current_term.start_date).days + 1, 1)
        term_elapsed_days = min(max((today - current_term.start_date).days + 1, 0), term_total_days)
        current_term_progress = round((term_elapsed_days / term_total_days) * 100)
        term_days_left = max((current_term.end_date - today).days, 0)
    else:
        current_term_progress = 0
        term_days_left = None

    setup_tasks = [
        {
            'title': 'Set academic year',
            'detail': 'Create the current academic year and GES-based terms.',
            'done': AcademicYear.objects.exists(),
            'url': 'create_academic_year',
            'icon': 'bi-calendar2-check',
        },
        {
            'title': 'Create divisions and classes',
            'detail': 'Set Early Years, Primary, JHS, streams, and class capacity.',
            'done': total_classes > 0 and total_divisions > 0,
            'url': 'class_list',
            'icon': 'bi-building-add',
        },
        {
            'title': 'Add GES subjects',
            'detail': 'Attach subjects to the correct class levels.',
            'done': total_subjects > 0 and assigned_class_subjects > 0,
            'url': 'class_list',
            'icon': 'bi-journal-check',
        },
        {
            'title': 'Add staff and teachers',
            'detail': 'Create leadership, administrators, non-teaching staff, and teachers.',
            'done': total_staff > 0 and total_teachers > 0,
            'url': 'create_admin_page',
            'icon': 'bi-people',
        },
        {
            'title': 'Assign teachers',
            'detail': 'Set form teachers and subject teachers for every class.',
            'done': total_classes > 0 and classes_without_form_teacher == 0 and class_subjects_without_teachers == 0,
            'url': 'class_list',
            'icon': 'bi-person-check',
        },
        {
            'title': 'Enroll students',
            'detail': 'Register learners and place them into their classes.',
            'done': total_students > 0 and students_without_class == 0,
            'url': 'student_create',
            'icon': 'bi-mortarboard',
        },
    ]
    completed_setup_tasks = sum(1 for task in setup_tasks if task['done'])
    setup_completion = round((completed_setup_tasks / len(setup_tasks)) * 100)

    dashboard_modules = [
        {
            'title': 'Students',
            'count': total_students,
            'detail': f'{active_students} active, {students_without_class} without class',
            'url': 'student_list',
            'action': 'Manage students',
            'icon': 'bi-mortarboard',
            'tone': 'blue',
        },
        {
            'title': 'Staff and Teachers',
            'count': total_staff + total_teachers,
            'detail': f'{active_teachers} active teachers, {total_staff} leadership and staff',
            'url': 'admin_list',
            'action': 'Manage staff',
            'icon': 'bi-person-badge',
            'tone': 'green',
        },
        {
            'title': 'Classes and Subjects',
            'count': total_classes,
            'detail': f'{total_subjects} subjects, {total_streams} class streams',
            'url': 'class_list',
            'action': 'Build classes',
            'icon': 'bi-building',
            'tone': 'violet',
        },
        {
            'title': 'Calendar and Results',
            'count': recent_results,
            'detail': f'{published_results} published, {unpublished_results} pending result entries',
            'url': 'results_dashboard',
            'action': 'Open results',
            'icon': 'bi-graph-up-arrow',
            'tone': 'amber',
        },
    ]
    
    context = {
        'total_users': total_users,
        'total_teachers': total_teachers,
        'total_students': total_students,
        'total_staff': total_staff,
        'total_parents': total_parents,
        'active_students': active_students,
        'active_teachers': active_teachers,
        'total_subjects': total_subjects,
        'total_classes': total_classes,
        
        'recent_results': recent_results,
        'avg_score': round(avg_score, 2),
        'recent_students': recent_students,
        'class_distribution': list(class_distribution),
        'teacher_employment': list(teacher_employment),
        'current_term': current_term,
        'next_term': next_term,
        'current_academic_year': current_academic_year,
        'current_term_progress': current_term_progress,
        'term_days_left': term_days_left,
        
        'top_students': list(top_students),
        'subject_stats': list(subject_stats),
        'teacher_workload': teacher_workload,
        'recent_activities': recent_activities,
        'core_subjects': core_subjects,
        'elective_subjects': elective_subjects,
        'assigned_class_subjects': assigned_class_subjects,
        'class_subjects_with_teachers': class_subjects_with_teachers,
        'class_subjects_without_teachers': class_subjects_without_teachers,
        'classes_without_form_teacher': classes_without_form_teacher,
        'classes_without_subjects': classes_without_subjects,
        'students_without_class': students_without_class,
        'published_results': published_results,
        'unpublished_results': unpublished_results,
        'total_divisions': total_divisions,
        'total_streams': total_streams,
        'class_capacity': list(class_capacity),
        'setup_alerts': setup_alerts,
        'setup_tasks': setup_tasks,
        'setup_completion': setup_completion,
        'completed_setup_tasks': completed_setup_tasks,
        'dashboard_modules': dashboard_modules,
    }

    return render(request, 'accounts/admin_dashboard.html', {'context': context})


@login_required
def teacher_dashboard(request):
    teacher_profile = get_object_or_404(TeacherProfile, user=request.user)

    subjects = Subject.objects.filter(
        classsubject__teacher=request.user
    ).distinct()

    classes_taught = ClassLevel.objects.filter(
        classsubject__teacher=request.user
    ).distinct()

    recent_results = Result.objects.filter(
        uploaded_by=request.user
    ).select_related('student', 'subject').order_by('-date_uploaded')[:5]

    total_students = StudentProfile.objects.filter(
        current_class__classsubject__teacher=request.user
    ).distinct().count()

    context = {
        'teacher': teacher_profile,
        'subjects': subjects,
        'classes_taught': classes_taught,
        'total_students': total_students,
        'recent_results': recent_results,
    }

    return render(request, 'accounts/teacher_dashboard.html', context)


@login_required
def student_dashboard(request):

    """Comprehensive student dashboard with all results and filters"""
    if request.user.role != 'student':
        return redirect('admin_dashboard')
    
    student_profile = get_object_or_404(StudentProfile, user=request.user)
    
    # Get filter parameters
    academic_year_id = request.GET.get('academic_year')
    term_id = request.GET.get('term')
    
    # Base queryset for results
    results = Result.objects.filter(
        student=request.user,
        is_published=False
    ).select_related('subject', 'class_level', 'term', 'term__academic_year')
    
    # Apply filters
    if academic_year_id:
        results = results.filter(term__academic_year_id=academic_year_id)
    if term_id:
        results = results.filter(term_id=term_id)
    
    # Get available filters
    academic_years = AcademicYear.objects.all().order_by('-start_date')
    terms = Term.objects.all().order_by('-academic_year', 'start_date')
    
    # Group results by term
    results_by_term = {}
    for result in results:
        term_key = f"{result.term.name} - {result.term.academic_year.name}"
        if term_key not in results_by_term:
            results_by_term[term_key] = {
                'term': result.term,
                'results': []
            }
        results_by_term[term_key]['results'].append(result)
    
    # Calculate statistics
    total_results = results.count()
    average_score = results.aggregate(avg=Avg('score'))['avg'] or 0
    best_subject = results.order_by('-score').first()
    worst_subject = results.order_by('score').first()
    
    # Grade distribution
    grade_distribution = results.values('grade').annotate(
        count=Count('id')
    ).order_by('grade')
    
    # Subject performance
    subject_performance = results.values(
        'subject__name', 'subject__code'
    ).annotate(
        avg_score=Avg('score'),
        count=Count('id'),
        max_score=Max('score')
    ).order_by('-avg_score')
    
    # Recent results (last 5)
    recent_results = results.order_by('-date_uploaded')[:5]
    
    context = {
        'student': student_profile,
        'class_teacher': student_profile.class_teacher,
        'results_by_term': results_by_term,
        'recent_results': recent_results,
        'total_results': total_results,
        'average_score': round(average_score, 2),
        'best_subject': best_subject,
        'worst_subject': worst_subject,
        'grade_distribution': grade_distribution,
        'subject_performance': subject_performance,
        'academic_years': academic_years,
        'terms': terms,
        'current_filters': {
            'academic_year_id': academic_year_id,
            'term_id': term_id,
        }
    }
    
    return render(request, 'accounts/student_dashboard.html', context)



def get_classes_ajax(request):
    if request.method == 'GET' and request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        try:
            classes = ClassLevel.objects.all().values('id', 'name')
            classes_list = list(classes)
            return JsonResponse({
                'classes': classes_list
            })
        except Exception as e:
            return JsonResponse({
                'error': str(e)
            }, status=500)
    
    return JsonResponse({'error': 'Invalid request'}, status=400)


@login_required
def manage_results(request):
    teacher_profile = get_object_or_404(TeacherProfile, user=request.user)

    # Subjects this teacher teaches
    subjects = Subject.objects.filter(
        classsubject__teacher=teacher_profile.user,
        is_active=True
    ).distinct()

    # Classes this teacher teaches
    classes_taught = ClassLevel.objects.filter(
        classsubject__teacher=request.user
    ).distinct()

    # Results for subjects this teacher teaches
    results = Result.objects.filter(
        subject__classsubject__teacher=teacher_profile.user
    ).select_related(
        'student', 'subject', 'class_level', 'term', 'uploaded_by'
    ).order_by('-date_uploaded').distinct()

    subject_filter = request.GET.get('subject')
    class_filter = request.GET.get('class_level')
    term_filter = request.GET.get('term')
    academic_year_filter = request.GET.get('academic_year')

    if subject_filter:
        results = results.filter(subject_id=subject_filter)

    if class_filter:
        results = results.filter(
            student__student_profile__current_class_id=class_filter
        )

    if term_filter:
        results = results.filter(term_id=term_filter)

    if academic_year_filter:
        results = results.filter(academic_year=academic_year_filter)

    context = {
        'teacher': teacher_profile,
        'subjects': subjects,
        'classes_taught': classes_taught,
        'results': results,
        'terms': Term.objects.all(),
        'current_filters': {
            'subject': subject_filter,
            'class_level': class_filter,
            'term': term_filter,
            'academic_year': academic_year_filter,
        }
    }

    return render(request, 'pages/teacher_dashboard/manage_results.html', context)


@login_required
def my_classes(request):
    """Teacher's classes page"""
    teacher_profile = get_object_or_404(TeacherProfile, user=request.user)

    # Classes the teacher teaches
    classes_taught = ClassLevel.objects.filter(
        classsubject__teacher=request.user
    ).distinct().annotate(
        subject_count=Count(
            'classsubject',
            filter=Q(classsubject__teacher=request.user),
            distinct=True
        ),
        student_count=Count('students', distinct=True)
    )

    context = {
        'teacher': teacher_profile,
        'classes_taught': classes_taught,
    }

    
    return render(request, 'pages/teacher_dashboard/my_classes.html', context)


@login_required
def my_students(request):
    teacher_profile = get_object_or_404(TeacherProfile, user=request.user)
    teacher_user = teacher_profile.user  # Use User instance

    # Students the teacher actually teaches
    students = StudentProfile.objects.filter(
        current_class__classsubject__teacher=teacher_user
    ).distinct().select_related('user', 'current_class')

    class_filter = request.GET.get('class')
    if class_filter:
        students = students.filter(current_class_id=class_filter)

    # Classes the teacher teaches
    classes_taught = ClassLevel.objects.filter(
        classsubject__teacher=teacher_user
    ).distinct()

    context = {
        'teacher': teacher_profile,
        'students': students,
        'classes_taught': classes_taught,
        'current_class_filter': class_filter,
    }

    return render(request, 'pages/teacher_dashboard/my_students.html', context)


@login_required
def class_students_ajax(request, class_id):
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        try:
            teacher_profile = get_object_or_404(TeacherProfile, user=request.user)
            teacher_user = teacher_profile.user 

            # Verify teacher teaches this class
            class_taught = get_object_or_404(
                ClassLevel,
                id=class_id,
                class_subjects__teacher=teacher_user
            )

            students = StudentProfile.objects.filter(
                current_class=class_taught
            ).values(
                'id', 'student_id', 'user__first_name', 'user__last_name'
            )

            return JsonResponse({'success': True, 'students': list(students)})

        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)

    return JsonResponse({'error': 'Invalid request'}, status=400)




@login_required
def student_results_ajax(request, student_id):
    """
    AJAX view to fetch results of a student for the subjects
    taught by the logged-in teacher in that student's class.
    """
    if request.headers.get('X-Requested-With') != 'XMLHttpRequest':
        return JsonResponse({'error': 'Invalid request'}, status=400)

    try:
        teacher_profile = get_object_or_404(TeacherProfile, user=request.user)
        student_profile = get_object_or_404(StudentProfile, id=student_id)

        if not student_profile.current_class:
            return JsonResponse({
                'success': True, 
                'results': []
            })

        student_class = student_profile.current_class

        # Get subjects through ClassSubject
        class_subjects = ClassSubject.objects.filter(
            class_level=student_class,
            teacher=request.user  # Use User object here
        )

        teacher_subject_ids = class_subjects.values_list('subject_id', flat=True)

        # Get results
        results = Result.objects.filter(
            student=student_profile.user,
            subject_id__in=teacher_subject_ids,
            class_level=student_class
        ).select_related('subject', 'term', 'academic_year').values(
                'id', 'score', 'grade', 'date_uploaded',
                'subject__name', 'subject__code',
                'term__name'
            )

        return JsonResponse({
                'success': True,
                'results': list(results)
            })

    except Exception as e:
        return JsonResponse({
            'success': False, 
            'error': str(e)
        }, status=400)



@login_required
def profile_page(request):
    """Profile page for all users - uses appropriate base template based on role"""
    user = request.user
    
    # Determine which base template to use based on role
    if user.role == 'admin':
        base_template = 'base/admin_d.html'
    elif user.role == 'teacher':
        base_template = 'base/teacher_d.html'
    elif user.role == 'student':
        base_template = 'base/student_d.html'
    else:
        base_template = 'base/admin_d.html'
    
    context = {
        'base_template': base_template,
        'user_role': user.role,
    }
    
    return render(request, 'accounts/profile.html', context)


@login_required
@require_http_methods(["PUT"])
def update_profile(request):
    """Update current user's profile"""
    try:
        user = request.user
        data = json.loads(request.body)
        
        # Update basic user fields
        user.first_name = data.get('first_name', user.first_name)
        user.last_name = data.get('last_name', user.last_name)
        user.email = data.get('email', user.email)
        user.phone_number = data.get('phone_number', user.phone_number)
        user.date_of_birth = data.get('date_of_birth', user.date_of_birth)
        user.gender = data.get('gender', user.gender)
        
        # Update profile-specific fields based on role
        if user.role == 'teacher' and hasattr(user, 'teacher_profile'):
            teacher_profile = user.teacher_profile
            teacher_profile.employment_type = data.get('employment_type', teacher_profile.employment_type)
            teacher_profile.teaching_level = data.get('teaching_level', teacher_profile.teaching_level)
            teacher_profile.department = data.get('department', teacher_profile.department)
            teacher_profile.job_title = data.get('job_title', teacher_profile.job_title)
            teacher_profile.highest_qualification = data.get('highest_qualification', teacher_profile.highest_qualification)
            teacher_profile.appointment_date = data.get('appointment_date') or teacher_profile.appointment_date
            teacher_profile.notes = data.get('notes', teacher_profile.notes)
            teacher_profile.save()
        
        elif user.role == 'student' and hasattr(user, 'student_profile'):
            student_profile = user.student_profile
            student_profile.parent_full_name = data.get('parent_full_name', student_profile.parent_full_name)
            student_profile.parent_phone = data.get('parent_phone', student_profile.parent_phone)
            student_profile.parent_email = data.get('parent_email', student_profile.parent_email)
            student_profile.parent_address = data.get('parent_address', student_profile.parent_address)
            student_profile.emergency_contact_relation = data.get('emergency_contact_relation', student_profile.emergency_contact_relation)
            student_profile.notes = data.get('notes', student_profile.notes)
            student_profile.save()
        
        user.save()
        
        return JsonResponse({
            'success': True,
            'message': 'Profile updated successfully',
            'user': {
                'id': str(user.id),
                'first_name': user.first_name,
                'last_name': user.last_name,
                'email': user.email,
                'phone_number': user.phone_number,
                'date_of_birth': user.date_of_birth if user.date_of_birth else None,
                'gender': user.gender,
            }
        })
        
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)



@login_required
@require_http_methods(["POST"])
def change_own_password(request):
    """Change current user's password"""
    try:
        user = request.user
        data = json.loads(request.body)
        
        current_password = data.get('current_password')
        new_password = data.get('new_password')
        confirm_password = data.get('confirm_password')
        
        # Verify current password
        if not user.check_password(current_password):
            return JsonResponse({'success': False, 'error': 'Current password is incorrect'}, status=400)
        
        if new_password != confirm_password:
            return JsonResponse({'success': False, 'error': 'New passwords do not match'}, status=400)
        
        if len(new_password) < 8:
            return JsonResponse({'success': False, 'error': 'Password must be at least 8 characters long'}, status=400)
        
        user.set_password(new_password)
        user.save()
        
        # Update session to prevent logout
        update_session_auth_hash(request, user)
        
        return JsonResponse({'success': True, 'message': 'Password changed successfully!'})
        
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)



@login_required
def get_own_profile_data(request):
    """Get current user's profile data"""
    try:
        user = request.user
        
        data = {
            'id': str(user.id),
            'first_name': user.first_name,
            'last_name': user.last_name,
            'email': user.email,
            'phone_number': user.phone_number,
            'date_of_birth': user.date_of_birth.isoformat() if user.date_of_birth else None,
            'gender': user.gender,
            'role': user.role,
            'username': user.username,
        }
        
        # -------------------------------
        # TEACHER PROFILE DATA
        # -------------------------------
        if user.role == 'teacher' and hasattr(user, 'teacher_profile'):
            teacher_profile = user.teacher_profile

            #Fetch ALL subjects the teacher teaches (across all classes)
            class_subjects = ClassSubject.objects.filter(
                teacher=user
            ).select_related('subject', 'class_level')

            # Unique subjects (teacher may teach same subject in different classes)
            subjects_list = []
            seen = set()

            for cs in class_subjects:
                key = cs.subject.id
                if key not in seen:
                    subjects_list.append({
                        'id': str(cs.subject.id),
                        'name': cs.subject.name,
                        'code': cs.subject.code,
                    })
                    seen.add(key)

            data.update({
                'employee_id': teacher_profile.employee_id,
                'employment_type': teacher_profile.employment_type,
                'teaching_level': teacher_profile.teaching_level,
                'department': teacher_profile.department,
                'job_title': teacher_profile.job_title,
                'highest_qualification': teacher_profile.highest_qualification,
                'appointment_date': teacher_profile.appointment_date.isoformat() if teacher_profile.appointment_date else None,
                'is_class_teacher': teacher_profile.is_class_teacher,
                'class_teacher_of': str(teacher_profile.class_teacher_of.id) if teacher_profile.class_teacher_of else None,
                'class_teacher_name': teacher_profile.class_teacher_of.name if teacher_profile.class_teacher_of else None,
                'is_active': teacher_profile.is_active,
                'notes': teacher_profile.notes,
                'subjects': subjects_list,
            })
        
        # -------------------------------
        # STUDENT PROFILE DATA
        # -------------------------------
        elif user.role == 'student' and hasattr(user, 'student_profile'):
            student_profile = user.student_profile

            data.update({
                'student_id': student_profile.student_id,
                'current_class': str(student_profile.current_class.id) if student_profile.current_class else None,
                'current_class_name': student_profile.current_class.name if student_profile.current_class else None,
                'academic_year': student_profile.academic_year,
                'parent_full_name': student_profile.parent_full_name,
                'parent_phone': student_profile.parent_phone,
                'parent_email': student_profile.parent_email,
                'parent_address': student_profile.parent_address,
                'emergency_contact_relation': student_profile.emergency_contact_relation,
                'is_active': student_profile.is_active,
                'notes': student_profile.notes,
            })
        
        # -------------------------------
        # ADMIN / STAFF PROFILE
        # -------------------------------
        elif user.role == 'admin' and hasattr(user, 'staff_profile'):
            staff_profile = user.staff_profile
            
            data.update({
                'employee_id': staff_profile.employee_id,
                'department': staff_profile.department,
                'position': staff_profile.position,
            })
        
        return JsonResponse({'success': True, 'data': data})
    
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)




@login_required
def admin_list(request):
    """List all admin staff with filtering and pagination"""
    # Get filter parameters
    staff_type = request.GET.get('staff_type')
    is_active = request.GET.get('is_active')
    search = request.GET.get('search')
    page = request.GET.get('page', 1)
    
    staff_roles = ['admin', 'proprietor', 'headmaster', 'assistant_head', 'manager', 'non_teaching']
    admins = StaffProfile.objects.select_related('user').filter(user__role__in=staff_roles).order_by('user__first_name', 'user__last_name')
    
    # Apply filters
    if staff_type:
        admins = admins.filter(staff_type=staff_type)
    
    if is_active:
        is_active_bool = is_active.lower() == 'true'
        admins = admins.filter(user__is_active=is_active_bool)
    
    if search:
        admins = admins.filter(
            Q(user__first_name__icontains=search) |
            Q(user__last_name__icontains=search) |
            Q(user__email__icontains=search) |
            Q(staff_id__icontains=search) |
            Q(user__username__icontains=search)
        )
    
    # Get counts for stats
    total_admins = StaffProfile.objects.filter(user__role__in=staff_roles).count()
    active_admins = StaffProfile.objects.filter(user__role__in=staff_roles, user__is_active=True).count()
    administrative_count = StaffProfile.objects.filter(user__role__in=staff_roles, staff_type='administrative').count()
    other_count = StaffProfile.objects.filter(user__role__in=staff_roles, staff_type='other').count()
    
    # Pagination
    paginator = Paginator(admins, 20)  # 20 items per page
    admins_page = paginator.get_page(page)
    
    context = {
        'admins': admins_page,
        'total_admins': total_admins,
        'active_admins': active_admins,
        'administrative_count': administrative_count,
        'other_count': other_count,
        'current_filters': {
            'staff_type': staff_type,
            'is_active': is_active,
            'search': search,
        }
    }
    
    return render(request, 'accounts/admin_list.html', context)



@login_required
def create_admin_page(request):
    """Render the create admin staff page"""
    return render(request, 'accounts/create_admin.html')



@login_required
@require_POST
def create_admin(request):
    """Create a new admin staff member"""
    try:
        first_name = request.POST.get('first_name')
        last_name = request.POST.get('last_name')
        username = request.POST.get('username')
        email = request.POST.get('email')
        password = request.POST.get('password')
        staff_type = request.POST.get('staff_type')
        staff_role = request.POST.get('staff_role') or 'admin'
        department = request.POST.get('department')
        phone_number = request.POST.get('phone_number')
        date_of_birth = request.POST.get('date_of_birth')
        gender = request.POST.get('gender')
        emergency_contact_name = request.POST.get('emergency_contact_name')
        emergency_contact_phone = request.POST.get('emergency_contact_phone')
        profile_picture = request.FILES.get('profile_picture')

        # Validate required fields
        errors = {}
        if not all([first_name, last_name, username, email, password, staff_type]):
            errors['general'] = ['All required fields must be filled']

        # Check if username already exists
        if User.objects.filter(username=username).exists():
            errors['username'] = ['Username already exists']

        # Check if email already exists
        if User.objects.filter(email=email).exists():
            errors['email'] = ['Email already registered']

        if errors:
            return JsonResponse({'success': False, 'errors': errors}, status=400)

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            role=staff_role if staff_role in dict(User.ROLE_CHOICES) else 'admin',
            phone_number=phone_number,
            date_of_birth=date_of_birth,
            gender=gender,
            emergency_contact_name=emergency_contact_name,
            emergency_contact_phone=emergency_contact_phone,
            profile_picture=profile_picture
        )

        staff_id = generate_staff_id()

        StaffProfile.objects.create(
            user=user,
            staff_id=staff_id,
            staff_type=staff_type,
            staff_role=staff_role,
            department=department,
            job_title=dict(StaffProfile.STAFF_ROLE_CHOICES).get(staff_role, 'Administrator')
        )

        return JsonResponse({
            'success': True,
            'message': f'Admin staff {user.get_full_name()} created successfully',
            'redirect_url': '/accounts/staff/'
        })

    except IntegrityError as e:
        return JsonResponse({
            'success': False,
            'error': 'Database integrity error. Please check the provided information.'
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'An error occurred: {str(e)}'
        }, status=500)


@login_required
def check_username(request):
    """Check if username is available"""

    username = request.GET.get('username')
    if not username:
        return JsonResponse({'available': False})
    
    available = not User.objects.filter(username=username).exists()
    return JsonResponse({'available': available})


@login_required
def check_email(request):
    """Check if email is available"""

    email = request.GET.get('email')
    if not email:
        return JsonResponse({'available': False})
    
    available = not User.objects.filter(email=email).exists()
    return JsonResponse({'available': available})


@login_required
@require_POST
def toggle_admin_status(request, admin_id):
    """
    Toggle admin active status (activate/deactivate)
    """
    try:
        admin_profile = get_object_or_404(
            StaffProfile.objects.select_related('user'),
            id=admin_id,
            user__role='admin'
        )
        
        # Prevent self-deactivation
        if admin_profile.user.id == request.user.id:
            return JsonResponse({
                'success': False,
                'error': 'You cannot deactivate your own account'
            }, status=400)
        
        # Toggle the active status
        admin_profile.user.is_active = not admin_profile.user.is_active
        admin_profile.user.save()
        
        action = 'activated' if admin_profile.user.is_active else 'deactivated'
        
        return JsonResponse({
            'success': True,
            'message': f'Admin {admin_profile.user.get_full_name()} has been {action} successfully',
            'is_active': admin_profile.user.is_active,
            'new_status': 'Active' if admin_profile.user.is_active else 'Inactive'
        })
        
    except StaffProfile.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': 'Admin staff member not found'
        }, status=404)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'An error occurred: {str(e)}'
        }, status=500)



@login_required
@require_POST
def activate_admin(request, admin_id):
    """
    Activate a specific admin
    """
    try:
        admin_profile = get_object_or_404(
            StaffProfile.objects.select_related('user'),
            id=admin_id,
            user__role='admin'
        )
        
        # Check if already active
        if admin_profile.user.is_active:
            return JsonResponse({
                'success': False,
                'error': 'Admin is already active'
            }, status=400)
        
        # Activate the admin
        admin_profile.user.is_active = True
        admin_profile.user.save()
        
        print(f"Admin {admin_profile.user.get_full_name()} activated by {request.user.get_full_name()}")
        
        return JsonResponse({
            'success': True,
            'message': f'Admin {admin_profile.user.get_full_name()} has been activated successfully',
            'is_active': True,
            'status': 'Active'
        })
        
    except StaffProfile.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': 'Admin staff member not found'
        }, status=404)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'An error occurred: {str(e)}'
        }, status=500)



@login_required
@require_POST
def deactivate_admin(request, admin_id):
    """
    Deactivate a specific admin
    """
    try:
        admin_profile = get_object_or_404(
            StaffProfile.objects.select_related('user'),
            id=admin_id,
            user__role='admin'
        )
        
        # Prevent self-deactivation
        if admin_profile.user.id == request.user.id:
            return JsonResponse({
                'success': False,
                'error': 'You cannot deactivate your own account'
            }, status=400)
        
        # Check if already inactive
        if not admin_profile.user.is_active:
            return JsonResponse({
                'success': False,
                'error': 'Admin is already inactive'
            }, status=400)
        
        # Deactivate the admin
        admin_profile.user.is_active = False
        admin_profile.user.save()
        
        # Log the action
        print(f"Admin {admin_profile.user.get_full_name()} deactivated by {request.user.get_full_name()}")
        
        return JsonResponse({
            'success': True,
            'message': f'Admin {admin_profile.user.get_full_name()} has been deactivated successfully',
            'is_active': False,
            'status': 'Inactive'
        })
        
    except StaffProfile.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': 'Admin staff member not found'
        }, status=404)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'An error occurred: {str(e)}'
        }, status=500)



@login_required
@require_http_methods(["GET", "POST"])
def bulk_admin_status(request):
    """
    Bulk activate/deactivate admins
    """
    if request.method == 'POST':
        try:
            admin_ids = request.POST.getlist('admin_ids')
            action = request.POST.get('action')  # 'activate' or 'deactivate'
            
            if not admin_ids:
                return JsonResponse({
                    'success': False,
                    'error': 'No admin IDs provided'
                }, status=400)
            
            if action not in ['activate', 'deactivate']:
                return JsonResponse({
                    'success': False,
                    'error': 'Invalid action. Use "activate" or "deactivate"'
                }, status=400)
            
            admins = StaffProfile.objects.filter(
                id__in=admin_ids,
                user__role='admin'
            ).select_related('user')
            
            # Filter out current user if deactivating
            if action == 'deactivate':
                admins = admins.exclude(user=request.user)
            
            updated_count = 0
            for admin in admins:
                admin.user.is_active = (action == 'activate')
                admin.user.save()
                updated_count += 1
            
            return JsonResponse({
                'success': True,
                'message': f'Successfully {action}d {updated_count} admin(s)',
                'updated_count': updated_count
            })
            
        except Exception as e:
            return JsonResponse({
                'success': False,
                'error': f'An error occurred: {str(e)}'
            }, status=500)
    
    # GET request - return form or info
    return JsonResponse({
        'message': 'Use POST method with admin_ids and action parameters'
    })
