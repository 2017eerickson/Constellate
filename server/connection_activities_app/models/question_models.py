from django.conf import settings
from django.db import models


class Question(models.Model):
    label = models.CharField(max_length=50)
    question_text = models.TextField()

    def __str__(self):
        return f"[{self.label}] {self.question_text}"


class Answer(models.Model):
    partnership = models.ForeignKey(
        'relationship_app.Partnership',
        on_delete=models.CASCADE,
        related_name='answers',
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='answers',
    )
    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE,
        related_name='answers',
    )
    answer_text = models.TextField()
    is_unread = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
