import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const wizardPath = path.join(root, "public/js/lead-wizard.js");
const reviewPath = path.join(root, "public/js/review.js");
const stylesPath = path.join(root, "src/styles/global.css");

test("wizard keeps untrusted user and AI text out of raw HTML templates", async () => {
  const source = await readFile(wizardPath, "utf8");
  assert.match(source, /(?:escapeHtml|escHtml|textContent)/);
  const userInterpolations = source
    .split("\n")
    .filter((line) =>
      /\$\{\s*state\.data\.(?:story|maker|city|name|email|phone)\b/.test(line),
    );
  assert.ok(
    userInterpolations.every((line) => /\.textContent\s*=/.test(line)),
    "user-controlled values may only be interpolated into textContent assignments",
  );
  assert.doesNotMatch(source, /\$\{\s*(?:result|response)\.message\b/);
});

test("review dashboard retains an HTML escaping boundary", async () => {
  const source = await readFile(reviewPath, "utf8");
  assert.match(source, /(?:function\s+esc\s*\(|(?:const|let)\s+esc\s*=)/);
  assert.doesNotMatch(
    source,
    /\$\{\s*lead\.(?:name|email|phone|city|maker|summary|title)\s*(?:\}|\|\||\?\?)/,
  );
});

test("contact step uses native form semantics and guarded submission", async () => {
  const source = await readFile(wizardPath, "utf8");
  assert.match(source, /<form\b/);
  assert.match(source, /autocomplete=["']/);
  assert.match(source, /(?:checkValidity|reportValidity)\s*\(/);
  assert.match(source, /(?:disabled\s*=\s*true|setAttribute\(["']disabled["'])/);
  assert.match(source, /(?:Idempotency-Key|idempotency[_-]?key)/i);
});

test("continuation retries send a stable idempotency key", async () => {
  const source = await readFile(wizardPath, "utf8");
  const start = source.indexOf("async function submitContinuation");
  const end = source.indexOf("\n  function ", start);
  assert.ok(start >= 0, "submitContinuation is missing");
  const continuationSource = source.slice(start, end > start ? end : undefined);
  assert.match(
    continuationSource,
    /state\.continuationRequestKey\s*(?:\|\|=|=)/,
    "the logical upload batch needs a stateful retry key",
  );
  assert.match(
    continuationSource,
    /["']Idempotency-Key["']\s*:\s*state\.continuationRequestKey/,
  );
  assert.match(
    continuationSource,
    /if\s*\(\s*!res\.ok\s*\)[\s\S]*?state\.continuationRequestKey\s*=\s*null/,
    "the key may rotate only after the server accepted the batch",
  );
});

test("pending and partial server results remain retryable", async () => {
  const source = await readFile(wizardPath, "utf8");
  assert.match(source, /\["pending",\s*"partial"\]\.includes\(result\.processing_status\)/);
  assert.match(source, /Kontaktdaten sind gespeichert[\s\S]*Foto wurde noch nicht vollständig übertragen/);
  assert.match(source, /Ergänzungen werden noch verarbeitet/);
});

test("mobile help photos are contained rather than cropped", async () => {
  const styles = await readFile(stylesPath, "utf8");
  assert.match(styles, /\.help-example\s*\{[\s\S]*?position:\s*relative/);
  assert.match(
    styles,
    /\.help-example img\s*\{[\s\S]*?position:\s*absolute[\s\S]*?inset:\s*0[\s\S]*?height:\s*100%[\s\S]*?object-fit:\s*contain/,
  );
});

test("photo quality warnings have a user-controlled override", async () => {
  const source = await readFile(wizardPath, "utf8");
  assert.match(source, /(?:Foto\s+)?trotzdem\s+verwenden/i);
});

test("automatic photo checks require a separate optional consent in the photo step", async () => {
  const source = await readFile(wizardPath, "utf8");
  const styles = await readFile(stylesPath, "utf8");
  assert.match(source, /data-photo-check-consent/);
  assert.match(source, /Automatische Foto-Prüfung nutzen/);
  assert.match(source, /verkleinerte Kopie[\s\S]*?OpenAI/);
  assert.match(source, /Ohne Zustimmung[\s\S]*?technische Merkmale[\s\S]*?Browser/);
  assert.match(source, /aria-describedby="photo-check-consent-note"/);
  assert.match(
    source,
    /state\.photoCheckConsentAccepted\s*=\s*photoCheckConsentInput\.checked/,
  );
  assert.match(
    source,
    /const photoCheckConsent\s*=\s*!state\.consentAccepted/,
    "the early AI-consent choice should disappear after the general consent",
  );
  assert.match(
    styles,
    /\.photo-check-consent\s*\{[\s\S]*?grid-template-columns:[\s\S]*?minmax\(0,\s*1fr\)/,
  );
  assert.match(styles, /\.photo-check-consent input:focus-visible/);
});

test("local-only photo checks never claim that an image is good", async () => {
  const source = await readFile(wizardPath, "utf8");
  const handleStart = source.indexOf("async function handlePhoto");
  const handleEnd = source.indexOf("\n  function simpleScreen", handleStart);
  const handleSource = source.slice(handleStart, handleEnd);
  assert.ok(handleStart >= 0 && handleEnd > handleStart);
  assert.match(
    handleSource,
    /lokale technische Prüfung war unauffällig[\s\S]*?Bildinhalt wurde nicht automatisch geprüft/,
  );
  assert.doesNotMatch(source, /Das Foto ist gut brauchbar\./);
});

test("the first and last relevant photo can reach AI while accessories remain local", async () => {
  const source = await readFile(wizardPath, "utf8");
  const handleStart = source.indexOf("async function handlePhoto");
  const handleEnd = source.indexOf("\n  function simpleScreen", handleStart);
  const handleSource = source.slice(handleStart, handleEnd);
  assert.match(
    handleSource,
    /\(state\.photoCheckConsentAccepted\s*\|\|\s*state\.consentAccepted\)\s*&&[\s\S]*?item\[0\]\s*!==\s*"accessories"[\s\S]*?isAIType\(state\.type\)/,
  );
  assert.doesNotMatch(handleSource, /state\.photoIndex\s*===\s*flow\(\)\.length\s*-\s*1/);
  assert.match(
    handleSource,
    /Zusatzfoto gespeichert\. Es wurde ohne automatische Inhaltsprüfung übernommen\./,
  );
});

test("photo-check accepts only a normal 200 response with an explicit boolean decision", async () => {
  const source = await readFile(wizardPath, "utf8");
  const checkStart = source.indexOf("async function aiCheck");
  const checkEnd = source.indexOf("\n  function advanceAfterAcceptedPhoto", checkStart);
  const checkSource = source.slice(checkStart, checkEnd);
  assert.ok(checkStart >= 0 && checkEnd > checkStart);
  assert.match(checkSource, /res\.status\s*!==\s*200/);
  assert.match(checkSource, /typeof result\.ok\s*===\s*"boolean"/);
  assert.match(checkSource, /\["pending",\s*"partial"\]\.includes/);
  assert.match(checkSource, /throw new Error\("quality_invalid_response"\)/);
});
