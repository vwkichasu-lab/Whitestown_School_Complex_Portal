from accounts.models import TeacherProfile, StudentProfile, StaffProfile
import random
from django.db import transaction
from django.db.models import Max
import time


def generate_staff_id():
    """
        Generate unique Admin ID in the format: NSA-AD-XXXXXX (6 random digits)
    """

    max_attempts = 100
    for _ in range(max_attempts):
        # Generate random number between 100000 and 999999 (6 digits)
        random_number = random.randint(100000, 999999)
        new_id = f"NSA-AD-{random_number}"
        
        # Check if ID already exists
        if not StaffProfile.objects.filter(staff_id=new_id).exists():
            return new_id
    
    # If we can't find a unique ID after max attempts, use a different approach
    existing_ids = set(StaffProfile.objects.values_list('staff_id', flat=True))
    for number in range(100000, 1000000):
        new_id = f"NSA-AD-{number}"
        if new_id not in existing_ids:
            return new_id
    
    # This should never happen unless you have 900,000+ admins
    raise Exception("Cannot generate unique staff ID")


def generate_teacher_id():
    """
        Generate unique Teacher ID in the format: NSA-TCH-XXXXXX (6 random digits)
    """

    max_attempts = 100
    for _ in range(max_attempts):
        random_number = random.randint(100000, 999999)
        new_id = f"NSA-TCH-{random_number}"
        
        if not TeacherProfile.objects.filter(employee_id=new_id).exists():
            return new_id
    
    existing_ids = set(TeacherProfile.objects.values_list('employee_id', flat=True))
    for number in range(100000, 1000000):
        new_id = f"NSA-TCH-{number}"
        if new_id not in existing_ids:
            return new_id
    
    raise Exception("Cannot generate unique teacher ID")




def generate_student_id():
    """
        Generate unique Student ID in the format: NSA-STU-XXXXXX (6 digits)
        Uses sequential numbering with random fallback for guaranteed uniqueness
    """
    # First try: sequential numbering from the last used ID
    with transaction.atomic():
        try:
            # Get the highest student ID currently in the database
            last_id = StudentProfile.objects.aggregate(
                max_id=Max('student_id')
            )['max_id']
            
            if last_id:
                # Extract the number part from the last ID and increment
                last_num = int(last_id.split('-')[-1])
                next_num = last_num + 1
            else:
                # If no students exist yet, start from 100000
                next_num = 100000
            
            # Make sure we don't exceed 6 digits
            if next_num > 999999:
                next_num = 100000  # Reset if we reach the limit
                
            new_id = f"NSA-STU-{next_num:06d}"
            
            # Double check this ID doesn't already exist
            if not StudentProfile.objects.filter(student_id=new_id).exists():
                return new_id
        except (ValueError, IndexError):
            # If parsing fails for any reason, move to random generation
            pass
    
    # Second try: random number generation
    attempts = 0
    while attempts < 1000:
        # Generate a random 6-digit number
        random_num = random.randint(100000, 999999)
        new_id = f"NSA-STU-{random_num:06d}"
        
        # Check if this random ID is available
        if not StudentProfile.objects.filter(student_id=new_id).exists():
            return new_id
        
        attempts += 1
        # Add small delay every 100 attempts to avoid tight loops
        if attempts % 100 == 0:
            time.sleep(0.01)
    
    # Third try: use timestamp as base with offsets
    timestamp_id = int(time.time()) % 1000000
    for offset in range(1000):
        attempt_id = (timestamp_id + offset) % 1000000
        # Ensure it's always 6 digits
        if attempt_id < 100000:
            attempt_id += 100000
        new_id = f"NSA-STU-{attempt_id:06d}"
        if not StudentProfile.objects.filter(student_id=new_id).exists():
            return new_id
    
    # If all methods fail, raise an error
    raise Exception("Cannot generate unique student ID - system overloaded")