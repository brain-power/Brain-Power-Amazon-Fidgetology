var fs = require("fs");

var records = fs.readFileSync("test_records_b64.txt", "utf8").split(/\r?\n/);

records = records.filter((record) => { return record.trim() });

records = records.map((record) => {
    return {
        kinesis: {
            data: record
        }
    }
});

fs.writeFile("test_records.json", JSON.stringify({ Records: records }));