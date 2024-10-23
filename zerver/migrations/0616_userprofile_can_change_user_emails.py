# Generated by Django 5.0.8 on 2024-09-02 20:36

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("zerver", "0615_system_bot_avatars"),
    ]

    operations = [
        migrations.AddField(
            model_name="userprofile",
            name="can_change_user_emails",
            field=models.BooleanField(db_index=True, default=False),
        ),
    ]