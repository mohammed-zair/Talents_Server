const plugin = require("tailwindcss/plugin");

const logicalSpacing = plugin(function ({ matchUtilities, theme }) {
  matchUtilities(
    {
      ps: (value) => ({ paddingInlineStart: value }),
      pe: (value) => ({ paddingInlineEnd: value }),
      ms: (value) => ({ marginInlineStart: value }),
      me: (value) => ({ marginInlineEnd: value }),
      "inset-inline-start": (value) => ({ insetInlineStart: value }),
      "inset-inline-end": (value) => ({ insetInlineEnd: value }),
    },
    { values: theme("spacing") }
  );
});

module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        "soft-ambient": "0 20px 60px -40px rgba(12, 17, 29, 0.45)",
      },
    },
  },
  plugins: [logicalSpacing],
};
