from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
import uuid


class SchoolDivision(models.Model):
    """
    A Ghana basic-school division such as Early Years, Primary, or JHS.
    """
    name = models.CharField(max_length=80, unique=True)
    code = models.CharField(max_length=40, unique=True)
    description = models.TextField(blank=True, null=True)
    display_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'school_divisions'
        ordering = ['display_order', 'name']

    def __str__(self):
        return f"{self.name} ({self.code})"


class AcademicYear(models.Model):
    """
        Represents an academic year (e.g., 2024-2025)
    """
    name = models.CharField(max_length=20, unique=True)
    start_date = models.DateField()
    end_date = models.DateField()
    is_current = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'academic_years'
        verbose_name = 'Academic Year'
        verbose_name_plural = 'Academic Years'
        ordering = ['-start_date']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if self.is_current:
            AcademicYear.objects.filter(is_current=True).update(is_current=False)
        super().save(*args, **kwargs)


class Subject(models.Model):
    """
        Subject model — a teacher can teach multiple subjects
    """
    SUBJECT_CATEGORY_CHOICES = (
        ('core', 'Core Subject'),
        ('elective', 'Elective Subject'),
    )
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, unique=True)
    description = models.TextField(blank=True, null=True)
    category = models.CharField(max_length=20, choices=SUBJECT_CATEGORY_CHOICES, default='core')
    is_active = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'subjects'
        verbose_name = 'Subject'
        verbose_name_plural = 'Subjects'
        ordering = ['name']
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['category']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return f"{self.name} ({self.code})"
    
    @property
    def enrolled_students_count(self):
        """Get number of students enrolled in this subject"""
        return self.enrollments.filter(is_active=True).count()


class ClassLevel(models.Model):
    """
        Class/Level model — example: JHS 1, SHS 2, etc.
    """

    name = models.CharField(max_length=50, unique=True)
    code = models.CharField(max_length=40, unique=True, null=True, blank=True)
    division = models.ForeignKey(
        SchoolDivision,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='class_levels'
    )
    division_name = models.CharField(max_length=80, blank=True, null=True)
    division_code = models.CharField(max_length=40, blank=True, null=True)
    academic_year_badge = models.CharField(max_length=20, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    capacity = models.PositiveIntegerField(default=30)
    display_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    
    form_teacher = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="class_levels_taught",
        limit_choices_to={'role': 'teacher'}
    )
    
    subjects = models.ManyToManyField(Subject, through='ClassSubject', related_name='class_levels')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'class_levels'
        verbose_name = 'Class Level'
        verbose_name_plural = 'Class Levels'
        ordering = ['display_order', 'name']
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return self.name
    
    @property
    def current_students_count(self):
        """Get number of students currently in this class"""
        return self.students.filter(is_active=True).count()
    
    @property
    def available_seats(self):
        """Calculate available seats in the class"""
        return self.capacity - self.current_students_count


class ClassStream(models.Model):
    """
    A stream/room under a class level, for example Basic 1 A or JHS 2 B.
    """
    class_level = models.ForeignKey(ClassLevel, on_delete=models.CASCADE, related_name='streams')
    name = models.CharField(max_length=30)
    code = models.CharField(max_length=50, unique=True)
    capacity = models.PositiveIntegerField(default=30)
    form_teacher = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='class_streams_taught',
        limit_choices_to={'role': 'teacher'}
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'class_streams'
        unique_together = ['class_level', 'name']
        ordering = ['class_level__display_order', 'name']

    def __str__(self):
        return f"{self.class_level.name} {self.name}"

    @property
    def students_count(self):
        return self.students.filter(is_active=True).count()


class ClassSubject(models.Model):
    """
        Through model for ClassLevel and Subject relationship with additional details
    """
    class_level = models.ForeignKey(ClassLevel, on_delete=models.CASCADE)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE)
    teacher = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        limit_choices_to={'role': 'teacher'},
        related_name='assigned_class_subjects'
    )
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE)
    
    class Meta:
        db_table = 'class_subjects'
        verbose_name = 'Class Subject'
        verbose_name_plural = 'Class Subjects'
        unique_together = ['class_level', 'subject', 'academic_year']
        indexes = [
            models.Index(fields=['class_level', 'academic_year']),
        ]

    def __str__(self):
        return f"{self.class_level.name} - {self.subject.name}"


