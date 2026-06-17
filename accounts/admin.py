from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from django.db.models import Count
from .models import User, TeacherProfile, StudentProfile, StaffProfile
from django.contrib.admin import SimpleListFilter


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Custom admin for User model"""
    
    list_display = (
        'username', 'email', 'full_name', 'role', 
        'profile_picture_thumb', 'age', 'is_active', 
        'is_staff', 'created_at'
    )
    list_filter = (
        'role', 'gender', 'is_active', 'is_staff', 
        'is_superuser', 'created_at', 'date_of_birth'
    )
    search_fields = (
        'username', 'first_name', 'last_name', 
        'email', 'phone_number'
    )
    ordering = ('-created_at',)
    readonly_fields = ('id', 'created_at', 'updated_at', 'age', 'last_login', 'date_joined')
    
    fieldsets = (
        ('Authentication', {
            'fields': ('id', 'username', 'password')
        }),
        ('Personal Information', {
            'fields': (
                'first_name', 'last_name', 'email', 
                'phone_number', 'date_of_birth', 'gender', 
                'age', 'profile_picture'
            )
        }),
        ('Role & Permissions', {
            'fields': (
                'role', 'is_active', 'is_staff', 
                'is_superuser', 'groups', 'user_permissions'
            )
        }),
        ('Emergency Contact', {
            'fields': ('emergency_contact_name', 'emergency_contact_phone'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('last_login', 'date_joined', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    add_fieldsets = (
        ('Authentication', {
            'classes': ('wide',),
            'fields': ('username', 'password1', 'password2'),
        }),
        ('Personal Information', {
            'classes': ('wide',),
            'fields': (
                'first_name', 'last_name', 'email', 
                'phone_number', 'date_of_birth', 'gender'
            ),
        }),
        ('Role & Permissions', {
            'classes': ('wide',),
            'fields': ('role', 'is_active', 'is_staff', 'is_superuser'),
        }),
    )
    
    def profile_picture_thumb(self, obj):
        """Display profile picture thumbnail"""
        if obj.profile_picture:
            return format_html(
                '<img src="{}" width="40" height="40" style="border-radius: 50%; object-fit: cover;" />',
                obj.profile_picture.url
            )
        return format_html(
            '<div style="width: 40px; height: 40px; border-radius: 50%; background: #ddd; '
            'display: flex; align-items: center; justify-content: center; color: #666;">{}</div>',
            obj.username[0].upper() if obj.username else '?'
        )
    profile_picture_thumb.short_description = 'Photo'
    
    def full_name(self, obj):
        """Display full name"""
        return obj.get_full_name() or '-'
    full_name.short_description = 'Full Name'
    
    def age(self, obj):
        """Display age"""
        return obj.age if obj.age else '-'
    age.short_description = 'Age'
    
    actions = ['activate_users', 'deactivate_users', 'make_staff', 'remove_staff']
    
    def activate_users(self, request, queryset):
        """Activate selected users"""
        updated = queryset.update(is_active=True)
        self.message_user(request, f'{updated} user(s) activated successfully.')
    activate_users.short_description = 'Activate selected users'
    
    def deactivate_users(self, request, queryset):
        """Deactivate selected users"""
        updated = queryset.update(is_active=False)
        self.message_user(request, f'{updated} user(s) deactivated successfully.')
    deactivate_users.short_description = 'Deactivate selected users'
    
    def make_staff(self, request, queryset):
        """Make selected users staff"""
        updated = queryset.update(is_staff=True)
        self.message_user(request, f'{updated} user(s) granted staff status.')
    make_staff.short_description = 'Grant staff status'
    
    def remove_staff(self, request, queryset):
        """Remove staff status from selected users"""
        updated = queryset.update(is_staff=False)
        self.message_user(request, f'{updated} user(s) staff status removed.')
    remove_staff.short_description = 'Remove staff status'


class SubjectInline(admin.TabularInline):
    """Inline for subjects taught by teacher"""
    model = TeacherProfile.subjects.through
    extra = 1
    verbose_name = 'Subject'
    verbose_name_plural = 'Subjects Taught'



class IsClassTeacherFilter(SimpleListFilter):
    """Custom filter for is_class_teacher property"""
    title = 'is class teacher'
    parameter_name = 'is_class_teacher'

    def lookups(self, request, model_admin):
        return (
            ('yes', 'Yes'),
            ('no', 'No'),
        )

    def queryset(self, request, queryset):
        if self.value() == 'yes':
            # Teachers who are form teachers of any class
            return queryset.filter(user__class_levels_taught__isnull=False).distinct()
        if self.value() == 'no':
            # Teachers who are not form teachers of any class
            return queryset.filter(user__class_levels_taught__isnull=True)
        return queryset
    

@admin.register(TeacherProfile)
class TeacherProfileAdmin(admin.ModelAdmin):
    """Admin for Teacher Profile"""
    
    list_display = (
        'employee_id', 'user_full_name', 'user_link',
        'employment_type', 'subjects_count', 
        IsClassTeacherFilter, 'class_teacher_of',
        'is_active', 'created_at'
    )
    list_filter = (
        'employment_type', IsClassTeacherFilter, 
        'is_active', 'created_at', 'subjects'
    )
    search_fields = (
        'employee_id', 'user__username', 
        'user__first_name', 'user__last_name', 
        'user__email'
    )
    readonly_fields = ('created_at', 'updated_at', 'total_students')
    ordering = ('-created_at',)
    
    fieldsets = (
        ('Teacher Information', {
            'fields': ('user', 'employee_id', 'employment_type')
        }),
        ('Subjects & Classes', {
            'fields': ('subjects', 'is_class_teacher', 'class_teacher_of')
        }),
        ('Status & Notes', {
            'fields': ('is_active', 'notes')
        }),
        ('Statistics', {
            'fields': ('total_students',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    filter_horizontal = ('subjects',)
    autocomplete_fields = ['user']
    
    inlines = []
    
    def user_full_name(self, obj):
        """Display teacher's full name"""
        return obj.user.get_full_name() or obj.user.username
    user_full_name.short_description = 'Teacher Name'
    user_full_name.admin_order_field = 'user__first_name'
    
    def user_link(self, obj):
        """Link to user detail"""
        url = reverse('admin:accounts_user_change', args=[obj.user.id])
        return format_html('<a href="{}">View User</a>', url)
    user_link.short_description = 'User Profile'
    
    def subjects_count(self, obj):
        """Count of subjects taught"""
        count = obj.subjects.count()
        if count > 0:
            return format_html(
                '<span style="background: #4CAF50; color: white; padding: 3px 8px; '
                'border-radius: 3px; font-size: 11px;">{} subject(s)</span>',
                count
            )
        return format_html(
            '<span style="background: #f44336; color: white; padding: 3px 8px; '
            'border-radius: 3px; font-size: 11px;">No subjects</span>'
        )
    subjects_count.short_description = 'Subjects'
    
    def get_queryset(self, request):
        """Optimize queryset with prefetch"""
        qs = super().get_queryset(request)
        return qs.select_related('user', 'class_teacher_of').prefetch_related('subjects')
    
    actions = ['activate_teachers', 'deactivate_teachers', 'make_class_teachers']
    
    def activate_teachers(self, request, queryset):
        """Activate selected teachers"""
        updated = queryset.update(is_active=True)
        self.message_user(request, f'{updated} teacher(s) activated successfully.')
    activate_teachers.short_description = 'Activate selected teachers'
    
    def deactivate_teachers(self, request, queryset):
        """Deactivate selected teachers"""
        updated = queryset.update(is_active=False)
        self.message_user(request, f'{updated} teacher(s) deactivated successfully.')
    deactivate_teachers.short_description = 'Deactivate selected teachers'
    
    def make_class_teachers(self, request, queryset):
        """Mark as class teachers"""
        updated = queryset.update(is_class_teacher=True)
        self.message_user(request, f'{updated} teacher(s) marked as class teachers.')
    make_class_teachers.short_description = 'Mark as class teachers'


    def is_class_teacher(self, obj):
        return obj.is_class_teacher
    is_class_teacher.boolean = True
    is_class_teacher.short_description = 'Class Teacher'


