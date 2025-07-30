import { google } from "googleapis";
import fs from "fs/promises";
import readline from "readline";

const SCOPES = ["https://www.googleapis.com/auth/documents"];
const TOKEN_PATH = "token.json";
const CREDENTIALS_PATH = "credentials.json"; // from Google Cloud Console

const loadSavedCredentialsIfExist = async () => {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    return JSON.parse(content);
  } catch (err) {
    return null;
  }
};

const saveCredentials = async (credentials) => {
  await fs.writeFile(TOKEN_PATH, JSON.stringify(credentials));
};

const authorize = async () => {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content).installed;
  const { client_secret, client_id, redirect_uris } = keys;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  const token = await loadSavedCredentialsIfExist();
  if (token) {
    oAuth2Client.setCredentials(token);
    return oAuth2Client;
  }

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
  });

  console.log("Authorize this app by visiting this url:", authUrl);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const code = await new Promise(resolve => rl.question("Enter code from browser: ", resolve));
  rl.close();

  const { tokens } = await oAuth2Client.getToken(code);
  oAuth2Client.setCredentials(tokens);
  await saveCredentials(tokens);

  return oAuth2Client;
};

const createDoc = async (title, content) => {
  const auth = await authorize();
  const docs = google.docs({ version: "v1", auth });

  const doc = await docs.documents.create({ requestBody: { title } });
  const docId = doc.data.documentId;

  await docs.documents.batchUpdate({
    documentId: docId,
    requestBody: {
      requests: [{ insertText: { location: { index: 1 }, text: content } }]
    }
  });

  return docId;
};

export default createDoc;