class Term(models.Model):
    """
        Academic term within an academic year
    """
    name = models.CharField(max_length=50)
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE, related_name='terms', null=True, blank=True)
    start_date = models.DateField()
    end_date = models.DateField()
    vacation_start_date = models.DateField(null=True, blank=True)
    vacation_end_date = models.DateField(null=True, blank=True)
    half_term_start_date = models.DateField(null=True, blank=True)
    half_term_end_date = models.DateField(null=True, blank=True)
    holidays = models.TextField(blank=True, null=True)
    school_activities = models.TextField(blank=True, null=True)
    is_current = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'terms'
        verbose_name = 'Term'
        verbose_name_plural = 'Terms'
        unique_together = ['name', 'academic_year']
        ordering = ['academic_year', 'start_date']

    def __str__(self):
        return f"{self.name} - {self.academic_year.name}"


class Result(models.Model):
    """
        Result model — teacher uploads, student views
        Extended to include class score and exam score.
    """
    
    TERM_CHOICES = [
        ("1st", "First Term"),
        ("2nd", "Second Term"),
        ("3rd", "Third Term")
    ]
    
    GRADE_CHOICES = [
        ("A+", "A+ (90-100)"),
        ("A", "A (80-89)"),
        ("B+", "B+ (75-79)"),
        ("B", "B (70-74)"),
        ("C+", "C+ (65-69)"),
        ("C", "C (60-64)"),
        ("D+", "D+ (55-59)"),
        ("D", "D (50-54)"),
        ("E", "E (35-49)"),
        ("F", "F (0-34)"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name="results",
        limit_choices_to={'role': 'student'}
    )
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='results' )
    class_level = models.ForeignKey(ClassLevel, on_delete=models.CASCADE)
    term = models.ForeignKey(Term, on_delete=models.CASCADE)
    
    class_score = models.DecimalField(
        max_digits=5, decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        default=0,
        help_text="Continuous Assessment score (e.g., 30%)"
    )
    exam_score = models.DecimalField(
        max_digits=5, decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        default=0,
        help_text="Exam score (e.g., 70%)"
    )

    score = models.DecimalField(
        max_digits=5, decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Total score (class + exam)",
        blank=True, null=True
    )

    grade = models.CharField(max_length=2, choices=GRADE_CHOICES, blank=True)
    grade_point = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)
    remarks = models.TextField(blank=True, null=True)
    use_system_calculation = models.BooleanField(default=True)

    is_published = models.BooleanField(default=False)
    published_date = models.DateTimeField(blank=True, null=True)
    uploaded_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name="uploaded_results",
        limit_choices_to={'role': 'teacher'}
    )
    
    date_uploaded = models.DateTimeField(auto_now_add=True)
    last_modified = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'results'
        verbose_name = 'Result'
        verbose_name_plural = 'Results'
        unique_together = ['student', 'subject', 'term', ]
        indexes = [
            models.Index(fields=['student', 'term']),
            models.Index(fields=['subject', 'term']),
            models.Index(fields=['is_published']),
        ]
        ordering = ['student', 'subject',]

    def __str__(self):
        return f"{self.student.get_full_name()} - {self.subject.name} ({self.term}) - {self.score}%"

    def calculate_grade(self):
        """Calculate grade based on total score"""
        if self.score >= 90:
            return "A+", 4.0
        elif self.score >= 80:
            return "A", 4.0
        elif self.score >= 75:
            return "B+", 3.5
        elif self.score >= 70:
            return "B", 3.0
        elif self.score >= 65:
            return "C+", 2.5
        elif self.score >= 60:
            return "C", 2.0
        elif self.score >= 55:
            return "D+", 1.5
        elif self.score >= 50:
            return "D", 1.0
        elif self.score >= 35:
            return "E", 0.5
        else:
            return "F", 0.0

    def save(self, *args, **kwargs):
    # Only calculate score if system calculation is selected
        if self.use_system_calculation:
            if self.class_score is not None and self.exam_score is not None:
                self.score = self.class_score + self.exam_score

        # Calculate grade and grade point
        if self.score is not None:
            self.grade, self.grade_point = self.calculate_grade()
                
        if self.is_published and not self.published_date:
            self.published_date = timezone.now()
                
        super().save(*args, **kwargs)

