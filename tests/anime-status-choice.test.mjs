// node --experimental-vm-modules --test tests/anime-status-choice.test.mjs
// Execute production orchestration with isolated API/dialog mocks; no personal data.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { SourceTextModule, SyntheticModule } from "node:vm";
import ts from "typescript";

async function fixture({ titleStatus = "pending", suggestion = "watching", contentSuggestion = "watching", answers = [true, true], increased = true, finished = false, upcoming = 0, flow = "progress", contentStatus = "pending", afterPatch = {} } = {}) {
  const before = {
    title: { id: "anime", name: "Anime", kind: "anime", status: titleStatus, suggestedStatus: suggestion, progress: { availableCompleted: false, upcomingCount: upcoming } },
    contents: [{ id: "season", name: "T1", status: contentStatus, canonStatus: "canon", position: 0, suggestedStatus: contentSuggestion, watchedEpisodes: 0 }],
    sessions: [],
  };
  let state = structuredClone(before);
  state.contents[0].watchedEpisodes = increased ? 3 : 0;
  state.title.progress.availableCompleted = finished;
  Object.assign(state.contents[0], afterPatch);
  const writes = [], prompts = [];
  const answerQueue = [...answers];
  const api = {
    updateContent: async (id, input) => {
      writes.push(["content", id, input.status]);
      state = { ...state, contents: [{ ...state.contents[0], status: input.status }] };
      return state;
    },
    updateTitle: async (id, input) => {
      writes.push(["title", id, input.status]);
      state = { ...state, title: { ...state.title, status: input.status } };
      return state;
    },
    setTitleStatus: async (id, status) => api.updateTitle(id, { status }),
  };
  const mocks = {
    "../ui/inferredStatus": {
      confirmInferredStatusChange: async (...args) => {
        prompts.push(args);
        assert.ok(answerQueue.length, "Unexpected extra confirmation");
        return answerQueue.shift();
      },
      chooseInferredStatus: async (...args) => { prompts.push(args); return null; },
    },
    "./api": { mediaApi: api },
    "./presentation": { statusLabel: (value) => value, contentStatusLabel: (value) => value },
  };
  const source = readFileSync(new URL("../src/media/statusChoice.ts", import.meta.url), "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = new SourceTextModule(output);
  await module.link((specifier) => {
    const values = mocks[specifier];
    assert.ok(values, `Unexpected import ${specifier}`);
    return new SyntheticModule(Object.keys(values), function () {
      for (const [name, value] of Object.entries(values)) this.setExport(name, value);
    });
  });
  await module.evaluate();
  const result = flow === "state" ? await module.namespace.resolveContentStateSuggestion(before, state) : await module.namespace.resolveContentProgressStatus(before, state, "season");
  return { result, writes, prompts };
}

test("partial registration asks for both content and pending anime", async () => {
  const { result, writes, prompts } = await fixture();
  assert.equal(prompts.length, 2);
  assert.deepEqual(writes, [["content", "season", "watching"], ["title", "anime", "watching"]]);
  assert.equal(result.contents[0].watchedEpisodes, 3);
});

test("keeping both states preserves the new history/progress", async () => {
  const { result, writes } = await fixture({ answers: [false, false] });
  assert.deepEqual(writes, []);
  assert.equal(result.title.status, "pending");
  assert.equal(result.contents[0].watchedEpisodes, 3);
});

test("anime can be started independently from content confirmation", async () => {
  const { result, writes } = await fixture({ answers: [false, true] });
  assert.deepEqual(writes, [["title", "anime", "watching"]]);
  assert.equal(result.contents[0].status, "pending");
});

test("completed season with another pending season still prompts for anime", async () => {
  const { writes } = await fixture({ contentSuggestion: "completed" });
  assert.deepEqual(writes, [["content", "season", "completed"], ["title", "anime", "watching"]]);
});

test("an already correct content does not prevent the anime prompt", async () => {
  const { prompts, writes } = await fixture({ contentSuggestion: null, answers: [true] });
  assert.equal(prompts.length, 1);
  assert.deepEqual(writes, [["title", "anime", "watching"]]);
});

test("other manual anime states get no new pending-state prompt", async () => {
  for (const titleStatus of ["paused", "watching", "waitingContent", "completed", "dropped", "toResume"]) {
    const { prompts, writes } = await fixture({ titleStatus, answers: [false] });
    assert.equal(prompts.length, 1);
    assert.deepEqual(writes, []);
  }
});

test("date-only edits do not repeat confirmation", async () => {
  const { prompts, writes } = await fixture({ increased: false, answers: [] });
  assert.deepEqual(prompts, []);
  assert.deepEqual(writes, []);
});

test("completion still takes priority over watching", async () => {
  const { result, prompts } = await fixture({ suggestion: "completed", contentSuggestion: "completed", finished: true, answers: [true] });
  assert.equal(prompts.length, 1);
  assert.equal(result.title.status, "completed");
});

test("future-content choice does not trigger a second watching suggestion", async () => {
  const { result, prompts } = await fixture({ suggestion: "waitingContent", contentSuggestion: "completed", finished: true, upcoming: 1, answers: [true] });
  assert.equal(prompts.length, 2);
  assert.equal(result.title.status, "pending");
});

test("content state changes ask once and only write the accepted anime state", async () => {
  for (const [contentStatus, suggestion] of [["dropped", "dropped"], ["paused", "paused"], ["pending", "pending"], ["watching", "watching"], ["waitingContent", "waitingContent"]]) {
    const { result, writes, prompts } = await fixture({ flow: "state", titleStatus: "completed", contentStatus: "completed", afterPatch: { status: contentStatus }, suggestion, answers: [true] });
    assert.equal(prompts.length, 1);
    assert.deepEqual(writes, [["title", "anime", suggestion]]);
    assert.equal(result.contents[0].status, contentStatus);
  }
});

test("keeping the anime state does not undo the content change", async () => {
  const { result, writes, prompts } = await fixture({ flow: "state", afterPatch: { status: "dropped" }, suggestion: "dropped", answers: [false] });
  assert.equal(prompts.length, 1);
  assert.deepEqual(writes, []);
  assert.equal(result.title.status, "pending");
  assert.equal(result.contents[0].status, "dropped");
});

test("metadata edits and already matching states do not prompt", async () => {
  for (const afterPatch of [{ name: "Nuevo nombre" }, { score: 8.5 }, { releasedOn: "2025-01-01" }]) {
    const { writes, prompts } = await fixture({ flow: "state", afterPatch, answers: [] });
    assert.deepEqual(writes, []); assert.deepEqual(prompts, []);
  }
  const { prompts } = await fixture({ flow: "state", titleStatus: "watching", afterPatch: { status: "watching" }, answers: [] });
  assert.deepEqual(prompts, []);
});

test("inclusion and order changes can update the suggestion", async () => {
  for (const afterPatch of [{ canonStatus: "omitted" }, { position: 2 }]) {
    const { prompts, writes } = await fixture({ flow: "state", afterPatch, suggestion: "dropped", answers: [true] });
    assert.equal(prompts.length, 1); assert.deepEqual(writes, [["title", "anime", "dropped"]]);
  }
});

test("newly available content retains the existing resume confirmation", async () => {
  const { result, prompts, writes } = await fixture({ flow: "state", titleStatus: "waitingContent", contentStatus: "waitingContent", afterPatch: { status: "pending" }, suggestion: "toResume", answers: [true] });
  assert.equal(prompts.length, 1);
  assert.equal(result.title.status, "toResume");
  assert.deepEqual(writes, [["title", "anime", "toResume"]]);
});
