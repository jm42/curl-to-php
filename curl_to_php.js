/*! cURL to PHP */

curl_to_php = {}

curl_to_php.transform = function(c, w) {
  c = curl_to_php.tokenize(c)
  if (!w) w = curl_to_php.php_writter()
  if (typeof c.T_BINARY == "undefined") return w.toString()
  if (typeof c.T_VERSION != "undefined")
    return w.version(c.T_BINARY).toString()
    if (typeof c.T_HELP != "undefined") {
      w.comment('\n' +
        'NAME\n' +
        '       curl-to-php - transform curl command to PHP source code\n\n' +
        'EXAMPLES\n' +
        '       `curl --version`' +
        '\n'
      )
      return w.toString()
    }
  if (typeof c.T_URL == "undefined")
    return w
      .comment("curl-to-php: try 'curl --help' for more information")
      .toString()
  var f = {
    CURLOPT_URL: c.T_URL,
    CURLOPT_RETURNTRANSFER: false,
    CURLOPT_HEADER: false,
    CURLOPT_CONNECTTIMEOUT: 150,
  }
  return w.curl_init().curl_setopt(f).curl_exec().curl_close().toString()
}

curl_to_php.tokenize = function(c) {
  var i, t, s = {}, o = 0
  c = c.trim()
  if (c[0] == '$' || c[0] == '#') c = c.substr(1).trim()
  while (o < c.length) {
    t = curl_to_php.tokenize.match(c.substring(o))
    if (!t) break
    o = o + t.length
    s[t.token] = t.match
  }
  return s
}

curl_to_php.tokenize.match = function(c) {
  var t, d, s = curl_to_php.tokenize.tokens
  for (t in s) {
    if (!s.hasOwnProperty(t)) continue
    d = c.match(s[t])
    if (d) return {token: t, match: d[1], length: d[0].length}
  }
}

curl_to_php.tokenize.tokens = {
  T_BINARY: /^(curl)(\s+|$)/,
  T_VERSION: /\s*(-V|--version)(\s+|$)/,
  T_HELP: /\s*(-h|--help)(\s+|$)/,
  T_URL: /^\s*(?!-)([-A-Za-z0-9+&@#/%?=~_|!:,.;]+)(\s+|$)/,
}

curl_to_php.php_writter = function() {
  return new curl_to_php.PHPWriter()
}

curl_to_php.PHPWriter = function() {
  this.s = "<?php // cURL to PHP - ISC license\n\n"
}

curl_to_php.PHPWriter.prototype.toString = function() {
  return this.s
}

curl_to_php.PHPWriter.prototype.comment = function(c) {
  var i = 0, l = c.split("\n")
  for (; i < l.length; i++) this.s += "// " + l[i] + "\n"
  this.s += "\n"
  return this
}

curl_to_php.PHPWriter.prototype.version = function(b) {
  this.s += "$ret = exec('" + b + " --version', $out);\n"
         +  "$ver = $ret ? current(explode(\"\\n\", $out)) : 'curl 42';\n\n"
         +  "if (version_compare($ver, '7.47.0', '>=')) {\n   print('OK');\n}"
  return this
}

curl_to_php.PHPWriter.prototype.curl_init = function() {
  this.s += "$curl = curl_init();\n"
  return this
}

curl_to_php.PHPWriter.prototype.curl_close = function() {
  this.s += "if (curl_errno()) {\n"
         +  "   throw new \\RuntimeException(sprintf('cURL error %s: %s'\n"
         +  "      , curl_errno()\n"
         +  "      , curl_error()\n"
         +  "   ));\n"
         +  "}\n"
         +  "curl_close($curl);\n"
  return this
}

curl_to_php.PHPWriter.prototype.curl_setopt = function(o) {
  var k, a = []
  for (k in o) {
    if (!o.hasOwnProperty(k)) continue
    a.push("   '" + k + "' => " + param(o[k]) + ",")
  }
  this.s += "curl_setopt_array($curl, array(\n" + a.join("\n") + "\n));\n"
  return this
  function param(v) {
    if (typeof v == "boolean") return v ? 'true' : 'false'
    if (typeof v == "string") return "'" + v + "'"
    return v
  }
}

curl_to_php.PHPWriter.prototype.curl_exec = function() {
  this.s += "curl_exec($curl);\n"
  return this
}

curl_to_php.tokenize_test = function() {
  var e, a, p = curl_to_php.tokenize_test.data
  for (c in p) {
    if (!p.hasOwnProperty(c)) continue
    console.log('Testing "' + c + '"')
    a = curl_to_php.tokenize(c)
    if (cmp(p[c], a)) console.log('OK')
    else {
      console.error({exp: p[c], act: a})
      return false
    }
  }
  return true
  function cmp(a, b) {
    var k
    if (a.length != b.length) return false
    for (k in a) if (a[k] !== b[k]) return false
    return true
  }
}

curl_to_php.tokenize_test.data = {
  'carl': {},
  'curl': {T_BINARY: 'curl'},
  'curl -V': {T_BINARY: 'curl', T_VERSION: '-V'},
  'curl --version': {T_BINARY: 'curl', T_VERSION: '--version'},
  'curl echoip.com': {T_BINARY: 'curl', T_URL: 'echoip.com'},
}
