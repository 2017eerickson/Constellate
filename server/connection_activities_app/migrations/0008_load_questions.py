import json
import os

from django.db import migrations


def load_questions(apps, schema_editor):
    Question = apps.get_model('connection_activities_app', 'Question')
    fixture_path = os.path.join(
        os.path.dirname(os.path.dirname(__file__)),
        'fixtures',
        'questions.json',
    )
    with open(fixture_path) as f:
        questions = json.load(f)
    Question.objects.bulk_create([
        Question(label=q['label'], question_text=q['question_text'])
        for q in questions
    ])


def remove_questions(apps, schema_editor):
    Question = apps.get_model('connection_activities_app', 'Question')
    Question.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('connection_activities_app', '0007_question_answer'),
    ]

    operations = [
        migrations.RunPython(load_questions, remove_questions),
    ]
