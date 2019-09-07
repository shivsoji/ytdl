"use strict";
const axios = require("axios");
const cron = require("node-cron");
const { get, omit, omitBy, isNil } = require("lodash");
const { docClient } = require("./dynamodb");

const queryData = { text: process.env.YOUTUBE_QUERY || "Barack Obama", str: process.env.YOUTUBE_QUERY_STRING || "barack%20obama" };
const ytApiKey = process.env.YOUTUBE_API_KEY;

function removeEmptyStringElements(obj) {
  for (var prop in obj) {
    if (typeof obj[prop] === "object") {
      removeEmptyStringElements(obj[prop]);
    } else if (obj[prop] === "") {
      delete obj[prop];
    }
  }
  return obj;
}

const updateData = async data => {
  for (const item of data.items) {
    if (get(item, "id.videoId")) {
      const Item = { etag: item.etag, snippet: item.snippet, videoId: item.id.videoId, query: queryData.str, timestamp: new Date().toString() };

      const itemData = {
        TableName: "ytlist",
        Item: removeEmptyStringElements(Item),
      };

      const params = {
        TableName: "ytlist",
        Key: {
          videoId: itemData.Item.videoId,
        },
      };

      try {
        const data = await docClient.get(params).promise();
        console.log("Item exists", data.Item.etag);
      } catch (e) {
        const newData = await docClient.put(itemData).promise();
        console.log("PutItem succeeded:", item.etag);
      }
    }
  }
};

const getYtData = async (pageToken = "") => {
  let ytUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&order=viewCount&q=${queryData.str}&safeSearch=none&type=video&key=${ytApiKey}&maxResults=50`;

  const metaItem = {
    TableName: "meta",
    Item: { query: queryData.str, queryText: queryData.text, timestamp: new Date().toString() },
  };

  const getParams = {
    TableName: "meta",
    Key: {
      query: queryData.str,
    },
  };

  let nextPageToken = pageToken;

  try {
    const data = await docClient.get(getParams).promise();
    if (pageToken === "") {
      nextPageToken = data.Item.nextPageToken;
    }
  } catch (err) {
    console.error("Unable to add metadata", metaItem.Item.query, ". Error JSON:", JSON.stringify(err, null, 2));
    await docClient.put(metaItem).promise();
  }

  if (nextPageToken) {
    ytUrl = `${ytUrl}&pageToken=${nextPageToken}`;
  }

  try {
    const { data } = await axios.get(ytUrl);
    if (data.error) {
      return;
    } else {
      await updateData(data);
      if (data.nextPageToken) {
        const params = {
          TableName: "meta",
          Key: {
            query: queryData.str,
          },
          UpdateExpression: "set nextPageToken = :nxtP",
          ExpressionAttributeValues: {
            ":nxtP": data.nextPageToken,
          },
          ReturnValues: "UPDATED_NEW",
        };

        await docClient.update(params).promise();
        await getYtData(data.nextPageToken);
      }
    }
  } catch (error) {
    console.log("Youtube api error", get(error, "response.data.error", error));
  }
};

cron.schedule(
  "0 1,3,5,7 * * *",
  async () => {
    console.log("Running a job");
    await getYtData();
  },
  {
    scheduled: true,
    timezone: "Asia/Kolkata",
  },
);
