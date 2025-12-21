const admin = require("firebase-admin");

const serviceAccount = {
  projectId: "excel-filter-po",
  clientEmail: "firebase-adminsdk-ab2ud@excel-filter-po.iam.gserviceaccount.com",
  privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC1mHRhhmdaodkv\niFglsxn6PQintOS0gMDNDi5odYfQp0curUpHk1XwtAq5iO0THJEqe7w4C6cGSNdI\np+rg9j8pJ66wcbyBAmBmV61EV+0UsdSaA+NOajE/VRUxhF+gQSzE6fMoSev+rnLM\nTIc2MHQcS9tIZbLTladEUxg7bidohZ/+MB5cshuYdIZhawfuqcvwA5cpfWS126Sf\nLffjy8w5UN8WzcsawslcZUEObCOO4WIbJnxyjhSabN8EBvL6fSwmmP+HXtehwOfe\nv0t0Ke6oOoxgXLGXN00Dw7SPqJvR/UN/6T40gE6lMmfjasQGEahFGz/ms5qv6DSM\nZhg+HxPVAgMBAAECggEACyT+D3YmJaPFJmuhrT6em4LfYxtw5br5GhyCsJp16VI6\nxhyQcHAUWB9UgSpsEj4wkoDhfjcI2xPhUm4rtf6mxanPyLhSL0CsFdvPoGAdBqYb\nPBB9BLTzrMVV9aIAFF+rlbId4B0ZRJoEJZGUwriah5oILRtArEeE6maHGC6ccIeY\nRo0YwevIxz25KmqJDKe1ElWBJso/gJeb7NPkavHzIphEExZPB+vX+4pctlJo+JTu\n3E7uv/4hoYGN/yve/a3mBNMcbc/l4uhx7e7+mvUaTPte0VR+BUT1d/v9A0aRqS6j\nPg5RjeMy/OFGSh+stbYhLT44nS9CoefS6aHz3kAPCQKBgQDrkd0Zj4YvK0RAI7r0\nRz8baCWfpkb+Ba203qCFyIJZNtG+OfUMfwQgMkRPH5I0+qtbQgMN31Vsl2SaSoNi\nrPVWoFH2Rfr1M6cgVziWfLb8tP2/XJEoeFxAqDDtKlBJUK6Zqhfxj7pXjzcf7J8P\nzgDMjaT2j8YH4tr3FmkWlmnj1wKBgQDFWEA47fr+8nCI7+0297HeGfh6W6kUZiXB\npE23boSC4zgNbU6+d2icunb70aDRvv1p745serlAy3RAGHzvCuVrLuC8DY7uWE+z\nhOvgQGkQHWUKVCpJvYlGWK4Vu20jzUlKMFsQCSo4xH4yvkbgjvVOEmR5Pfw5fVU9\nXkFl9FjQMwKBgGh5Cy6P2XnH3X/4mKxHgLRd7vmr26ZCzHP/m/9ZGn4IcuLDf2so\nVaMVx/ezT7tRRHe3gfVAC/mZ9tL6ouQ7Qp9FgLQQ+yiN3NvZ8s3Cx8CxYCvjGLlz\nD67ZKMG11198ecLKjc3i6Uh1yoPNBAoVWYNeej+jKbdLo8KbXMXYtWOHAoGATlw/\njBt7KdbMtqNGdygdmYqIbtWMqsvwvBZowaiBt5NPw40e0mSJxooICu/vQrnq2DDG\nRe7pNoBTFcxjd2vFMy03EZT0p1GrvCXQn4gT79EsONC4xfUb2DIIVhrJOIkgS/Qt\nhI2PFWF4lt+VNz+syiZlfPsO9yj8OtT9dOV0ip8CgYEAjj1Fhm6Kb2vwRm3UiFcq\nLdbEDWslbZSfX7bixmIkAw7wHDn51dwX0ngZXhfFdmIr4IZppAAqFyABIB9zP6ym\nc5y0pIwzSKxJS2wyntTQ9ivpRdAEVByASTcXWRDHqA77ql8BQWr2phkWXWvONJRv\nU80gRbGd+CHgy85a105OjEE=\n-----END PRIVATE KEY-----\n",
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

async function createUser() {
  try {
    const user = await admin.auth().createUser({
      email: "poom.keawon@gmail.com",
      password: "Giantloved2b$",
      displayName: "Poom",
    });
    console.log("User created successfully:");
    console.log("  Email:", user.email);
    console.log("  UID:", user.uid);
    console.log("  Password: Giantloved2b$");
  } catch (error) {
    if (error.code === "auth/email-already-exists") {
      console.log("User already exists. Resetting password...");
      const user = await admin.auth().getUserByEmail("poom.keawon@gmail.com");
      await admin.auth().updateUser(user.uid, {
        password: "Giantloved2b$",
      });
      console.log("Password reset successfully:");
      console.log("  Email: poom.keawon@gmail.com");
      console.log("  Password: Giantloved2b$");
    } else {
      console.error("Error creating user:", error.message);
    }
  }
  process.exit(0);
}

createUser();
