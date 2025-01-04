import esbuild from "esbuild";
import htmlPlugin from "@chialab/esbuild-plugin-html";
import cssImportPlugin from "@chialab/esbuild-plugin-css-import";
import fs from "fs";

// Add a custom plugin to handle font files
const fontPlugin = {
  name: "font-loader",
  setup(build) {
    build.onLoad({ filter: /\.(woff2?|ttf|eot|otf)$/ }, async (args) => {
      return {
        contents: await fs.promises.readFile(args.path),
        loader: "file",
      };
    });
  },
};

// Add removeConsolePlugin
const removeConsolePlugin = {
  name: "remove-console",
  setup(build) {
    build.onLoad({ filter: /\.js$/ }, async (args) => {
      const source = await fs.promises.readFile(args.path, "utf8");
      const contents = source.replace(
        /console\.(log|debug|info|warn|error)\((.*?)\);?/g,
        ""
      );
      return { contents, loader: "js" };
    });
  },
};

console.time("T");

await esbuild
  .build({
    entryPoints: ["src/index.html"],
    bundle: true,
    minify: true,
    outdir: "dist",
    metafile: true,
    loader: {
      ".woff": "file",
      ".woff2": "file",
      ".ttf": "file",
      ".eot": "file",
      ".otf": "file",
      ".png": "file",
    },
    assetNames: "assets/[name]-[hash]",
    plugins: [
      htmlPlugin({
        minify: true,
        minifyOptions: {
          collapseWhitespace: true,
          removeComments: true,
          removeEmptyAttributes: true,
          removeRedundantAttributes: true,
          sortAttributes: true,
          removeEmptyElements: false,
          collapseBooleanAttributes: true,
        },
      }),
      cssImportPlugin({
        minify: true,
        minifyOptions: {
          preset: [
            "default",
            {
              discardComments: { removeAll: true },
              discardDuplicates: true,
              discardEmpty: true,
              minifyFontValues: true,
              minifyGradients: true,
              minifyParams: true,
              minifySelectors: true,
              normalizeCharset: true,
              normalizeDisplayValues: true,
              normalizePositions: true,
              normalizeRepeatStyle: true,
              normalizeString: true,
              normalizeTimingFunctions: true,
              normalizeUnicode: true,
              normalizeUrl: true,
              normalizeWhitespace: true,
              orderedValues: true,
              reduceInitial: true,
              reduceTransforms: true,
              svgo: true,
              uniqueSelectors: true,
              mergeRules: true,
              mergeLonghand: true,
              mergeIdents: true,
              colormin: true,
              convertValues: true,
            },
          ],
        },
      }),
      fontPlugin,
      removeConsolePlugin,
    ],
  })
  .then(() => {
    console.timeEnd("T");
    console.log("Built Successfully 🚀");
  })
  .catch((err) => {
    console.error("ESBuild Error:", err);
    process.exit(1);
  });
