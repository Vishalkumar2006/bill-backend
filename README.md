\# BillLocker Backend API Documentation



This document explains the backend APIs for the BillLocker MVP.



The backend currently supports:



\- User registration

\- User login

\- JWT-based authentication

\- Bill upload with metadata

\- File storage in AWS S3

\- Metadata storage in AWS DynamoDB

\- Fetch all bills

\- Fetch a single bill

\- Generate temporary view URL

\- Generate temporary download URL

\- Delete bill from S3 and DynamoDB



\---



\# 1. Backend Overview



\## Tech Stack



```text

Backend: Node.js + Express.js

Authentication: JWT

Password hashing: bcryptjs

File upload handling: multer

Database: AWS DynamoDB

File storage: AWS S3

```



\## AWS Services Used



```text

AWS S3       -> stores actual bill files like PDF, JPG, PNG

DynamoDB    -> stores user data and bill metadata

```



The database does not store the actual bill file.



It only stores metadata and the S3 key.



Example:



```text

S3 stores:

bills/PRF-3BFC85C8/BILL-e060773f-c40e-4021-a5ee-8bf34ee0e468.pdf



DynamoDB stores:

date, invoiceId, amount, description, s3Key, createdAt

```



\---



\# 2. Base URL



For local testing:



```text

http://localhost:5000

```



After deployment, this will change to the deployed backend URL.



Example:



```text

https://your-deployed-backend-url.com

```



\---



\# 3. Authentication Flow



The app uses JWT token-based authentication.



Flow:



```text

User registers

&#x20;       ↓

Backend returns profileId

&#x20;       ↓

User logs in using profileId + password

&#x20;       ↓

Backend returns JWT token

&#x20;       ↓

Frontend stores token

&#x20;       ↓

Frontend sends token in Authorization header for protected APIs

```



For all bill-related APIs, frontend must send this header:



```http

Authorization: Bearer JWT\_TOKEN\_HERE

```



\---



\# 4. Register User



\## Endpoint



```http

POST /auth/register

```



\## Full URL



```text

http://localhost:5000/auth/register

```



\## Request Body



```json

{

&#x20; "password": "test1234"

}

```



\## Success Response



```json

{

&#x20; "message": "User registered successfully",

&#x20; "profileId": "PRF-3BFC85C8"

}

```



\## Frontend Note



The frontend should clearly show the generated `profileId` to the user.



The user will need this `profileId` for login.



For MVP login:



```text

profileId + password

```



\---



\# 5. Login User



\## Endpoint



```http

POST /auth/login

```



\## Full URL



```text

http://localhost:5000/auth/login

```



\## Request Body



```json

{

&#x20; "profileId": "PRF-3BFC85C8",

&#x20; "password": "test1234"

}

```



\## Success Response



```json

{

&#x20; "message": "Login successful",

&#x20; "token": "JWT\_TOKEN\_HERE",

&#x20; "profileId": "PRF-3BFC85C8"

}

```



\## Frontend Note



Store the `token` on the frontend side.



For protected APIs, send it like this:



```http

Authorization: Bearer JWT\_TOKEN\_HERE

```



\---



\# 6. Upload Bill



\## Endpoint



```http

POST /bills/upload

```



\## Full URL



```text

http://localhost:5000/bills/upload

```



\## Authentication Required



Yes.



\## Headers



```http

Authorization: Bearer JWT\_TOKEN\_HERE

```



\## Request Type



```text

multipart/form-data

```



\## Form Data Fields



| Field | Type | Required | Description |

|---|---|---|---|

| file | File | Yes | Bill file |

| date | String | Yes | Bill date entered by user |

| invoiceId | String | Yes | Invoice ID entered by user |

| amount | Number/String | Yes | Bill amount |

| description | String | Yes | Bill description entered by user |



\## Allowed File Types



```text

PDF

JPG

PNG

```



\## Maximum File Size



```text

5 MB

```



\## Example Form Data



```text

file: bill.pdf

date: 2026-05-24

invoiceId: INV-001

amount: 1200

description: Mobile charger bill

```



