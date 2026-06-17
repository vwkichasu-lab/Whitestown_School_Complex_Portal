# Whitestown School Complex Portal

## Overview

Whitestown School Complex Portal is a Django-based school management system for administering a Ghana basic school environment. It supports school leadership, administrators, teachers, students, parents, class setup, subjects, teacher assignments, academic terms, and results management.

The system is built around the way a Ghana basic school is organized:

- Early Years / Kindergarten
- Primary
- Junior High School
- Class streams or arms such as Basic 1 A, Basic 1 B, JHS 2 A
- Class subjects and teacher handling assignments
- Academic calendar terms, vacations, holidays, and school activities

## Core Features

### Admin Dashboard

- School overview cards for students, teachers, classes, subjects, staff, parents, and results
- Academic calendar status and current term progress
- Setup health alerts for missing classes, subjects, form teachers, and class assignments
- Class capacity overview
- Teacher workload overview
- Recent school activity
- Quick links to key admin workflows

### Classes, Subjects, and Teachers

- Create class streams
- Add and manage subjects
- Assign form teachers
- Assign subject teachers to classes
- Track who handles each subject

### Users and Roles

- Proprietor / Proprietress
- Headmaster / Headmistress
- Assistant Head
- School Manager
- Administrator
- Teacher
- Non-teaching staff
- Student
- Parent / Guardian

### Academic Management

- Academic years
- Terms
- GES-style calendar fields
- Result upload and management
- Student performance tracking

## Technology Stack

- Backend: Django
- Frontend: Django Templates, HTML, CSS, JavaScript
- Database: SQLite by default
- Authentication: Django authentication with role-based access

## Installation

```bash
git clone https://github.com/vwkichasu-lab/Whitestown_School_Complex_Portal.git
cd Whitestown_School_Complex_Portal
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Open:

```text
http://127.0.0.1:8000/
```

## Repository

```text
https://github.com/vwkichasu-lab/Whitestown_School_Complex_Portal
```

## License

All rights reserved. Copyright 2026.
