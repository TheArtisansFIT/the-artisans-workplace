users_validator = {
    "bsonType": "object",
    "required": [
        "id",
        "email",
        "display_name",
        "hashed_password",
        "created_at",
    ],
    "properties": {
        "id": {
            "bsonType": "string"
        },
        "email": {
            "bsonType": "string",
            "maxLength": 255,
            "pattern": "^[^@]+@[^@]+\\.[^@]+$"
        },
        "display_name": {
            "bsonType": "string",
            "minLength": 2,
            "maxLength": 100
        },
        "hashed_password": {
            "bsonType": "string",
            "maxLength": 255
        },
        "bank_name": {
            "bsonType": "string",
            "maxLength": 100
        },
        "account_number": {
            "bsonType": "string",
            "maxLength": 50
        },
        "account_holder": {
            "bsonType": "string",
            "maxLength": 100
        },
        "created_at": {
            "bsonType": "date"
        }
    }
}


groups_validator = {
    "bsonType": "object",
    "required": [
        "id",
        "creator_id",
        "display_name",
        "max_member",
        "created_at"
    ],
    "properties": {
        "id": {
            "bsonType": "string"
        },
        "creator_id": {
            "bsonType": "string"
        },
        "display_name": {
            "bsonType": "string",
            "maxLength": 100
        },
        "description": {
            "bsonType": "string",
            "maxLength": 200
        },
        "max_member": {
            "bsonType": "int",
            "minimum": 2
        },
        "created_at": {
            "bsonType": "date"
        }
    }
}


group_invitations_validator = {
    "bsonType": "object",
    "required": [
        "id",
        "join_code",
        "group_id",
        "duration",
        "created_at"
    ],
    "properties": {
        "id": {
            "bsonType": "string"
        },
        "join_code": {
            "bsonType": "string",
            "maxLength": 15
        },
        "group_id": {
            "bsonType": "string"
        },
        "duration": {
            "bsonType": "int",
            "minimum": 1
        },
        "created_at": {
            "bsonType": "date"
        }
    }
}


group_memberships_validator = {
    "bsonType": "object",
    "required": [
        "id",
        "group_id",
        "user_id",
        "role",
        "status",
        "created_at"
    ],
    "properties": {
        "id": {
            "bsonType": "string"
        },
        "group_id": {
            "bsonType": "string"
        },
        "user_id": {
            "bsonType": "string"
        },
        "role": {
            "bsonType": "string",
            "enum": ["Organizer", "Member"]
        },
        "status": {
            "bsonType": "string",
            "enum": ["Active", "Left", "Removed"]
        },
        "created_at": {
            "bsonType": "date"
        }
    }
}


expenses_validator = {
    "bsonType": "object",
    "required": [
        "description",
        "total_amount",
        "created_at",
        "creator_id",
        "creditor_id",
        "group_id",
    ],
    "properties": {
        "id": {
            "bsonType": "string"
        },
        "group_id": {
            "bsonType": "string"
        },
        "description": {
            "bsonType": "string",
            "maxLength": 120
        },
        "total_amount": {
            "bsonType": "long",
            "minimum": 1
        },
        "date": {
            "bsonType": "string",
            "pattern": "^\\d{4}-\\d{2}-\\d{2}$"
        },
        "creditor_id": {
            "bsonType": "string"
        },
        "participant_ids": {
            "bsonType": "array",
            "items": {
                "bsonType": "string"
            },
            "minItems": 1
        },
        "creator_id": {
            "bsonType": "string"
        },
        "created_at": {
            "bsonType": "date"
        },
        "locked": {
            "bsonType": "bool"
        }
    }
}


repayment_obligations_validator = {
    "bsonType": "object",
    "required": [
        "id",
        "expense_id",
        "debtor_id",
        "creditor_id",
        "amount",
        "status",
        "created_at",
    ],
    "properties": {
        "id": {
            "bsonType": "string"
        },
        "expense_id": {
            "bsonType": "string"
        },
        "debtor_id": {
            "bsonType": "string"
        },
        "creditor_id": {
            "bsonType": "string"
        },
        "amount": {
            "bsonType": "int",
            "minimum": 1
        },
        "status": {
            "bsonType": "string",
            "enum": ["unpaid", "pending", "paid"]
        },
        "created_at": {
            "bsonType": "date"
        }
    }
}
