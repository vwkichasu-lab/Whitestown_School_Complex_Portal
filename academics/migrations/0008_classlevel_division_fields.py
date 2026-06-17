from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('academics', '0007_alter_term_academic_year'),
    ]

    operations = [
        migrations.AlterField(
            model_name='classlevel',
            name='code',
            field=models.CharField(blank=True, max_length=40, null=True, unique=True),
        ),
        migrations.AddField(
            model_name='classlevel',
            name='division_name',
            field=models.CharField(blank=True, max_length=80, null=True),
        ),
        migrations.AddField(
            model_name='classlevel',
            name='division_code',
            field=models.CharField(blank=True, max_length=40, null=True),
        ),
        migrations.AddField(
            model_name='classlevel',
            name='academic_year_badge',
            field=models.CharField(blank=True, max_length=20, null=True),
        ),
    ]