@admin.register(StudentProfile)
class StudentProfileAdmin(admin.ModelAdmin):
    """Admin for Student Profile"""
    
    list_display = (
        'student_id', 'user_full_name', 'user_link',
        'current_class', 'academic_year', 'age',
        'parent_full_name', 'is_active', 'created_at'
    )
    list_filter = (
        'current_class', 'academic_year', 
        'is_active', 'created_at', 
        'user__gender'
    )
    search_fields = (
        'student_id', 'user__username', 
        'user__first_name', 'user__last_name', 
        'user__email', 'parent_full_name', 
        'parent_email', 'parent_phone'
    )
    readonly_fields = ('created_at', 'updated_at', 'age', 'class_teacher')
    ordering = ('-created_at',)
    
    fieldsets = (
        ('Student Information', {
            'fields': ('user', 'student_id', 'current_class', 'academic_year')
        }),
        ('Parent/Guardian Information', {
            'fields': (
                'parent_full_name', 'parent_phone', 
                'parent_email', 'parent_address'
            )
        }),
        ('Emergency Contact', {
            'fields': ('emergency_contact_relation',),
            'classes': ('collapse',)
        }),
        ('Status & Notes', {
            'fields': ('is_active', 'notes')
        }),
        ('Additional Information', {
            'fields': ('age', 'class_teacher'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    autocomplete_fields = ['user']
    
    def user_full_name(self, obj):
        """Display student's full name"""
        name = obj.user.get_full_name() or obj.user.username
        if obj.user.profile_picture:
            return format_html(
                '<img src="{}" width="25" height="25" style="border-radius: 50%; '
                'object-fit: cover; margin-right: 5px; vertical-align: middle;" /> {}',
                obj.user.profile_picture.url, name
            )
        return name
    user_full_name.short_description = 'Student Name'
    user_full_name.admin_order_field = 'user__first_name'
    
    def user_link(self, obj):
        """Link to user detail"""
        url = reverse('admin:accounts_user_change', args=[obj.user.id])
        return format_html('<a href="{}">View User</a>', url)
    user_link.short_description = 'User Profile'
    
    def age(self, obj):
        """Display student age"""
        return obj.age if obj.age else '-'
    age.short_description = 'Age'
    
    def class_teacher(self, obj):
        """Display class teacher"""
        teacher = obj.class_teacher
        if teacher:
            return teacher.user.get_full_name() or teacher.user.username
        return '-'
    class_teacher.short_description = 'Class Teacher'
    
    def get_queryset(self, request):
        """Optimize queryset with prefetch"""
        qs = super().get_queryset(request)
        return qs.select_related('user', 'current_class').prefetch_related(
            'current_class__class_teacher'
        )
    
    actions = ['activate_students', 'deactivate_students', 'promote_students']
    
    def activate_students(self, request, queryset):
        """Activate selected students"""
        updated = queryset.update(is_active=True)
        self.message_user(request, f'{updated} student(s) activated successfully.')
    activate_students.short_description = 'Activate selected students'
    
    def deactivate_students(self, request, queryset):
        """Deactivate selected students"""
        updated = queryset.update(is_active=False)
        self.message_user(request, f'{updated} student(s) deactivated successfully.')
    deactivate_students.short_description = 'Deactivate selected students'
    
    def promote_students(self, request, queryset):
        """Placeholder for student promotion"""
        self.message_user(
            request, 
            'Student promotion feature - Please implement based on your class level structure.',
            level='warning'
        )
    promote_students.short_description = 'Promote selected students'


@admin.register(StaffProfile)
class StaffProfileAdmin(admin.ModelAdmin):
    """Admin for Staff Profile"""
    
    list_display = (
        'staff_id', 'user_full_name', 'user_link',
        'staff_type', 'user_email'
    )
    list_filter = ('staff_type',)
    search_fields = (
        'staff_id', 'user__username', 
        'user__first_name', 'user__last_name', 
        'user__email'
    )
    ordering = ('-id',)
    
    fieldsets = (
        ('Staff Information', {
            'fields': ('user', 'staff_id', 'staff_type')
        }),
    )
    
    autocomplete_fields = ['user']
    
    def user_full_name(self, obj):
        """Display staff member's full name"""
        return obj.user.get_full_name() or obj.user.username
    user_full_name.short_description = 'Staff Name'
    user_full_name.admin_order_field = 'user__first_name'
    
    def user_link(self, obj):
        """Link to user detail"""
        url = reverse('admin:accounts_user_change', args=[obj.user.id])
        return format_html('<a href="{}">View User</a>', url)
    user_link.short_description = 'User Profile'
    
    def user_email(self, obj):
        """Display user email"""
        return obj.user.email or '-'
    user_email.short_description = 'Email'
    user_email.admin_order_field = 'user__email'
    
    def get_queryset(self, request):
        """Optimize queryset"""
        qs = super().get_queryset(request)
        return qs.select_related('user')


admin.site.site_header = 'School Management System'
admin.site.site_title = 'School Admin'
admin.site.index_title = 'Administration Dashboard'