# Generated by Django 5.0.10 on 2025-02-17 09:00

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("zerver", "0672_fix_attachment_realm"),
    ]

    operations = [
        migrations.AddField(
            model_name="stream",
            name="can_subscribe_group",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.RESTRICT,
                related_name="+",
                to="zerver.usergroup",
            ),
        ),
    ]
