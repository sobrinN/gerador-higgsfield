use std::collections::BTreeMap;
use std::fmt;

#[derive(Debug, Clone, PartialEq)]
pub enum JsonValue {
    Null,
    Bool(bool),
    Number(f64),
    Str(String),
    Array(Vec<JsonValue>),
    Object(BTreeMap<String, JsonValue>),
}

impl JsonValue {
    pub fn obj() -> Self {
        JsonValue::Object(BTreeMap::new())
    }

    pub fn arr() -> Self {
        JsonValue::Array(Vec::new())
    }

    pub fn insert(&mut self, key: &str, val: JsonValue) {
        if let JsonValue::Object(ref mut map) = self {
            map.insert(key.to_string(), val);
        }
    }

    pub fn push(&mut self, val: JsonValue) {
        if let JsonValue::Array(ref mut list) = self {
            list.push(val);
        }
    }

    pub fn get(&self, key: &str) -> Option<&JsonValue> {
        match self {
            JsonValue::Object(map) => map.get(key),
            _ => None,
        }
    }

    pub fn as_str(&self) -> Option<&str> {
        match self {
            JsonValue::Str(s) => Some(s.as_str()),
            _ => None,
        }
    }

    pub fn as_bool(&self) -> Option<bool> {
        match self {
            JsonValue::Bool(b) => Some(*b),
            _ => None,
        }
    }

    pub fn as_f64(&self) -> Option<f64> {
        match self {
            JsonValue::Number(n) => Some(*n),
            _ => None,
        }
    }

    pub fn as_array(&self) -> Option<&Vec<JsonValue>> {
        match self {
            JsonValue::Array(a) => Some(a),
            _ => None,
        }
    }

    pub fn as_object(&self) -> Option<&BTreeMap<String, JsonValue>> {
        match self {
            JsonValue::Object(o) => Some(o),
            _ => None,
        }
    }

    pub fn is_null(&self) -> bool {
        matches!(self, JsonValue::Null)
    }

    pub fn to_json_string(&self) -> String {
        let mut out = String::new();
        self.write_json(&mut out);
        out
    }

    fn write_json(&self, out: &mut String) {
        match self {
            JsonValue::Null => out.push_str("null"),
            JsonValue::Bool(b) => out.push_str(if *b { "true" } else { "false" }),
            JsonValue::Number(n) => {
                if n.is_finite() {
                    if n.fract() == 0.0 && n.abs() < 1e15 {
                        out.push_str(&format!("{:.0}", n));
                    } else {
                        out.push_str(&n.to_string());
                    }
                } else {
                    out.push_str("null");
                }
            }
            JsonValue::Str(s) => {
                escape_json_str(s, out);
            }
            JsonValue::Array(items) => {
                out.push('[');
                for (i, item) in items.iter().enumerate() {
                    if i > 0 {
                        out.push(',');
                    }
                    item.write_json(out);
                }
                out.push(']');
            }
            JsonValue::Object(map) => {
                out.push('{');
                for (i, (k, v)) in map.iter().enumerate() {
                    if i > 0 {
                        out.push(',');
                    }
                    escape_json_str(k, out);
                    out.push(':');
                    v.write_json(out);
                }
                out.push('}');
            }
        }
    }

    pub fn parse(input: &str) -> Result<JsonValue, String> {
        let chars: Vec<char> = input.chars().collect();
        let mut pos = 0;
        skip_ws(&chars, &mut pos);
        let val = parse_value(&chars, &mut pos)?;
        skip_ws(&chars, &mut pos);
        if pos < chars.len() {
            return Err(format!("Unexpected trailing character at position {}", pos));
        }
        Ok(val)
    }
}

impl fmt::Display for JsonValue {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.to_json_string())
    }
}

pub fn escape_json_str(s: &str, out: &mut String) {
    out.push('"');
    for ch in s.chars() {
        match ch {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            '\u{08}' => out.push_str("\\b"),
            '\u{0C}' => out.push_str("\\f"),
            c if (c as u32) < 0x20 => {
                out.push_str(&format!("\\u{:04x}", c as u32));
            }
            c => out.push(c),
        }
    }
    out.push('"');
}

fn skip_ws(chars: &[char], pos: &mut usize) {
    while *pos < chars.len() && chars[*pos].is_whitespace() {
        *pos += 1;
    }
}

fn parse_value(chars: &[char], pos: &mut usize) -> Result<JsonValue, String> {
    skip_ws(chars, pos);
    if *pos >= chars.len() {
        return Err("Unexpected end of JSON input".to_string());
    }
    match chars[*pos] {
        'n' => parse_literal(chars, pos, "null", JsonValue::Null),
        't' => parse_literal(chars, pos, "true", JsonValue::Bool(true)),
        'f' => parse_literal(chars, pos, "false", JsonValue::Bool(false)),
        '"' => parse_string(chars, pos).map(JsonValue::Str),
        '[' => parse_array(chars, pos),
        '{' => parse_object(chars, pos),
        '-' | '0'..='9' => parse_number(chars, pos),
        c => Err(format!("Unexpected character '{}' at position {}", c, *pos)),
    }
}

