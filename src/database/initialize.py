# do not run this file if the database already has all the models
# it would not result in anything, just a waste of time :d

from pymongo.errors import CollectionInvalid
from dotenv import load_dotenv

load_dotenv()

from connection import db, ping_server
import collection

def create_collection(name, validator):
    try:
        db.create_collection(
            name, 
            validator={ "$jsonSchema": validator },
        )
    except CollectionInvalid:
        pass

if __name__ == "__main__":
    ping_server()

    for name, value in vars(collection).items():
        if name.endswith("_validator"):
            cname = name.removesuffix("_validator")
            create_collection(cname, value)

    db.users.create_index("email", unique=True)

    db.groups.create_index("creator_id")
   
    db.group_invitations.create_index("join_code", unique=True)
   
    db.group_memberships.create_index([("group_id", 1), ("user_id", 1)], unique=True)
    db.group_memberships.create_index("user_id")

    db.expenses.create_index([("group_id", 1), ("created_at", 1)])
    db.expenses.create_index("creator_id")

    db.repayment_obligations.create_index([("expense_id", 1), ("debtor_id", 1)], unique=True)
    db.repayment_obligations.create_index([("debtor_id", 1), ("status", 1)])

    db.repayment_reports.create_index([("expense_id", 1), ("debtor_id", 1), ("created_at", 1)], unique=True)
    db.repayment_reports.create_index([("debtor_id", 1), ("created_at", -1)])