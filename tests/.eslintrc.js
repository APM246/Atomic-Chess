module.exports = {
  env: {
    browser: true,
    es2021: true,
    jquery: true,
  },
  extends: [
    'airbnb-base',
  ],
  parserOptions: {
    ecmaVersion: 12,
  },
  rules: {
    "max-classes-per-file": ["error", 10],
    "linebreak-style": ["error", "windows"],
    "indent": ["error", 4],
    "max-len": ["warn", 180],
    "quotes": ["error", "double"],
    "no-restricted-syntax": ["error", "ForInStatement", "LabeledStatement", "WithStatement"],
    "arrow-parens": "off",
    "default-case": "off",
    "no-plusplus": "off",
    "no-underscore-dangle": "off",
    "no-param-reassign": "off",
    "prefer-destructuring": "off",
    "class-methods-use-this": "off",
    "no-unused-vars": "warn",
    "space-before-function-paren": "off",
  },
};
