/**
 * tree-sitter grammar for AIGX (AI Genome Exchange).
 *
 * STATUS: source grammar. Run `tree-sitter generate` (and `tree-sitter test`) to build the parser,
 * then publish this directory as a repo so the Zed extension (../zed) can reference it by commit.
 * AIGX is XML-style but tolerant (spec §8.1); this grammar favors highlighting over strict validation.
 *
 * @license MIT
 */
module.exports = grammar({
  name: 'aigx',

  extras: $ => [/[ \t\r\n]+/],

  rules: {
    document: $ => repeat($._content),

    _content: $ => choice(
      $.comment,
      $.element,
      $.entity,
      $.rule_id,
      $.text
    ),

    comment: $ => seq('<!--', repeat(choice(/[^-]+/, /-[^-]/, /--[^>]/)), '-->'),

    element: $ => choice(
      seq($.start_tag, repeat($._content), $.end_tag),
      $.self_closing_tag
    ),

    start_tag: $ => seq('<', field('name', $.tag_name), repeat($.attribute), '>'),
    self_closing_tag: $ => seq('<', field('name', $.tag_name), repeat($.attribute), '/>'),
    end_tag: $ => seq('</', field('name', $.tag_name), '>'),

    tag_name: $ => /[A-Za-z_][A-Za-z0-9_.-]*/,

    attribute: $ => seq(
      field('name', $.attribute_name),
      '=',
      field('value', $.attribute_value)
    ),
    attribute_name: $ => /[A-Za-z_][A-Za-z0-9_.:-]*/,
    attribute_value: $ => seq('"', repeat(choice($.rule_id, $.entity, $._attr_text)), '"'),
    _attr_text: $ => token.immediate(prec(-1, /[^"&]+/)),

    // PREFIX-SLUG rule identifier (spec §9); preferred over generic text where it appears.
    rule_id: $ => token(prec(2, /[A-Za-z][A-Za-z0-9]*-[A-Za-z0-9-]+/)),

    entity: $ => /&(?:lt|gt|amp|quot|apos|#[0-9]+|#x[0-9A-Fa-f]+);/,

    text: $ => token(prec(-2, /[^<&]+/))
  }
})
