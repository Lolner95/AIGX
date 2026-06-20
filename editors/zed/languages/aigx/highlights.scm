; AIGX highlight queries for Zed (against editors/tree-sitter-aigx).

(tag_name) @tag
(attribute_name) @attribute
(attribute_value) @string
(rule_id) @constant
(entity) @string.escape
(comment) @comment

"<"  @punctuation.bracket
">"  @punctuation.bracket
"</" @punctuation.bracket
"/>" @punctuation.bracket
"="  @operator

; emphasize the critical salience marker: pri="CRIT"
((attribute
   (attribute_name) @_pri
   (attribute_value) @keyword)
 (#eq? @_pri "pri"))
