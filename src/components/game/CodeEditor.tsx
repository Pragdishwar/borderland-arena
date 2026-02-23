import React, { useState, useRef } from 'react';
import { Play } from 'lucide-react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { cpp } from '@codemirror/lang-cpp';
import { java } from '@codemirror/lang-java';
import { githubDark } from '@uiw/codemirror-theme-github';
import axios from 'axios';

type Props = {
  round?: number; // enable reverse mode when round === 3
};

const languageExtensions: Record<string, any> = {
  python: python(),
  cpp: cpp(),
  java: java(),
  javascript: javascript(),
};

const supportedLanguages: Record<string, string> = {
  python: 'Python',
  cpp: 'Cpp',
  java: 'Java',
  javascript: 'JavaScript',
};

const reverseString = (s: string) => s.split('').reverse().join('');

const CodeEditor: React.FC<Props> = ({ round = 1 }) => {
  const [language, setLanguage] = useState('python');
  const [isExecuting, setIsExecuting] = useState(false);
  const [editorCode, setEditorCode] = useState('');
  const editorRef = useRef<any>(null);
  const [result, setResult] = useState<any>(null);

  const reverseMode = round === 3;

  const executeCode = async (code: string, language: string) => {
    setIsExecuting(true);
    const languageMap: Record<string, string> = {
      python: 'python',
      cpp: 'cpp',
      java: 'java',
      javascript: 'javascript',
    };

    const apiLanguage = languageMap[language] || language;

    const requestBody = {
      language: apiLanguage,
      version: '*',
      files: [{ name: 'main', content: code }],
      stdin: '',
      args: [],
    };

    try {
      const { data } = await axios.post('https://emkc.org/api/v2/piston/execute', requestBody, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (data.run?.stdout?.length) {
        setResult(prev => ({ ...prev, output: data.run.output, success: true }));
      } else if (data.run?.stderr?.length) {
        setResult(prev => ({ ...prev, error: data.run.output, success: false }));
      }
    } catch (error) {
      setResult(prev => ({ ...prev, error: 'internal error', success: false }));
    } finally {
      setIsExecuting(false);
    }
  };

  const handleEditorChange = (value: string) => {
    if (reverseMode) {
      // store the reversed representation so the editor shows reversed text
      setEditorCode(reverseString(value));
    } else {
      setEditorCode(value);
    }
  };

  const handleRunClick = () => {
    // When reverseMode is active we stored the reversed string in state,
    // so reverse it back before executing.
    const codeToSend = reverseMode ? reverseString(editorCode) : editorCode;
    executeCode(codeToSend, language);
  };

  return (
    <div className="w-1/2 space-y-4 flex flex-col max-h-[calc(100vh-100px)] overflow-hidden">
      <div className="bg-[#131324] p-4 rounded-lg flex-1 flex flex-col overflow-hidden">
        <div className="flex justify-between items-center mb-2">
          <div className="text-cyan-400 font-medium text-base">{'</>'} Code</div>
          <select
            className="bg-gray-800 text-cyan-400 p-1 rounded outline-none"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            {Object.keys(supportedLanguages).map((lang) => (
              <option key={lang} value={lang}>
                {supportedLanguages[lang]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-auto rounded-md">
          <CodeMirror
            ref={editorRef}
            value={reverseMode ? reverseString(editorCode) : editorCode}
            extensions={languageExtensions[language] ? [languageExtensions[language]] : []}
            theme={githubDark}
            basicSetup={{ lineNumbers: true }}
            onChange={(value) => handleEditorChange(value)}
            className="h-full w-full"
          />
        </div>
      </div>

      <div className="flex justify-end mb-5 mr-5">
        <button
          onClick={handleRunClick}
          disabled={isExecuting}
          className={`bg-cyan-400 text-gray-900 px-4 py-2 rounded-lg flex items-center gap-2 cursor-pointer
                    ${isExecuting ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Play size={16} />
          {isExecuting ? 'Running...' : 'Run Code'}
        </button>
      </div>

      {result && (result.output || result.error) && (
        <div className="bg-[#101828] text-white mt-4 p-4 rounded-lg max-h-96 overflow-auto border border-cyan-400">
          <div className={`font-semibold w-fit px-3 py-1 rounded text-white mb-2 ${result.success ? 'bg-green-400' : 'bg-red-500'}`}>
            {result.success ? 'Output:' : 'Error:'}
          </div>
          <pre className={`whitespace-pre-wrap text-sm ${result.success ? 'text-green-400' : 'text-red-500'} font-bold`}>
            {result.success ? result.output : result.error}
          </pre>
        </div>
      )}
    </div>
  );
};

export default CodeEditor;