\## Success Response



```json

{

&#x20; "message": "Bill uploaded successfully",

&#x20; "bill": {

&#x20;   "profileId": "PRF-3BFC85C8",

&#x20;   "billId": "BILL-e060773f-c40e-4021-a5ee-8bf34ee0e468",

&#x20;   "date": "2026-05-24",

&#x20;   "invoiceId": "INV-001",

&#x20;   "amount": 1200,

&#x20;   "description": "Mobile charger bill",

&#x20;   "s3Key": "bills/PRF-3BFC85C8/BILL-e060773f-c40e-4021-a5ee-8bf34ee0e468.pdf",

&#x20;   "createdAt": "2026-05-24T16:53:39.565Z"

&#x20; }

}

```



\## Frontend JavaScript Example



```js

const formData = new FormData();



formData.append("file", selectedFile);

formData.append("date", "2026-05-24");

formData.append("invoiceId", "INV-001");

formData.append("amount", "1200");

formData.append("description", "Mobile charger bill");



const response = await fetch("http://localhost:5000/bills/upload", {

&#x20; method: "POST",

&#x20; headers: {

&#x20;   Authorization: `Bearer ${token}`

&#x20; },

&#x20; body: formData

});



const data = await response.json();

console.log(data);

```



Important:



Do not manually set `Content-Type` while using `FormData` in frontend JavaScript. The browser automatically sets it with the correct boundary.



\---



\# 7. Get All Bills



\## Endpoint



```http

GET /bills

```



\## Full URL



```text

http://localhost:5000/bills

```



\## Authentication Required



Yes.



\## Headers



```http

Authorization: Bearer JWT\_TOKEN\_HERE

```



\## Success Response



```json

{

&#x20; "message": "Bills fetched successfully",

&#x20; "bills": \[

&#x20;   {

&#x20;     "profileId": "PRF-3BFC85C8",

&#x20;     "billId": "BILL-e060773f-c40e-4021-a5ee-8bf34ee0e468",

&#x20;     "date": "2026-05-24",

&#x20;     "invoiceId": "INV-001",

&#x20;     "amount": 1200,

&#x20;     "description": "Mobile charger bill",

&#x20;     "s3Key": "bills/PRF-3BFC85C8/BILL-e060773f-c40e-4021-a5ee-8bf34ee0e468.pdf",

&#x20;     "createdAt": "2026-05-24T16:53:39.565Z"

&#x20;   }

&#x20; ]

}

```



\## Frontend JavaScript Example



```js

const response = await fetch("http://localhost:5000/bills", {

&#x20; method: "GET",

&#x20; headers: {

&#x20;   Authorization: `Bearer ${token}`

&#x20; }

});



const data = await response.json();

console.log(data.bills);

```



\## Frontend Use



Use this API to show all uploaded bills on the dashboard.



Suggested card fields:



```text

invoiceId

date

amount

description

```



\---



\# 8. Get Single Bill With Temporary View URL



\## Endpoint



```http

GET /bills/:billId

```



\## Full URL Example



```text

http://localhost:5000/bills/BILL-e060773f-c40e-4021-a5ee-8bf34ee0e468

```



\## Authentication Required



Yes.



\## Headers



```http

Authorization: Bearer JWT\_TOKEN\_HERE

```



\## Success Response



```json

{

&#x20; "message": "Bill fetched successfully",

&#x20; "bill": {

&#x20;   "profileId": "PRF-3BFC85C8",

&#x20;   "billId": "BILL-e060773f-c40e-4021-a5ee-8bf34ee0e468",

&#x20;   "date": "2026-05-24",

&#x20;   "invoiceId": "INV-001",

&#x20;   "amount": 1200,

&#x20;   "description": "Mobile charger bill",

&#x20;   "s3Key": "bills/PRF-3BFC85C8/BILL-e060773f-c40e-4021-a5ee-8bf34ee0e468.pdf",

&#x20;   "createdAt": "2026-05-24T16:53:39.565Z"

&#x20; },

&#x20; "fileUrl": "TEMPORARY\_VIEW\_URL"

}

```



