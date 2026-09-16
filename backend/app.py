from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import io


app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class HealthCheckRequest(BaseModel):
    name: str
    company: str
    email: str
    dataType: str
    problem: str


@app.get("/")
def home():
    return {"message": "BaraTek backend is alive"}


@app.post("/health-check")
def health_check(request: HealthCheckRequest):

    return {
        "message": "Health Check request received",
        "status": "ready",
        "company": request.company,
        "next_step": "Upload your dataset for analysis"
    }
@app.post("/analyze-dataset")
async def analyze_dataset(file: UploadFile = File(...)):

    contents = await file.read()


    data = pd.read_csv(io.BytesIO(contents))

    # Overall dataset information

    missing_values = int(data.isnull().sum().sum())

    duplicate_rows = int(data.duplicated().sum())

    total_cells = data.shape[0] * data.shape[1]

    completeness = (
        (total_cells - missing_values) / total_cells
    ) * 100

    duplicate_percentage = (
        duplicate_rows / len(data)
    ) * 100

    # Column-by-column information

    column_report = {}

    for column in data.columns:

        missing = int(data[column].isnull().sum())

        missing_percentage = round(
            (missing / len(data)) * 100,
            2
        )

        column_report[column] = {
            "data_type": str(data[column].dtype),
            "missing_values": missing,
            "missing_percentage": missing_percentage
        }

    return {
        "filename": file.filename,
        "rows": len(data),
        "columns": len(data.columns),
        "column_names": list(data.columns),
        "missing_values": missing_values,
        "duplicate_rows": duplicate_rows,
        "duplicate_percentage": round(duplicate_percentage, 2),
        "completeness": round(completeness, 2),
        "column_report": column_report
    }