# Re-running this file creates missing collections and indexes,
# and refreshes validators on existing collections.

from pymongo.errors import CollectionInvalid, OperationFailure

from connection import db, ping_server
import collection


def create_collection(name, validator):
    schema = {"$jsonSchema": validator}

    try:
        db.create_collection(name, validator=schema)

    except CollectionInvalid:
        try:
            db.command("collMod", name, validator=schema)

        except OperationFailure as exc:
            raise RuntimeError(
                f"Could not update the validator for collection '{name}'. "
                "Existing documents may violate the new schema. "
                "Check existing documents before updating the validator."
            ) from exc


def ensure_index(collection, keys, *, name, **options):
    wanted = keys if isinstance(keys, list) else [(keys, 1)]

    for existing_name, spec in collection.index_information().items():
        if existing_name in {"_id_", name}:
            continue

        if spec.get("key") == wanted:
            collection.drop_index(existing_name)

    try:
        collection.create_index(keys, name=name, **options)

    except OperationFailure as exc:
        if getattr(exc, "code", None) not in {85, 86}:
            raise

        collection.drop_index(name)
        collection.create_index(keys, name=name, **options)


if __name__ == "__main__":
    ping_server()

    # Create collections and apply validators.
    for name, value in vars(collection).items():
        if name.endswith("_validator"):
            cname = name.removesuffix("_validator")
            create_collection(cname, value)

    # Users
    db.users.create_index("id", unique=True)
    db.users.create_index("email", unique=True)

    # Groups
    db.groups.create_index("creator_id")

    # Group invitations
    db.group_invitations.create_index("join_code", unique=True)
    db.group_invitations.create_index("group_id")

    # Group memberships
    ensure_index(
        db.group_memberships,
        [("group_id", 1), ("user_id", 1)],
        name="uniq_active_membership",
        unique=True,
        partialFilterExpression={"status": "Active"},
    )

    db.group_memberships.create_index("user_id")

    # Expenses
    db.expenses.create_index([
        ("group_id", 1),
        ("created_at", 1)
    ])

    db.expenses.create_index("creator_id")

    # Repayment obligations
    db.repayment_obligations.create_index(
        [("expense_id", 1), ("debtor_id", 1)],
        unique=True
    )

    db.repayment_obligations.create_index([
        ("debtor_id", 1),
        ("status", 1)
    ])

    # Repayment reports
    db.repayment_reports.create_index([
        ("expense_id", 1),
        ("debtor_id", 1),
        ("created_at", 1)
    ], unique=True)

    db.repayment_reports.create_index([
        ("debtor_id", 1),
        ("created_at", -1)
    ])

    print("Database initialization completed successfully.")
