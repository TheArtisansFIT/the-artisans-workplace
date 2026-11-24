users_validator = {
    "bsonType": "object",
    "required": ["email", "display_name", "hashed_password", "created_at"],
    "properties": {
        "email": {
            "bsonType": "string",
            "maxLength": 255,
            "pattern": "^[^@]+@[^@]+\\.[^@]+$"
        },
        "display_name": {
            "bsonType": "string",
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
    "required": ["creator_id", "display_name", "max_member", "created_at"],
    "properties": {
        "creator_id": {
            "bsonType": "string",
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
    "required": ["join_code", "group_id", "duration", "created_at"],
    "properties": {
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
    "required": ["group_id", "user_id", "role", "status", "created_at"],
    "properties": {
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
    "required": ["description", "total_amount", "created_at", "creator_id", "creditor_id", "group_id"],
    "properties": {
        "description": {
            "bsonType": "string",
            "maxLength": 255
        },
        "total_amount": {
            "bsonType": "long",
            "minimum": 1
        },
        "created_at": {
            "bsonType": "date"
        },
        "creator_id": {
            "bsonType": "string"
        },
        "creditor_id": {
            "bsonType": "string"
        },
        "group_id": {
            "bsonType": "string"
        }
    }
}

repayment_obligations_validator = {
    "bsonType": "object",
    "required": ["expense_id", "debtor_id", "share_amount", "status"],
    "properties": {
        "expense_id": {
            "bsonType": "string"
        },
        "debtor_id": {
            "bsonType": "string"
        },
        "share_amount": {
            "bsonType": "long",
            "minimum": 1
        },
        "status": {
            "bsonType": "string",
            "maxLength": 30,
            "enum": ["Outstanding", "Pending Confirmation", "Confirmed"]
        }
    }
}

repayment_reports_validator = {
    "bsonType": "object",
    "required": ["expense_id", "debtor_id", "created_at", "status"],
    "properties": {
        "expense_id": {
            "bsonType": "string"
        },
        "debtor_id": {
            "bsonType": "string"
        },
        "created_at": {
            "bsonType": "date"
        },
        "decided_at": {
            "bsonType": "date"
        },
        "status": {
            "bsonType": "string",
            "maxLength": 20,
            "enum": ["Pending", "Confirmed", "Rejected"]
        }
    }
}

