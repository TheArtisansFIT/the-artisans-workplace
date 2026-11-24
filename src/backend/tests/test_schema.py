import importlib.util
from pathlib import Path
from types import ModuleType

COLLECTION_PATH = Path(__file__).resolve().parents[2] / "database" / "collection.py"


def load_collection_module() -> ModuleType:
    spec = importlib.util.spec_from_file_location(
        "database_collection", COLLECTION_PATH
    )
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_reference_id_fields_use_string_ids() -> None:
    module = load_collection_module()
    validators = {
        name: value
        for name, value in vars(module).items()
        if name.endswith("_validator")
    }

    assert validators

    for validator_name, validator in validators.items():
        for field, rule in validator.get("properties", {}).items():
            if field.endswith("_id"):
                assert rule["bsonType"] == "string", (
                    f"{validator_name}.{field} must use bsonType 'string'"
                )
