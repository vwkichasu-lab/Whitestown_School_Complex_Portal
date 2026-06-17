from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('academics', '0008_classlevel_division_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='term',
            name='vacation_start_date',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='term',
            name='vacation_end_date',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='term',
            name='half_term_start_date',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='term',
            name='half_term_end_date',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='term',
            name='holidays',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='term',
            name='school_activities',
            field=models.TextField(blank=True, null=True),
        ),
    ]
