import json
import os

from django.db import migrations, models


def load_self_love_questions(apps, schema_editor):
    Question = apps.get_model('connection_activities_app', 'Question')
    fixture_path = os.path.join(
        os.path.dirname(os.path.dirname(__file__)),
        'fixtures',
        'self_love_questions.json',
    )
    with open(fixture_path) as f:
        questions = json.load(f)
    Question.objects.bulk_create([
        Question(
            label=q['label'],
            question_text=q['question_text'],
            is_soulmate=True,
        )
        for q in questions
    ])


def remove_self_love_questions(apps, schema_editor):
    Question = apps.get_model('connection_activities_app', 'Question')
    Question.objects.filter(is_soulmate=True).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('connection_activities_app', '0009_alter_answer_unique_together_partnershipquestion'),
    ]

    operations = [
        migrations.AddField(
            model_name='question',
            name='is_soulmate',
            field=models.BooleanField(default=False),
        ),
        migrations.RunPython(load_self_love_questions, remove_self_love_questions),
    ]
