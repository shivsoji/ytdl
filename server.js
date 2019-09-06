var express = require("express");
var { get } = require("lodash");
var app = express();
const ytdl = require("ytdl-core");

app.get("/", function(req, res) {
  ytdl.getInfo(req.query.videoId).then(info => {
    res.send(get(info, "formats"));
  });
});
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`app listening on port ${port}!`));
