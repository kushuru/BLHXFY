const ip = require('ip')

const someHostList = [
  '*.google.com',
  '*.twitter.com',
  'twitter.com',
  'csp.withgoogle.com',
  '*.google-analytics.com',
  'www.gstatic.com',
  'dmm.com',
  '*.dmm.com'
]

const gameExtraHostList = [
  'cdn-connect.mobage.jp',
  'cdn-widget.mobage.jp',
  'connect.mobage.jp',
  'platform.twitter.com'
]

const localIp = ip.address()

module.exports = function ({ apiHostNames, staticHostNames, staticServer, frontAgent, port, frontAgentHost, frontAgentPort }) {
  const condition1 = apiHostNames.map(name => {
    return `shExpMatch(host, "${name}")`
  }).join('||')
  const condition2 = staticHostNames.map(name => {
    return `shExpMatch(host, "${name}")`
  }).join('||')
  const condition3 = someHostList.map(name => {
    return `shExpMatch(host, "${name}")`
  }).join('||')
  const condition4 = gameExtraHostList.map(name => {
    return `shExpMatch(host, "${name}")`
  }).join('||')

  const getScript = (condition) => (conditionEx) => (result) => {
    const template = `
      function FindProxyForURL(url, host) {
        if (isInNet(dnsResolve(host),"127.0.0.1","255.255.255.0")) {
          return "DIRECT";
        }
        if (shExpMatch(host, "${localIp}") || isPlainHostName(host)) {
          return "DIRECT";
        }
        if (${condition} || ${conditionEx}) {
          return "PROXY ${localIp}:${port};DIRECT";
        }
        if (${frontAgent} && (${condition2} || ${condition4} || ${condition3})) {
          return "PROXY ${localIp}:${frontAgentPort}; PROXY 127.0.0.1:${frontAgentPort}; DIRECT"
        }
        if (!${frontAgent} && (${condition3})) {
          return "${localIp}:1080; PROXY ${localIp}:8094; PROXY ${localIp}:8123; PROXY ${localIp}:8099; PROXY ${localIp}:8080; PROXY 127.0.0.1:1080; DIRECT";
        }
        return "${result}";
      }
    `
    return template
  }

  let script = getScript(condition1)
  if (staticServer) {
    script = script(condition2)
  } else {
    script = script('false')
  }
  if (frontAgent) {
    script = script(`DIRECT; PROXY ${localIp}:${frontAgentPort}; PROXY 127.0.0.1:${frontAgentPort}`)
  } else {
    script = script(`DIRECT; PROXY ${localIp}:${frontAgentPort}; PROXY 127.0.0.1:${frontAgentPort}`)
  }
  return script
}
