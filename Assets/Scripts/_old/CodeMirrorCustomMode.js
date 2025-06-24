class CodeMirrorCustomMode {
  constructor() {
    this.indentUnit = 2;
  }

  startState() {
    return { depth: 0 };
  }

  token(stream, state) {
    if (stream.sol()) stream.eatSpace();

    const line = stream.string.trim();
    const endsWithBrace = /\{\s*$/.test(stream.string);

    if (line.includes('}')) {
      state.depth = Math.max(0, state.depth - 1);
    }
    if (line.includes('{')) {
      state.depth++;
    }

    stream.skipToEnd();
    return null;
  }

  indent(state, textAfter) {
    const trimmed = textAfter.trim();
    const deindent = trimmed.startsWith('}') ? 1 : 0;
    const result = Math.max(0, state.depth - deindent) * this.indentUnit;
    return result;
  }
}
