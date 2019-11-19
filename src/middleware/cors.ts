var logger = require("../tools/logger")

if (process.env.MODE == "DEPLOY") {
  var whitelist = [
    "https://pickk.one",
    "https://www.pickk.one",
    "www.pickk.one",
    "pickk.one",
    "https://pickkapiserver.online",
    "http://pickkapiserver.online",
    "www.pickkapiserver.online",
    "pickkapiserver.online",
    "https://pickk-cli.greatsumini.now.sh",
    "http://pickk-cli.greatsumini.now.sh",
    "www.pickk-cli.greatsumini.now.sh",
    "pickk-cli.greatsumini.now.sh",
    process.env.ELB_IP1,
    process.env.ELB_IP2,
    process.env.ELB_IP3,
    process.env.ELB_IP1 + ":80",
    process.env.ELB_IP2 + ":80",
    process.env.ELB_IP3 + ":80"
  ]
}

var corsOptions = {
  origin: function(origin, callback) {
    if (process.env.MODE != "DEPLOY") callback(null, true)
    else {
      if (whitelist.indexOf(origin) !== -1) {
        callback(null, true)
      } else {
        logger.warn(`[CORS] ${origin} Not allowed by CORS`)
        callback(new Error(`[CORS] ${origin} Not allowed by CORS`))
      }
    }
  }
}

module.exports = corsOptions
