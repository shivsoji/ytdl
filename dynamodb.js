const AWS = require("aws-sdk");

AWS.config.update({
  accessKeyId: process.env.AWS_KEY,
  secretAccessKey: process.env.AWS_SECRET,
  region: process.env.AWS_REGION,
  endpoint: process.env.DYNAMODB_ENDPOINT,
  dynamoDbCrc32: false,
});

const docClient = new AWS.DynamoDB.DocumentClient();

module.exports = { docClient };
