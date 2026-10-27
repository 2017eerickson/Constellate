from django.db import migrations


def combine_stardust(apps, schema_editor):
    Stardust = apps.get_model('gamification_app', 'Stardust')

    partnership_ids = (
        Stardust.objects.values_list('partnership_id', flat=True).distinct()
    )

    for pid in partnership_ids:
        rows = Stardust.objects.filter(partnership_id=pid)
        combined_total = sum(row.total for row in rows)

        keeper = rows.first()
        keeper.total = combined_total
        keeper.user = None
        keeper.save()

        rows.exclude(pk=keeper.pk).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('gamification_app', '0004_make_stardust_user_nullable'),
    ]

    operations = [
        migrations.RunPython(combine_stardust, migrations.RunPython.noop),
    ]
