#!/usr/bin/env deno run --allow-read --allow-env --allow-net --allow-write --allow-run
/**
 * This tool allows a quick way to measure the size of the minified, .gzipped bundle
 * of quantity-math-js. Just run it (it's marked as executable).
 */
import * as esbuild from "https://deno.land/x/esbuild@v0.20.1/mod.js";

const testsDir = import.meta.dirname + "/";
const outFile = `${testsDir}/mod.min.js`;

await esbuild.build({
    entryPoints: ["mod.ts"],
    bundle: true,
    minify: true,
    target: "es2020",
    outfile: outFile,
    format: "esm",
});
console.log("Created mod.min.js");
console.log("Validating it...");
const { Q } = await import(outFile);
if (Q`10 m`.add(Q(`15 cm`)).toString() !== "10.15 m") {
    throw new Error("Minified version doesn't work.");
}
const minifiedSource = await Deno.readFile(outFile);
const minifiedSizeQ = Q(`${minifiedSource.byteLength} B`);
console.log(`Size: ${minifiedSizeQ.convert("KiB").toString()}`);

// GZip
const instream = ReadableStream.from([minifiedSource]).pipeThrough(new CompressionStream("gzip"));
let gzippedSize = 0;
for await (const chunk of instream) {
    gzippedSize += chunk.byteLength;
}
const gzippedSizeQ = Q(`${gzippedSize} B`);
console.log(`Size: ${gzippedSizeQ.convert("KiB").toString()}`);
