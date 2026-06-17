from django.shortcuts import redirect

def redirect_to_dashboard(user):
    """Helper function to redirect users based on role"""
    if user.role in ['admin', 'proprietor', 'headmaster', 'assistant_head', 'manager', 'non_teaching']:
        return redirect('admin_dashboard')
    elif user.role == 'teacher':
        return redirect('teacher_dashboard')
    elif user.role == 'student':
        return redirect('student_dashboard')
    elif user.role == 'parent':
        return redirect('parent_dashboard')
    else:
        # Fallback for unknown roles
        return redirect('home')
