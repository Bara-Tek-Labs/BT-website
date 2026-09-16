const healthForm = document.getElementById("health-form");


if (healthForm) {

    console.log("BaraTek health form listener attached");

    healthForm.addEventListener("submit", async function(event) {

        event.preventDefault();

        console.log("BaraTek submit handler fired");


        const name = document.getElementById("name").value;
        const company = document.getElementById("company").value;
        const email = document.getElementById("email").value;
        const dataType = document.getElementById("data-type").value;
        const problem = document.getElementById("problem").value;
        const dataset = document.getElementById("dataset").files[0];

        if (
            name === "" ||
            company === "" ||
            email === "" ||
            dataType === "" ||
            problem === ""
        ) {
            alert("Please complete all fields before submitting.");
            return;
        }

        if (!dataset) {
            alert("Please upload a CSV dataset.");
            return;
        }

        const formData = new FormData();

        formData.append("name", name);
        formData.append("company", company);
        formData.append("email", email);
        formData.append("dataType", dataType);
        formData.append("problem", problem);
        formData.append("file", dataset);

        try {

            const response = await fetch(
                "https://baratek.onrender.com/analyze-dataset",
                {
                    method: "POST",
                    body: formData
                }
            );

            const result = await response.json();

            document.getElementById("health-results").style.display = "block";

        document.getElementById("result-filename").textContent = result.filename;
        document.getElementById("result-rows").textContent = result.rows.toLocaleString();
        document.getElementById("result-columns").textContent = result.columns;
        document.getElementById("result-completeness").textContent =
            result.completeness + "%";
        document.getElementById("result-missing").textContent =
            result.missing_values;
        document.getElementById("result-duplicates").textContent =
            result.duplicate_rows;

        const columnResults = document.getElementById("column-results");

let table = `
    <table>

        <thead>
            <tr>
                <th>Column</th>
                <th>Data Type</th>
                <th>Missing Values</th>
                <th>Missing %</th>
            </tr>
        </thead>

        <tbody>
`;

for (const column in result.column_report) {

    const report = result.column_report[column];

    table += `
        <tr>
            <td>${column}</td>
            <td>${report.data_type}</td>
            <td>${report.missing_values}</td>
            <td>${report.missing_percentage}%</td>
        </tr>
    `;
}

table += `
        </tbody>

    </table>
`;

columnResults.innerHTML = table;

document.getElementById("health-results").scrollIntoView({
    behavior: "smooth"
});

        } catch (error) {

            console.error(error);

            alert(
                "Something went wrong. Please try again."
            );

        }

    });

}