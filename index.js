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
    const table = getTableItems(ExpenseDocuments);
    const summary = getSummaryInfo(SummaryFields);
    console.log(summary, table);
    return response;
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
  let table = [];
  ExpenseDocuments.forEach((doc) => {
    doc.LineItemGroups.forEach((items) => {
      items.LineItems.forEach((fields) => {
        fields.LineItemExpenseFields.forEach((expenseFields) => {
          if (expenseFields?.Type?.Text === "EXPENSE_ROW")
            table.push(expenseFields.ValueDetection.Text);
        });
      });
    });
  });

  return table;
}

processInvoice();
