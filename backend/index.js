const express = require('express');
const cors = require('cors');
const app = express();
const port = 5500;
const { google } = require('googleapis');
// const credentials = require('./credentials.json');
// const { client_email, private_key } = credentials;
require('dotenv').config();
const client_email = process.env.CLIENT_EMAIL;
const private_key = process.env.PRIVATE_KEY;

const spreadsheetId = process.env.SPREADSHEET_ID;

app.use(cors());
app.use(express.json());

function formatDate(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

// const credentials = process.env.GOOGLE_CREDENTIALS;

const client = new google.auth.JWT(
  client_email,
  null,
  private_key,
  ['https://www.googleapis.com/auth/spreadsheets']
);

client.authorize((err) => {
  if (err) {
    console.error('Google Sheets API authentication error:', err);
    return;
  }
  console.log('Google Sheets API authentication successful');
});

async function createNewSheet(sheets, spreadsheetId, sheetTitle) {
  const request = {
    spreadsheetId,
    resource: {
      requests: [
        {
          addSheet: {
            properties: {
              title: sheetTitle,
            },
          },
        },
      ],
    },
  };

  try {
    await sheets.spreadsheets.batchUpdate(request);
    console.log(`New sheet "${sheetTitle}" created successfully`);
  } catch (error) {
    console.error('Error creating new sheet:', error);
  }
}

async function submitToGoogleSheet(company, name, email, phoneNumber, deliveryDate, address, signs) {
  try {
    const sheets = google.sheets({ version: 'v4', auth: client });

    // Generate a unique sheet title based on timestamp or other criteria
    const sheetTitle = `${company} - ${formatDate(new Date())}`;

    // Create a new sheet in the spreadsheet
    await createNewSheet(sheets, spreadsheetId, sheetTitle);

    // Update the newly created sheet with the name and email
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetTitle}!A1:B8`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [["Company", company], ["Name", name], ["Email", email], ["Phone", phoneNumber], ["Delivery Date", deliveryDate], ["Address", address], ["", ""], ["Signs", ""]],
      },
    });

    // Prepare the sign data for insertion
    const signData = signs.map((sign) => [sign.name, sign.quantity]);

    // Insert the sign data starting from cell A2
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetTitle}!A9:B`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: signData,
      },
    });

    console.log('Form data added to Google Sheet successfully');
  } catch (error) {
    console.error('Error adding form data to Google Sheet:', error);
  }
}

// Define a route to handle GET requests
app.get('/', (req, res) => {
  // Send the HTML page as the response
  res.send('<html><body><h1>Hello, world!</h1></body></html>');
});

// Route to fetch card data
app.get('/sign-data', async (req, res) => {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: process.env.CREDENTIALS_PATH, // Replace with the path to your credentials JSON file
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth });

    const range = process.env.RANGE; // Replace with the actual sheet name and range

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const values = response.data.values;

    const signData = values.map((row) => ({
      id: row[0],
      name: row[1],
      image: row[2],
      quantity: 0
    }));

    res.json(signData);
  } catch (error) {
    console.error('Error fetching card data:', error);
    res.status(500).json({ error: 'Failed to fetch card data' });
  }
});

// Submit the form data
app.post('/submit', (req, res) => {
  const { company, name, email, phoneNumber, deliveryDate, address, signs } = req.body;

  submitToGoogleSheet(company, name, email, phoneNumber, deliveryDate, address, signs)
    .then(() => {
      console.log('Data submitted to Google Sheets');
      res.status(200).json({ message: 'Form submitted successfully' });
    })
    .catch((error) => {
      console.error('Error submitting form:', error);
      res.status(500).json({ error: 'Failed to submit form' });
    });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
