from flask import Flask, jsonify, request
from utils.logs import get_log_content
import re

app = Flask("testapp")


# Find content on logs and returns the matched lines.
@app.route("/logs/find", methods=["POST"])
def logs_find():
    request_data = request.json
    pattern = request_data["pattern"]

    match = re.findall(
        f"^.*{pattern}.*$",
        get_log_content(),
        re.MULTILINE,
    )

    return jsonify(
        {
            "match": match,
        }
    )
