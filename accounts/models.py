from django.contrib.auth.models import AbstractUser
from django.db import models
import uuid
from django.core.validators import RegexValidator
from django.utils import timezone
from academics.models import Subject, ClassLevel, ClassStream


class User(AbstractUser):
    """
        Custom User model with Ghana-school roles.
        UUID is used as primary key.
    """
    ROLE_CHOICES = (
        ('admin', 'Admin'),
        ('proprietor', 'Proprietor'),
        ('headmaster', 'Headmaster/Headmistress'),
        ('assistant_head', 'Assistant Head'),
        ('manager', 'School Manager'),
        ('teacher', 'Teacher'),
        ('non_teaching', 'Non-Teaching Staff'),
        ('student', 'Student'),
        ('parent', 'Parent/Guardian'),
    )
    
    GENDER_CHOICES = (
        ('M', 'Male'),
        ('F', 'Female'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    
    phone_regex = RegexValidator(
        regex=r'^\+?1?\d{9,15}$',
        message="Phone number must be entered in the format: '+999999999'. Up to 15 digits allowed."
    )
    phone_number = models.CharField(validators=[phone_regex], max_length=17, blank=True, null=True)
    emergency_contact_name = models.CharField(max_length=100, blank=True, null=True)
    emergency_contact_phone = models.CharField(validators=[phone_regex], max_length=17, blank=True, null=True)
    
    date_of_birth = models.DateField(blank=True, null=True)
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES, blank=True, null=True)
    
    profile_picture = models.ImageField(upload_to='profile_pictures/', blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'auth_user'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['role']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"
    
    @property
    def full_name(self):
        """Return the full name of the user."""
        return self.get_full_name()
    
    @property
    def age(self):
        """Calculate age from date of birth."""
        if self.date_of_birth:
            today = timezone.now().date()
            return today.year - self.date_of_birth.year - (
                (today.month, today.day) < (self.date_of_birth.month, self.date_of_birth.day)
            )
        return None


class TeacherProfile(models.Model):
    """
        Profile for teachers with employee ID and subjects taught.
    """
    EMPLOYMENT_TYPE_CHOICES = (
        ('full_time', 'Full Time'),
        ('part_time', 'Part Time'),
        ('contract', 'Contract'),
        ('substitute', 'Substitute'),
    )

    user = models.OneToOneField(
        User, 
        on_delete=models.CASCADE, 
        related_name='teacher_profile',
        limit_choices_to={'role': 'teacher'}
    )
    employee_id = models.CharField(max_length=20, unique=True, db_index=True)
    subjects = models.ManyToManyField(Subject, related_name='teachers', blank=True)
    employment_type = models.CharField(max_length=20, choices=EMPLOYMENT_TYPE_CHOICES, default='full_time')
    class_teacher_of = models.ForeignKey(
        ClassLevel, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='class_teacher'
    )
    
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'teacher_profiles'
        verbose_name = 'Teacher Profile'
        verbose_name_plural = 'Teacher Profiles'
        indexes = [
            models.Index(fields=['employee_id']),
        ]

    def __str__(self):
        return f"{self.user.get_full_name()} - {self.employee_id}"
    
    @property
    def total_students(self):
        """Get total number of students taught by this teacher."""
        from django.db.models import Count
        return self.user.teacher_profile.subjects.aggregate(
            total_students=Count('classes__students', distinct=True)
        )['total_students'] or 0
    
    @property
    def is_class_teacher(self):
        """Check if teacher is a class teacher"""
        return self.user.class_levels_taught.exists()


class StudentProfile(models.Model):
    """
    Profile for students with student ID and class assignment.
    """
    BLOOD_GROUP_CHOICES = (
        ('A+', 'A+'),
        ('A-', 'A-'),
        ('B+', 'B+'),
        ('B-', 'B-'),
        ('AB+', 'AB+'),
        ('AB-', 'AB-'),
        ('O+', 'O+'),
        ('O-', 'O-'),
    )

    user = models.OneToOneField(
        User, 
        on_delete=models.CASCADE, 
        related_name='student_profile',
        limit_choices_to={'role': 'student'}
    )
    student_id = models.CharField(max_length=20, unique=True, db_index=True)
    current_class = models.ForeignKey(
        ClassLevel, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='students'
    )
    current_stream = models.ForeignKey(
        ClassStream,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='students'
    )
    academic_year = models.CharField(max_length=9, default='2024-2025')
    parent_full_name = models.CharField(max_length=100, blank=True, null=True)
    parent_phone = models.CharField(max_length=17, blank=True, null=True)
    parent_email = models.EmailField(blank=True, null=True)
    parent_address = models.TextField(blank=True, null=True)
    
    emergency_contact_relation = models.CharField(max_length=50, blank=True, null=True)
    
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'student_profiles'
        verbose_name = 'Student Profile'
        verbose_name_plural = 'Student Profiles'
        indexes = [
            models.Index(fields=['student_id']),
            models.Index(fields=['current_class']),
            models.Index(fields=['academic_year']),
        ]
        unique_together = ['student_id']

    def __str__(self):
        return f"{self.user.get_full_name()} - {self.student_id}"
    
    def get_average_score(self):
        """Calculate average score for this student"""
        from django.db.models import Avg
        avg = self.result_set.aggregate(Avg('score'))['score__avg']
        return round(avg, 1) if avg else None
    
    def get_recent_results(self, limit=5):
        """Get recent results for this student"""
        return self.result_set.select_related('subject', 'term', 'academic_year').order_by('-date_uploaded')[:limit]
    
    @property
    def class_teacher(self):
        """Get the class teacher for this student's class."""
        if self.current_class and hasattr(self.current_class, 'class_teacher'):
            return self.current_class.class_teacher
        return None
    
    @property
    def age(self):
        """Calculate student's age."""
        return self.user.age
    
    
    

class StaffProfile(models.Model):
    """
        Profile for add staff.
    """
    STAFF_TYPE_CHOICES = (
        ('administrative', 'Administrative'),
        ('leadership', 'Leadership'),
        ('finance', 'Finance'),
        ('support', 'Support'),
        ('other', 'Other'),
    )

    STAFF_ROLE_CHOICES = (
        ('proprietor', 'Proprietor/Proprietress'),
        ('headmaster', 'Headmaster/Headmistress'),
        ('assistant_head', 'Assistant Head'),
        ('manager', 'School Manager'),
        ('admin', 'Administrator'),
        ('accountant', 'Accountant'),
        ('secretary', 'Secretary'),
        ('librarian', 'Librarian'),
        ('security', 'Security'),
        ('cleaner', 'Cleaner'),
        ('cook', 'Cook'),
        ('driver', 'Driver'),
        ('other', 'Other'),
    )

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='staff_profile',
        limit_choices_to={'role__in': ['admin', 'proprietor', 'headmaster', 'assistant_head', 'manager', 'non_teaching']}
    )
    staff_id = models.CharField(max_length=20, unique=True)
    staff_type = models.CharField(max_length=20, choices=STAFF_TYPE_CHOICES)
    staff_role = models.CharField(max_length=30, choices=STAFF_ROLE_CHOICES, default='admin')
    department = models.CharField(max_length=80, blank=True, null=True)
    job_title = models.CharField(max_length=100, blank=True, null=True)
    
    class Meta:
        db_table = 'staff_profiles'
        verbose_name = 'Staff Profile'
        verbose_name_plural = 'Staff Profiles'

    def __str__(self):
        return f"{self.user.get_full_name()} - {self.staff_id}"


class ParentProfile(models.Model):
    """
    Parent/guardian portal profile. A parent can be linked to more than one student.
    """
    RELATIONSHIP_CHOICES = (
        ('father', 'Father'),
        ('mother', 'Mother'),
        ('guardian', 'Guardian'),
        ('other', 'Other'),
    )

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='parent_profile',
        limit_choices_to={'role': 'parent'}
    )
    parent_id = models.CharField(max_length=20, unique=True)
    relationship = models.CharField(max_length=20, choices=RELATIONSHIP_CHOICES, default='guardian')
    students = models.ManyToManyField(StudentProfile, related_name='parent_profiles', blank=True)
    occupation = models.CharField(max_length=100, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    is_primary_contact = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'parent_profiles'
        verbose_name = 'Parent Profile'
        verbose_name_plural = 'Parent Profiles'

    def __str__(self):
        return f"{self.user.get_full_name()} - {self.parent_id}"
