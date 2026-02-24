import React, { useEffect, useRef, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { githubDark } from "@uiw/codemirror-theme-github";

type Props = {
  value: string;
  onChange: (v: string) => void;
  extensions?: any[];
  reverseMode?: boolean;
};

const ReverseEditor: React.FC<Props> = ({
  value,
  onChange,
  extensions = [],
  reverseMode = true,
}) => {
  const editorRef = useRef<any>(null);
  const [localCode, setLocalCode] = useState<string>(value || "");

  useEffect(() => {
    setLocalCode(value || "");
  }, [value]);

  useEffect(() => {
    const view = editorRef.current?.view;
    if (!view) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!reverseMode) return;
      const key = e.key;
      if (!key) return;

      if (
        (key.length === 1 && key.match(/[\x20-\x7E]/)) ||
        key === "Backspace" ||
        key === "Enter"
      ) {
        e.preventDefault();
        e.stopPropagation();

        const state = view.state;
        const cursorPos = state.selection.main.head;
        const line = state.doc.lineAt(cursorPos);
        const lineIndex = line.number - 1;

        const lines = localCode.split("\n");
        let currentLine = lines[lineIndex] || "";

        const getLineStartPos = (index: number) => {
          if (index <= 0) return 0;
          return lines.slice(0, index).join("\n").length + 1;
        };

        if (key === "Backspace") {
          currentLine = currentLine.slice(1);
        } else if (key === "Enter") {
          // Always behave like Enter was pressed at the start of the line:
          // create a new blank line ABOVE the current line.
          lines.splice(lineIndex, 0, "");
        } else {
          // For reverse mode we prepend the typed character so displayed reversed text
          // shows characters appearing from right-to-left.
          currentLine = key + currentLine;
        }

        if (key !== "Enter") {
          lines[lineIndex] = currentLine;
        }
        const newCode = lines.join("\n");
        setLocalCode(newCode);
        onChange(newCode);

        if (key === "Enter") {
          setTimeout(() => {
            const newLineStartPos = getLineStartPos(lineIndex);
            view.dispatch({
              selection: { anchor: newLineStartPos },
              scrollIntoView: true,
            });
          }, 0);
        }
      }
    };

    const dom = view.dom;
    dom.addEventListener("keydown", handleKeyDown as any, { capture: true });
    return () =>
      dom.removeEventListener("keydown", handleKeyDown as any, {
        capture: true,
      } as any);
  }, [localCode, onChange, reverseMode]);

  return (
    <CodeMirror
      ref={editorRef}
      value={localCode}
      theme={githubDark}
      basicSetup={{ lineNumbers: true }}
      onChange={(v) => {
        // Paste / normal edits (we allow paste to be normal even in reverse mode)
        const next = v || "";
        setLocalCode(next);
        onChange(next);
      }}
      extensions={extensions}
      className="h-full w-full"
    />
  );
};

export default ReverseEditor;
