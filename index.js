const {
  TextractClient,
  AnalyzeExpenseCommand,
} = require("@aws-sdk/client-textract");
const fs = require("fs");

const client = new TextractClient({});

const bill = fs.readFileSync("./bill-1.pdf", "base64");

const params = {
  Document: {
    Bytes: Buffer.from(bill, "base64"),
  },
};

async function processInvoice() {
  try {
    const command = new AnalyzeExpenseCommand(params);
    const response = await client.send(command);
    const { ExpenseDocuments } = response;
    const [expense] = ExpenseDocuments;
    const { SummaryFields } = expense;

    const table = formatResult(getTableItems(ExpenseDocuments));
    const summary = getSummaryInfo(SummaryFields);

    const result = {
      table,
      ...summary,
    };

    return result;
  } catch (err) {
    console.log("Error", err);
  }
}

function getSummaryInfo(SummaryFields) {
  let obj = {};
  for (let summary of SummaryFields) {
    if (summary?.Type?.Text === "VENDOR_NAME") {
      if (!obj.vendorName) {
        obj.vendorName = summary.ValueDetection.Text;
      }
    }
    if (summary?.Type?.Text === "INVOICE_RECEIPT_DATE") {
      obj.receiptDate = summary.ValueDetection.Text;
    }

    if (summary?.Type?.Text === "INVOICE_RECEIPT_ID") {
      obj.receiptID = summary.ValueDetection.Text;
    }
  }

  return obj;
}

function getTableItems(ExpenseDocuments) {
  let result = {};
  ExpenseDocuments.forEach((doc) => {
    doc.LineItemGroups.forEach((items) => {
      items.LineItems.forEach((fields) => {
        fields.LineItemExpenseFields.forEach((expenseFields) => {
          let key = expenseFields?.Type?.Text;
          let value = expenseFields?.ValueDetection?.Text;

          if (key !== "OTHER" && key !== "EXPENSE_ROW") {
            if (!(key in result)) {
              result[key] = [];
            }
            result[key].push(value);
          }
        });
      });
    });
  });

  return result;
}

function formatResult(result) {
  const table = [];
  let obj = {};

  for (let i = 0; i < Object.keys(result)[0].length; i++) {
    obj = {};
    for (const [key, value] of Object.entries(result)) {
      obj[key] = value[i];
    }
    table.push(obj);
  }
  return table;
}

processInvoice();
