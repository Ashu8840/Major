import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import Quill from "quill";
import "quill/dist/quill.snow.css";

const defaultModules = {
  toolbar: [
    [{ header: [1, 2, 3, 4, false] }],
    [{ font: [] }],
    [{ size: ["small", false, "large", "huge"] }],
    ["bold", "italic", "underline", "strike"],
    [{ color: [] }, { background: [] }],
    [{ align: [] }],
    [{ list: "ordered" }, { list: "bullet" }],
    ["blockquote", "code-block"],
    ["link"],
    ["clean"],
  ],
};

const defaultFormats = [
  "header",
  "font",
  "size",
  "bold",
  "italic",
  "underline",
  "strike",
  "color",
  "background",
  "align",
  "list",
  "blockquote",
  "code-block",
  "link",
];

const RichTextEditor = forwardRef(
  (
    {
      value = "",
      onChange,
      modules = defaultModules,
      formats = defaultFormats,
      placeholder = "",
      className = "",
    },
    ref
  ) => {
    const containerRef = useRef(null);
    const quillRef = useRef(null);
    const lastHtml = useRef(value);

    const setQuillHTML = (instance, html) => {
      if (!instance) return;
      const normalizedHTML = typeof html === "string" && html.trim().length
        ? html
        : "<p><br></p>";
      const delta = instance.clipboard.convert(normalizedHTML);
      instance.setContents(delta, "silent");
      lastHtml.current = instance.root.innerHTML;
    };

    useEffect(() => {
      if (!containerRef.current || quillRef.current) return;

      const wrapper = containerRef.current;
      const editorNode = document.createElement("div");
      wrapper.innerHTML = "";
      wrapper.appendChild(editorNode);

      const quill = new Quill(editorNode, {
        theme: "snow",
        modules,
        formats,
        placeholder,
      });

      quill.root.classList.add("creator-editor-root");
      quill.root.style.direction = "ltr";
      quill.root.style.textAlign = "left";
      quill.root.style.unicodeBidi = "plaintext";
      quill.root.style.whiteSpace = "pre-wrap";

      quillRef.current = quill;

      setQuillHTML(quill, value);
      quill.history.clear();

      const handleChange = () => {
        const html = quill.root.innerHTML;
        lastHtml.current = html;
        onChange?.(html);
      };

      quill.on("text-change", handleChange);

      return () => {
        quill.off("text-change", handleChange);
        quillRef.current = null;
        wrapper.innerHTML = "";
      };
    }, [modules, formats, placeholder, value, onChange]);

    useEffect(() => {
      const quill = quillRef.current;
      if (!quill) return;
      if (value === lastHtml.current) return;

      const selection = quill.getSelection();
      setQuillHTML(quill, value);

      if (selection) {
        const length = quill.getLength();
        const nextIndex = Math.min(selection.index, Math.max(0, length - 1));
        quill.setSelection(nextIndex, selection.length, "silent");
      }
    }, [value]);

    useImperativeHandle(ref, () => ({
      getEditor: () => quillRef.current,
      focus: () => {
        quillRef.current?.focus();
      },
      setHTML: (html) => {
        if (!quillRef.current) return;
        setQuillHTML(quillRef.current, html);
        onChange?.(quillRef.current.root.innerHTML);
      },
    }));

    return <div ref={containerRef} className={className} />;
  }
);

RichTextEditor.displayName = "RichTextEditor";

export default RichTextEditor;
export { defaultModules as richTextModules, defaultFormats as richTextFormats };
