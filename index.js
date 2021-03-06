if (!process.env.SLACK_TOKEN) {
  console.log("Provide a SLACK_TOKEN environment variable for command validation");
  process.exit(0);
}

var slackToken = process.env.SLACK_TOKEN;

var db = new (require("./db"))();

var express = require("express");
var app = express();
var bodyParser = require("body-parser");

app.use(bodyParser.urlencoded());

function writeResponse(text, userOnly, res, attachments) {
  res.json({
    response_type: userOnly ? "ephermeral" : "in_channel",
    text: text,
    attachments: attachments
  });
  res.end();
}

var usage = [
  "```",
  "Usage:",
  "/snippet create [snippet name] [snippet content]",
  "e.g. /snippet create helloWorld `hello, world!`",
  "/snippet view [snippet name]",
  "e.g. /snippet view helloWorld",
  "```"
];

function sendUsage(res) {
  writeResponse(usage.join("\n"), true, res);
}

function processCommand(body, res) {
  function sendError(err) {
    console.log(err);
    writeResponse("Unable to process request.", true, res);
  }

  if (body.command == "/snippet") {
    var params = body.text.split(" ");
    if (params[0] == "create" && params.length > 2) {
      params.shift();
      var snippetName = params.shift();

      db.newSnippet(body.user_id, snippetName, params.join(" ")).then(function() {
        writeResponse("Snippet created with ID " + snippetName, false, res);
      }).catch(sendError);
    } else if (params[0] == "view" && params.length == 2) {
      db.findSnippet(body.user_id, params[1]).then(function(snippet) {
        if (snippet) {
          writeResponse("Snippet found.\n" + snippet.content, false, res);
        } else {
          writeResponse("Snippet not found.", true, res);
        }
      }).catch(sendError);
    } else {
      sendUsage(res);
    }
  } else {
    writeResponse("Command not found! Is the integration setup correctly?", true, res);
  }
}

app.post("/", function(req, res) {
  if (req.body.token === slackToken) {
    processCommand(req.body, res);
  } else {
    res.write("Nope.avi")
    res.end();
  }
});

app.all("*", function(req, res) {
  res.write("This can only be accessed via slack.");
  res.end();
});

app.listen(8080);
