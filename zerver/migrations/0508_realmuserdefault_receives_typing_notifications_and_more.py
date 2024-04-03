# Generated by Django 4.2.12 on 2024-04-16 14:06

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("zerver", "0507_rework_realm_upload_quota_gb"),
    ]

    operations = [
        migrations.AddField(
            model_name="realmuserdefault",
            name="receives_typing_notifications",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="userprofile",
            name="receives_typing_notifications",
            field=models.BooleanField(default=True),
        ),
    ]