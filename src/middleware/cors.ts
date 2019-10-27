import { logWithDate } from "../resolvers/Utils/stringUtil"

if (process.env.MODE == "DEPLOY") {
  var whitelist = [
    "https://pickk.one",
    "https://www.pickk.one",
    "pickk.one",
    "https://pickkapiserver.online",
    "http://pickkapiserver.online",
    "pickkapiserver.online",
    "15.165.26.117",
    "15.165.26.117:80",
    "52.78.116.92",
    "52.78.116.92:80"
  ]
}

var corsOptions = {
  origin: function(origin, callback) {
    if (process.env.MODE != "DEPLOY") callback(null, true)
    else {
      if (whitelist.indexOf(origin) !== -1) {
        callback(null, true)
      } else {
        logWithDate(`[CORS] ${origin} Not allowed by CORS`)
        callback(new Error("Not allowed by CORS"))
      }
    }
  }
}

module.exports = corsOptions
