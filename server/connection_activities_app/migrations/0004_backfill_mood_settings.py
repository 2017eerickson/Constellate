from django.db import migrations


def backfill(apps, schema_editor):
    Partnership = apps.get_model('relationship_app', 'Partnership')
    MoodSetting = apps.get_model('connection_activities_app', 'MoodSetting')

    for p in Partnership.objects.all():
        if not MoodSetting.objects.filter(user=p.initiator, partnership=p).exists():
            MoodSetting.objects.create(user=p.initiator, partnership=p)
        if p.initiator != p.partner:
            if not MoodSetting.objects.filter(user=p.partner, partnership=p).exists():
                MoodSetting.objects.create(user=p.partner, partnership=p)


class Migration(migrations.Migration):

    dependencies = [
        ('connection_activities_app', '0003_affectionsending'),
        ('relationship_app', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(backfill, migrations.RunPython.noop),
    ]