\## Important Note



`fileUrl` is a temporary secure S3 URL.



Current expiry time:



```text

5 minutes

```



Frontend can open this `fileUrl` in a new tab to view the bill.



\## Frontend JavaScript Example



```js

const response = await fetch(`http://localhost:5000/bills/${billId}`, {

&#x20; method: "GET",

&#x20; headers: {

&#x20;   Authorization: `Bearer ${token}`

&#x20; }

});



const data = await response.json();



window.open(data.fileUrl, "\_blank");

```



\---



\# 9. Download Bill



\## Endpoint



```http

GET /bills/:billId/download

```



\## Full URL Example



```text

http://localhost:5000/bills/BILL-e060773f-c40e-4021-a5ee-8bf34ee0e468/download

```



\## Authentication Required



Yes.



\## Headers



```http

Authorization: Bearer JWT\_TOKEN\_HERE

```



\## Success Response



```json

{

&#x20; "message": "Download URL generated successfully",

&#x20; "downloadUrl": "TEMPORARY\_DOWNLOAD\_URL"

}

```



\## Important Note



`downloadUrl` is a temporary secure S3 URL.



Current expiry time:



```text

5 minutes

```



Frontend can open this URL to download the bill file.



\## Frontend JavaScript Example



```js

const response = await fetch(`http://localhost:5000/bills/${billId}/download`, {

&#x20; method: "GET",

&#x20; headers: {

&#x20;   Authorization: `Bearer ${token}`

&#x20; }

});



const data = await response.json();



window.open(data.downloadUrl, "\_blank");

```



\---



\# 10. Delete Bill



\## Endpoint



```http

DELETE /bills/:billId

```



\## Full URL Example



```text

http://localhost:5000/bills/BILL-e060773f-c40e-4021-a5ee-8bf34ee0e468

```



\## Authentication Required



Yes.



\## Headers



```http

Authorization: Bearer JWT\_TOKEN\_HERE

```



\## Success Response



```json

{

&#x20; "message": "Bill deleted successfully",

&#x20; "billId": "BILL-e060773f-c40e-4021-a5ee-8bf34ee0e468",

&#x20; "deletedS3Key": "bills/PRF-3BFC85C8/BILL-e060773f-c40e-4021-a5ee-8bf34ee0e468.pdf"

}

```



\## Frontend JavaScript Example



```js

const response = await fetch(`http://localhost:5000/bills/${billId}`, {

&#x20; method: "DELETE",

&#x20; headers: {

&#x20;   Authorization: `Bearer ${token}`

&#x20; }

});



const data = await response.json();

console.log(data);

```



\## Backend Behavior



This API deletes both:



```text

1\. File from AWS S3

2\. Metadata from DynamoDB

```



\---



\# 11. Health Check APIs



These are mainly for backend testing.



\## Basic Backend Health Check



```http

GET /

```



Full URL:



```text

http://localhost:5000/

```



Response:



```json

{

&#x20; "message": "BillLocker backend is running"

}

```



\---



\## AWS Connection Health Check



```http

GET /health/aws

```



Full URL:



```text

http://localhost:5000/health/aws

```



Example response:



```json

{

&#x20; "message": "AWS connection successful",

&#x20; "s3": {

&#x20;   "bucket": "S3\_BUCKET\_NAME",

&#x20;   "objectCountChecked": 0

&#x20; },

&#x20; "dynamodb": {

&#x20;   "usersTable": "BillLockerUsers",

&#x20;   "testItemFound": false

&#x20; }

}

```



\---



\# 12. Common Error Responses



\## Missing Token



```json

{

&#x20; "message": "Authorization token missing"

}

```



\## Invalid Token



```json

{

&#x20; "message": "Invalid or expired token"

}

```



\## Wrong Login Details



```json

{

&#x20; "message": "Invalid profile ID or password"

}

```



\## Missing Upload Fields



```json

{

&#x20; "message": "date, invoiceId, amount, and description are required"

}

