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
      '       `curl echoip.com`\n' +
      '       `curl -i \'https://musicbrainz.org/ws/2/artist/?query=area:Argentina\'`\n' +
      '       `curl -A "Googlebot/2.1 (+http://www.google.com/bot.html)" https://google.com`\n' +
      '       `curl -i -I -H "X-First-Name: Joe" http://192.168.0.1/`\n'
    )
    return w.toString()
  }
  if (typeof c.T_URL == "undefined")
    return w
      .comment("curl-to-php: try 'curl --help' for more information")
      .toString()
  var i, h = (typeof c.T_HEADER == "string" ? [c.T_HEADER] : c.T_HEADER).map(unquote)
  var f = {
    CURLOPT_RETURNTRANSFER: false,
    CURLOPT_HEADER: false,
    CURLOPT_CONNECTTIMEOUT: 150,
    CURLOPT_HTTP_VERSION: 'CURL_HTTP_VERSION_1_1',
  }
  if (typeof c.T_URL == "string")
    f['CURLOPT_URL'] = unquote(c.T_URL)
  if (typeof c.T_HTTP10 != "undefined")
    f['CURLOPT_HTTP_VERSION'] = 'CURL_HTTP_VERSION_1_0'
  if (typeof c.T_HTTP2 != "undefined")
    f['CURLOPT_HTTP_VERSION'] = 'CURL_HTTP_VERSION_2_0'
  if (typeof c.T_USER_AGENT != "undefined")
    f['CURLOPT_USERAGENT'] = unquote(c.T_USER_AGENT)
  if (typeof c.T_INCLUDE != "undefined")
    f['CURLOPT_HEADER'] = true
  if (typeof c.T_HEAD != "undefined") {
    f['CURLOPT_NOBODY'] = true
    delete f['CURLOPT_FILE']
    delete f['CURLOPT_INFILE']
  }
  w = w.curl_init().curl_setopt(f).curl_setheaders(h) 
  if (typeof c.T_URL == "string") w = w.curl_exec(); else
    for (i = 0; i < c.T_URL.length; i++) w = w.curl_exec(c.T_URL[i])
  w = w.curl_close()
  return w.toString()
  function unquote(s) {
    return s.replace(/^['"]+|['"]+$/g, '')
  }
}

curl_to_php.tokenize = function(c) {
  var i, t, s = {}, o = 0
  c = c.trim()
  if (c[0] == '$' || c[0] == '#') c = c.substr(1).trim()
  while (o < c.length) {
    t = curl_to_php.tokenize.match(c.substring(o))
    if (!t) break
    o = o + t.length
    if (typeof s[t.token] == "undefined") s[t.token] = t.match
    else s[t.token] = [s[t.token], t.match]
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
  T_HELP: /(?:\s+|^)(-h|--help)(\s+|$)/,

  T_HTTP10: /(?:\s+|^)(-0|--http1.0)(\s+|$)/,
  T_HTTP11: /(?:\s+|^)(--http1.1)(\s+|$)/,
  T_HTTP2: /(?:\s+|^)(--http2)(\s+|$)/,

  T_INCLUDE: /\s*(-i|--include)(\s+|$)/,
  T_HEAD: /(?:\s+|^)(-I|--head)(\s+|$)/,
  T_HEADER: /(?:\s+|^)(?:-H|--header)\s+(['"].+['"]|[^\s]+)(\s+|$)/,
  T_METHOD: /(?:\s+|^)(?:-X|--method)\s+(['"].+['"]|[^\s]+)(\s+|$)/,
  T_USER_AGENT: /(?:\s+|^)(?:-A|--user-agent)\s+(['"].+['"]|[^\s]+)(\s+|$)/,

  // URL must be the last one
  T_URL: /^\s*(?!-)(["'-A-Za-z0-9+&@#/%?=~_|!:,.;]+)(\s+|$)/,
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
  this.s += "curl_close($curl);\n"
  return this
}

curl_to_php.PHPWriter.prototype.curl_setopt = function(o) {
  this.s += "curl_setopt_array($curl, " + this.array(o) + ");\n"
  return this
}

curl_to_php.PHPWriter.prototype.curl_setheaders = function(s) {
  this.s += "curl_setopt($curl, CURLOPT_HTTPHEADER, " + this.seq(s) + ");\n"
  return this
}

curl_to_php.PHPWriter.prototype.curl_exec = function(u) {
  if (typeof u == "string")
    this.s += "curl_setopt($curl, CURLOPT_URL, " + this.param(u) + ");\n"
  this.s += "curl_exec($curl);\n"
         +  "if (curl_errno()) {\n"
         +  "   throw new \\RuntimeException(sprintf('cURL error %s: %s'"
         +  ", curl_errno(), curl_error()));\n"
         +  "}\n"
  return this
}

curl_to_php.PHPWriter.prototype.param = function(v) {
  if (typeof v == "boolean") return v ? 'true' : 'false'
  if (typeof v == "string") {
    if (v == v.toUpperCase()) return v
    return "'" + v + "'"
  }
  return v
}

curl_to_php.PHPWriter.prototype.array = function(a) {
  var k, l = []
  for (k in a) {
    if (!a.hasOwnProperty(k)) continue
    l.push("   " + this.param(k) + " => " + this.param(a[k]) + ",")
  }
  return "array(\n" + l.join("\n") + "\n)"
}

curl_to_php.PHPWriter.prototype.seq = function(a) {
  var i, l = []
  for (i = 0; i < a.length; i++) {
    l.push("   " + this.param(a[i]) + ",")
  }
  return "array(\n" + l.join("\n") + "\n)"
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
