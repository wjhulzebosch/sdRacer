class CodeMirrorCustomMode {
  constructor() {
    console.log('CodeMirrorCustomMode constructor');
    this.indentUnit = 2;
  }

  startState() {
    console.log('CodeMirrorCustomMode startState called');
    return { depth: 0 };
  }

  token(stream, state) {
    console.log('CodeMirrorCustomMode token called, stream.pos:', stream.pos, 'stream.string:', stream.string);
    if (stream.sol()) stream.eatSpace();

    const line = stream.string.trim();
    const endsWithBrace = /\{\s*$/.test(stream.string);

    console.log('Line:', line, 'current depth:', state.depth);

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
    console.log('Final indentation result:', result);
    return result;
  }
}
