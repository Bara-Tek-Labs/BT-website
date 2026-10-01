import io
import os
import sqlite3
from datetime import datetime, timezone

import pandas as pd
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Set ALLOWED_ORIGINS on Render to your real site, e.g.
# "https://barateklabs.com,https://www.barateklabs.com". Until you do, any site can call this.
origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

MAX_BYTES = 5 * 1024 * 1024  # 5 MB
DB_PATH = os.getenv("DB_PATH", "leads.db")


def save_lead(name, company, email, data_type, problem, filename, rows, columns):
    """Store who asked for a check. Never lets a storage problem break the analysis."""
    try:
        with sqlite3.connect(DB_PATH) as db:
            db.execute(
                """CREATE TABLE IF NOT EXISTS leads (
                    created_at TEXT, name TEXT, company TEXT, email TEXT,
                    data_type TEXT, problem TEXT, filename TEXT, rows INTEGER, columns INTEGER)"""
            )
            db.execute(
                "INSERT INTO leads VALUES (?,?,?,?,?,?,?,?,?)",
                (datetime.now(timezone.utc).isoformat(), name, company, email,
                 data_type, problem, filename, rows, columns),
            )
        # Also print, so it shows in the Render logs even if the database file is lost.
        print(f"NEW LEAD: {name} | {company} | {email} | {data_type} | {problem}")
    except Exception as err:
        print("Could not save lead:", err)


@app.get("/")
def home():
    return {"message": "BaraTek backend is alive"}


@app.post("/analyze-dataset")
async def analyze_dataset(
    name: str = Form(...),
    company: str = Form(...),
    email: str = Form(...),
    dataType: str = Form(...),
    problem: str = Form(...),
    file: UploadFile = File(...),
):
    if "@" not in email:
        raise HTTPException(status_code=400, detail="Please enter a valid email address.")

    if not (file.filename or "").lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Please upload a CSV file.")

    contents = await file.read()
    if len(contents) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="File is too large. The limit is 5 MB.")

    try:
        data = pd.read_csv(io.BytesIO(contents))
    except Exception:
        raise HTTPException(status_code=400, detail="We couldn't read that file as a CSV.")

    if data.empty or data.shape[1] == 0:
        raise HTTPException(status_code=400, detail="That file has no data rows.")

    rows, cols = data.shape
    total_cells = rows * cols

    missing_values = int(data.isnull().sum().sum())
    duplicate_rows = int(data.duplicated().sum())
    completeness = (total_cells - missing_values) / total_cells * 100
    duplicate_percentage = duplicate_rows / rows * 100

    column_report = {}
    for column in data.columns:
        missing = int(data[column].isnull().sum())
        column_report[str(column)] = {
            "data_type": str(data[column].dtype),
            "missing_values": missing,
            "missing_percentage": round(missing / rows * 100, 2),
        }

    save_lead(name, company, email, dataType, problem, file.filename, rows, cols)

    return {
        "filename": file.filename,
        "rows": rows,
        "columns": cols,
        "column_names": [str(c) for c in data.columns],
        "missing_values": missing_values,
        "duplicate_rows": duplicate_rows,
        "duplicate_percentage": round(duplicate_percentage, 2),
        "completeness": round(completeness, 2),
        "column_report": column_report,
    }
