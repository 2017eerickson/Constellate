import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('gamification_app', '0005_consolidate_stardust'),
        ('relationship_app', '0006_alter_specialdate_options'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='stardust',
            name='user',
        ),
        migrations.AlterField(
            model_name='stardust',
            name='partnership',
            field=models.OneToOneField(
                on_delete=django.db.models.deletion.CASCADE,
                related_name='stardust',
                to='relationship_app.partnership',
            ),
        ),
    ]
