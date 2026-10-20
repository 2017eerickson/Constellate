from django.db import migrations


def backfill(apps, schema_editor):
    Partnership = apps.get_model('relationship_app', 'Partnership')
    Stardust = apps.get_model('gamification_app', 'Stardust')
    Streak = apps.get_model('gamification_app', 'Streak')

    for p in Partnership.objects.all():
        Stardust.objects.get_or_create(partnership=p)
        Streak.objects.get_or_create(partnership=p)


class Migration(migrations.Migration):

    dependencies = [
        ('gamification_app', '0006_remove_stardust_user_and_onetoone'),
        ('relationship_app', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(backfill, migrations.RunPython.noop),
    ]
