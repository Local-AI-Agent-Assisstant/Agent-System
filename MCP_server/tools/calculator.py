import math
import ast
import re
import requests

from pint import UnitRegistry

# -------------------- Unit Registry --------------------

ureg = UnitRegistry()
Q_ = ureg.Quantity

# -------------------- Currency API --------------------

CURRENCY_API = "https://open.er-api.com/v6/latest/USD"

_currency_cache = {
    "rates": None,
}

# -------------------- Helpers -----------------------------------------------------------------------------

_ALLOWED_NAMES = {
    # constants
    "pi": math.pi,
    "e": math.e,

    # math (degrees-based trig)
    "sin": lambda x: math.sin(math.radians(x)),
    "cos": lambda x: math.cos(math.radians(x)),
    "tan": lambda x: math.tan(math.radians(x)),

    # other math
    "sqrt": math.sqrt,
    "log": math.log,
    "log10": math.log10,
    "exp": math.exp,
    "abs": abs,
    "round": round,
}

_ALLOWED_NODES = (
    ast.Expression,
    ast.BinOp,
    ast.UnaryOp,
    ast.Call,
    ast.Num,
    ast.Constant,
    ast.Name,
    ast.Load,
    # operators
    ast.Add,
    ast.Sub,
    ast.Mult,
    ast.Div,
    ast.FloorDiv,
    ast.Mod,
    ast.Pow,
    ast.UAdd,
    ast.USub,
)
# -------------------- Currency Helpers --------------------

def get_currency_rates():
    if _currency_cache["rates"]:
        return _currency_cache["rates"]

    response = requests.get(CURRENCY_API, timeout=10)
    data = response.json()

    if data.get("result") != "success":
        raise Exception("Failed to fetch exchange rates")

    _currency_cache["rates"] = data["rates"]

    return data["rates"]


def convert_currency(amount, from_currency, to_currency):
    rates = get_currency_rates()

    from_currency = from_currency.upper()
    to_currency = to_currency.upper()

    if from_currency not in rates:
        raise ValueError(f"Unsupported currency: {from_currency}")

    if to_currency not in rates:
        raise ValueError(f"Unsupported currency: {to_currency}")

    usd_amount = amount / rates[from_currency]
    converted = usd_amount * rates[to_currency]

    return round(converted, 4)

# -------------------- Unit Conversion --------------------

UNIT_ALIASES = {
    "celsius": "degC",
    "fahrenheit": "degF",
}


def try_unit_conversion(expression: str):
    """
    Examples:
    - 10 km to m
    - 5 kg to lb
    - 72 fahrenheit to celsius
    """

    pattern = r"^\s*([\d\.]+)\s+([a-zA-Z_°]+)\s+(?:to|in)\s+([a-zA-Z_°]+)\s*$"

    match = re.match(pattern, expression, re.IGNORECASE)

    if not match:
        return None

    value, from_unit, to_unit = match.groups()

    from_unit = UNIT_ALIASES.get(from_unit.lower(), from_unit)
    to_unit = UNIT_ALIASES.get(to_unit.lower(), to_unit)

    quantity = Q_(float(value), from_unit)

    converted = quantity.to(to_unit)

    return f"{converted.magnitude:.4f} {converted.units}"

# -------------------- Currency Conversion --------------------

def try_currency_conversion(expression: str):
    """
    Examples:
    - 100 USD to EUR
    - 50 TRY in GBP
    """

    pattern = r"^\s*([\d\.]+)\s+([A-Za-z]{3})\s+(?:to|in)\s+([A-Za-z]{3})\s*$"

    match = re.match(pattern, expression)

    if not match:
        return None

    amount, from_currency, to_currency = match.groups()

    converted = convert_currency(
        float(amount),
        from_currency,
        to_currency,
    )

    return f"{converted} {to_currency.upper()}"

# -------------------- Safe Math Evaluation --------------------

def safe_eval(expression: str):
    tree = ast.parse(expression, mode="eval")

    for node in ast.walk(tree):
        if not isinstance(node, _ALLOWED_NODES):
            raise ValueError("Unsupported expression")

        if isinstance(node, ast.Name) and node.id not in _ALLOWED_NAMES:
            raise ValueError(f"Unknown name: {node.id}")

        if isinstance(node, ast.Call):
            if not isinstance(node.func, ast.Name) or node.func.id not in _ALLOWED_NAMES:
                raise ValueError("Function call not allowed")

    result = eval(
        compile(tree, "<calc>", "eval"),
        {"__builtins__": {}},
        _ALLOWED_NAMES,
    )

    return str(round(result, 10)).rstrip("0").rstrip(".")

#--------------------Caluclate--------------------------------------------------------------

def calculate(expression: str) -> str:
    """
    Main calculator entry.
    Supports:
    - math
    - unit conversion
    - live currency conversion
    """

    try:
        expression = expression.strip()

        # currency conversion
        currency_result = try_currency_conversion(expression)
        if currency_result:
            return currency_result

        # unit conversion
        unit_result = try_unit_conversion(expression)
        if unit_result:
            return unit_result

        # normal math
        return safe_eval(expression)

    except Exception as e:
        return f"Error: {e}"