fn parse_literal(
    chars: &[char],
    pos: &mut usize,
    expected: &str,
    result: JsonValue,
) -> Result<JsonValue, String> {
    for ch in expected.chars() {
        if *pos >= chars.len() || chars[*pos] != ch {
            return Err(format!("Expected '{}' at position {}", expected, *pos));
        }
        *pos += 1;
    }
    Ok(result)
}

fn parse_string(chars: &[char], pos: &mut usize) -> Result<String, String> {
    if chars[*pos] != '"' {
        return Err(format!("Expected '\"' at position {}", *pos));
    }
    *pos += 1;
    let mut s = String::new();
    while *pos < chars.len() {
        let ch = chars[*pos];
        *pos += 1;
        if ch == '"' {
            return Ok(s);
        }
        if ch == '\\' {
            if *pos >= chars.len() {
                return Err("Unterminated escape sequence in string".to_string());
            }
            let esc = chars[*pos];
            *pos += 1;
            match esc {
                '"' => s.push('"'),
                '\\' => s.push('\\'),
                '/' => s.push('/'),
                'b' => s.push('\u{08}'),
                'f' => s.push('\u{0C}'),
                'n' => s.push('\n'),
                'r' => s.push('\r'),
                't' => s.push('\t'),
                'u' => {
                    if *pos + 4 > chars.len() {
                        return Err("Invalid \\uXXXX escape in string".to_string());
                    }
                    let hex: String = chars[*pos..*pos + 4].iter().collect();
                    *pos += 4;
                    let code = u32::from_str_radix(&hex, 16)
                        .map_err(|_| format!("Invalid hex escape \\u{}", hex))?;
                    if let Some(decoded) = char::from_u32(code) {
                        s.push(decoded);
                    }
                }
                other => s.push(other),
            }
        } else {
            s.push(ch);
        }
    }
    Err("Unterminated JSON string".to_string())
}

fn parse_number(chars: &[char], pos: &mut usize) -> Result<JsonValue, String> {
    let start = *pos;
    if chars[*pos] == '-' {
        *pos += 1;
    }
    while *pos < chars.len()
        && (chars[*pos].is_ascii_digit()
            || chars[*pos] == '.'
            || chars[*pos] == 'e'
            || chars[*pos] == 'E'
            || chars[*pos] == '+'
            || chars[*pos] == '-')
    {
        if (chars[*pos] == '+' || chars[*pos] == '-') && *pos > start {
            let prev = chars[*pos - 1];
            if prev != 'e' && prev != 'E' {
                break;
            }
        }
        *pos += 1;
    }
    let num_str: String = chars[start..*pos].iter().collect();
    let val = num_str
        .parse::<f64>()
        .map_err(|_| format!("Invalid number '{}' at position {}", num_str, start))?;
    Ok(JsonValue::Number(val))
}

fn parse_array(chars: &[char], pos: &mut usize) -> Result<JsonValue, String> {
    *pos += 1; // skip '['
    skip_ws(chars, pos);
    let mut arr = Vec::new();
    if *pos < chars.len() && chars[*pos] == ']' {
        *pos += 1;
        return Ok(JsonValue::Array(arr));
    }
    loop {
        let item = parse_value(chars, pos)?;
        arr.push(item);
        skip_ws(chars, pos);
        if *pos >= chars.len() {
            return Err("Unterminated JSON array".to_string());
        }
        match chars[*pos] {
            ',' => {
                *pos += 1;
                skip_ws(chars, pos);
            }
            ']' => {
                *pos += 1;
                return Ok(JsonValue::Array(arr));
            }
            c => return Err(format!("Expected ',' or ']' in array, got '{}'", c)),
        }
    }
}

fn parse_object(chars: &[char], pos: &mut usize) -> Result<JsonValue, String> {
    *pos += 1; // skip '{'
    skip_ws(chars, pos);
    let mut map = BTreeMap::new();
    if *pos < chars.len() && chars[*pos] == '}' {
        *pos += 1;
        return Ok(JsonValue::Object(map));
    }
    loop {
        skip_ws(chars, pos);
        if *pos >= chars.len() || chars[*pos] != '"' {
            return Err(format!("Expected string key in object at position {}", *pos));
        }
        let key = parse_string(chars, pos)?;
        skip_ws(chars, pos);
        if *pos >= chars.len() || chars[*pos] != ':' {
            return Err(format!("Expected ':' after object key '{}' at position {}", key, *pos));
        }
        *pos += 1;
        let val = parse_value(chars, pos)?;
        map.insert(key, val);
        skip_ws(chars, pos);
        if *pos >= chars.len() {
            return Err("Unterminated JSON object".to_string());
        }
        match chars[*pos] {
            ',' => {
                *pos += 1;
                skip_ws(chars, pos);
            }
            '}' => {
                *pos += 1;
                return Ok(JsonValue::Object(map));
            }
            c => return Err(format!("Expected ',' or '}}' in object, got '{}'", c)),
        }
    }
}
