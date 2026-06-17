from collections import defaultdict

from django.core.cache import cache
from django.db.models import Count
from django.shortcuts import render
from django.utils import timezone
from django.utils.timesince import timesince

from accounts.models import StudentProfile, User
from academics.models import ClassSubject, Result


def home_page(request):
    return render(request, "Index.html")


def contact_page(request):
    return render(request, "contact.html")


def get_recent_activities(limit=10):
    """Build a recent activity feed dynamically."""
    cache_key = f"recent_activities_{limit}"
    cached = cache.get(cache_key)
    if cached:
        return cached

    activities = []

    for result in Result.objects.select_related("student", "subject", "class_level").order_by("-date_uploaded")[:5]:
        activities.append({
            "type": "result_upload",
            "title": "Results uploaded",
            "details": f"{result.subject.name} - {result.class_level.name}",
            "time": timesince(result.date_uploaded, timezone.now()) + " ago",
            "icon": "results",
            "color": "#dbeafe",
        })

    for student in StudentProfile.objects.select_related("current_class", "user").order_by("-created_at")[:5]:
        activities.append({
            "type": "student_enrollment",
            "title": "New student enrolled",
            "details": f"{student.user.get_full_name()} - {student.current_class.name if student.current_class else 'N/A'}",
            "time": timesince(student.created_at, timezone.now()) + " ago",
            "icon": "student",
            "color": "#d1fae5",
        })

    for assignment in ClassSubject.objects.select_related("class_level", "teacher", "subject").order_by("-id")[:5]:
        if assignment.teacher:
            activities.append({
                "type": "teacher_assignment",
                "title": "Teacher assigned",
                "details": f"{assignment.teacher.get_full_name()} to {assignment.subject.name} ({assignment.class_level.name})",
                "time": "recently",
                "icon": "teacher",
                "color": "#ede9fe",
            })

    activities_sorted = sorted(activities, key=lambda item: item["time"], reverse=False)[:limit]
    cache.set(cache_key, activities_sorted, 60)
    return activities_sorted


def get_teacher_workload():
    """Get teacher workload data for the admin dashboard."""
    workload = list(
        User.objects.filter(role="teacher", is_active=True)
        .annotate(
            total_assignments=Count("assigned_class_subjects", distinct=True),
            total_subjects=Count("assigned_class_subjects__subject", distinct=True),
            total_classes=Count("assigned_class_subjects__class_level", distinct=True),
        )
        .filter(total_assignments__gt=0)
        .values("id", "first_name", "last_name", "total_assignments", "total_subjects", "total_classes")
        .order_by("-total_assignments")[:6]
    )

    if workload:
        return workload

    assignment_data = defaultdict(lambda: {
        "id": None,
        "first_name": "",
        "last_name": "",
        "total_assignments": 0,
        "total_subjects": set(),
        "total_classes": set(),
    })

    for assignment in ClassSubject.objects.filter(
        teacher__isnull=False,
        teacher__is_active=True,
    ).select_related("teacher", "subject", "class_level"):
        teacher_id = assignment.teacher.id
        assignment_data[teacher_id]["id"] = teacher_id
        assignment_data[teacher_id]["first_name"] = assignment.teacher.first_name
        assignment_data[teacher_id]["last_name"] = assignment.teacher.last_name
        assignment_data[teacher_id]["total_assignments"] += 1
        assignment_data[teacher_id]["total_subjects"].add(assignment.subject.id)
        assignment_data[teacher_id]["total_classes"].add(assignment.class_level.id)

    result = []
    for data in assignment_data.values():
        result.append({
            "id": data["id"],
            "first_name": data["first_name"],
            "last_name": data["last_name"],
            "total_assignments": data["total_assignments"],
            "total_subjects": len(data["total_subjects"]),
            "total_classes": len(data["total_classes"]),
        })

    return sorted(result, key=lambda item: item["total_assignments"], reverse=True)[:6]