```



\## Missing Bill File



```json

{

&#x20; "message": "Bill file is required"

}

```



\## Bill Not Found



```json

{

&#x20; "message": "Bill not found"

}

```



\---



\# 13. Data Model



\## User Item in DynamoDB



Table:



```text

BillLockerUsers

```



Primary key:



```text

profileId

```



Example:



```json

{

&#x20; "profileId": "PRF-3BFC85C8",

&#x20; "passwordHash": "hashed\_password\_here",

&#x20; "createdAt": "2026-05-24T16:30:00.000Z"

}

```



Note:



Plain password is never stored. Only password hash is stored.



\---



\## Bill Item in DynamoDB



Table:



```text

BillLockerBills

```



Primary key:



```text

profileId + billId

```



Example:



```json

{

&#x20; "profileId": "PRF-3BFC85C8",

&#x20; "billId": "BILL-e060773f-c40e-4021-a5ee-8bf34ee0e468",

&#x20; "date": "2026-05-24",

&#x20; "invoiceId": "INV-001",

&#x20; "amount": 1200,

&#x20; "description": "Mobile charger bill",

&#x20; "s3Key": "bills/PRF-3BFC85C8/BILL-e060773f-c40e-4021-a5ee-8bf34ee0e468.pdf",

&#x20; "createdAt": "2026-05-24T16:53:39.565Z"

}

```



\---



\# 14. Frontend Integration Summary



\## Public APIs



These do not need token:



```text

POST /auth/register

POST /auth/login

GET /

GET /health/aws

```



\## Protected APIs



These need JWT token:



```text

POST /bills/upload

GET /bills

GET /bills/:billId

GET /bills/:billId/download

DELETE /bills/:billId

```



\## Authorization Header Format



```http

Authorization: Bearer JWT\_TOKEN\_HERE

```



\---



\# 15. Suggested Frontend Screens



\## Register Screen



Input:



```text

password

```



Button:



```text

Register

```



After success, show:



```text

Your Profile ID is: PRF-XXXXXXXX

Please save it. You will need it for login.

```



\---



\## Login Screen



Inputs:



```text

profileId

password

```



After successful login, store:



```text

token

profileId

```



\---



\## Dashboard Screen



Use:



```http

GET /bills

```



Show list of bills.



Each bill card can show:



```text

invoiceId

date

amount

description

```



Buttons:



```text

View

Download

Delete

```



\---



\## Upload Bill Screen



Fields:



```text

file

date

invoiceId

amount

description

```



Use:



```http

POST /bills/upload

```



\---



\## View Bill



Use:



```http

GET /bills/:billId

```



Then open:



```text

fileUrl

```



\---



\## Download Bill



Use:



```http

GET /bills/:billId/download

```



Then open:



```text

downloadUrl

```



\---



\## Delete Bill



Use:



```http

DELETE /bills/:billId

```



After deletion, refresh the dashboard list.



\---



\# 16. Important Notes for Frontend Team



1\. Do not send AWS credentials from frontend.

2\. Frontend should never directly upload to S3 in current MVP.

3\. All S3 operations happen through backend.

4\. Bill files are private in S3.

5\. Backend gives temporary signed URLs for viewing/downloading files.

6\. The temporary URLs expire after 5 minutes.

7\. Store JWT token after login and send it with protected APIs.

8\. While uploading using `FormData`, do not manually set `Content-Type`.

9\. Register API returns `profileId`; user must save it for future login.

10\. Current metadata fields are only:

&#x20;  - date

&#x20;  - invoiceId

&#x20;  - amount

&#x20;  - description



\---



\# 17. Current MVP Status



Completed backend features:



```text

User registration

User login

JWT authentication

Bill upload

S3 file storage

DynamoDB metadata storage

Fetch all bills

Fetch single bill

Generate view URL

Generate download URL

Delete bill

```



Future features can include:



```text

Search bills

Update bill metadata

OCR-based auto extraction

Category field

Warranty expiry reminder

Share bill with another user

Email/phone-based login

Forgot password

```

