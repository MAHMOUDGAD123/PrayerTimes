import esbuild from "esbuild";
import htmlPlugin from "@chialab/esbuild-plugin-html";
import cssImportPlugin from "@chialab/esbuild-plugin-css-import";

console.time("T");

await esbuild
  .build({
    entryPoints: ["src/index.html"],
    bundle: true,
    minify: true,
    metafile: true,
    outdir: "dist",
    target: ["es2020"],
    platform: "browser",
    drop: ["console"],
    loader: {
      ".woff": "file",
      ".woff2": "file",
      ".ttf": "file",
      ".eot": "file",
      ".otf": "file",
      ".png": "file",
      ".svg": "file",
      ".ico": "file",
    },
    assetNames: "[dir]/[name]",
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
    ],
  })
  .then(() => {
    console.timeEnd("T");
    console.log("Built Successfully ⚡");
  })
  .catch((err) => {
    console.error("ESBuild Error:", err);
    process.exit(1);
  });
