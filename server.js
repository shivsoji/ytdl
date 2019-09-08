var express = require("express");
var { get } = require("lodash");
var app = express();
const ytdl = require("ytdl-core");
const { docClient } = require("./dynamodb");
require("./cron");

app.get("/", function(req, res) {
  ytdl.getInfo(req.query.videoId).then(info => {
    res.send(get(info, "formats"));
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`app listening on port ${port}!`));

app.get("/getlist", async (req, res) => {
  const { limit, offset, category } = req.query;

  const params = {
    TableName: "ytlist",
    Limit: limit || 50,
    FilterExpression: "#query = :category",
    ExpressionAttributeNames: {
      "#query": "query",
    },
    ExpressionAttributeValues: {
      ":category": encodeURI(category),
    },
  };

  if (offset) {
    params.ExclusiveStartKey = { videoId: offset };
  }

  const data = await docClient.scan(params).promise();
  res.send(data);
});
