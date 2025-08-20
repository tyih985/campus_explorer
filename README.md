# UBC Campus Explorer

[Video Demo](https://www.youtube.com/watch?v=YIxMDEBNB6k)

This project provides an interface for users to visualize different routes and walking distances between their classes at UBC. The following guide explains how to configure your environment, run the application, and load datasets.

## Configuring Your Environment

### Prerequisites

1. Node.js (Current: v23.X)  
   - Installing Node will also install NPM.  
   - Verify installation:  
     node --version
     npm --version

2. Yarn (v1.22.X)  
   - Install Yarn globally.  
   - Verify installation:  
     yarn --version

## Running the Application

1. Install Dependencies

At project root, install dependencies:
```
    yarn install
```

Navigate to the `frontend` folder and install dependencies:
```
    cd frontend
    yarn install
```

2. Start the frontend development server:
```
npm run dev
```

3. Run the Backend  

At the root of the repository, start the server:
```
npm run start
```

4. Add the Dataset

The application requires a dataset (`campus.zip`) from the `/data` folder. Add it via HTTP PUT to the backend using Postman or curl:

**Using Postman:**
- Method: PUT  
- URL: http://localhost:4321/dataset/:id/rooms  
- Body: Select binary and upload `campus.zip`  

**Using curl:**
```
    curl -X PUT \
      --data-binary @data/campus.zip \
      http://localhost:4321/dataset/:id/rooms
```

_Replace `:id` with a dataset identifier (e.g., campus)._
