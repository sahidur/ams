"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { Underline } from "@tiptap/extension-underline";
import { TextAlign } from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { Highlight } from "@tiptap/extension-highlight";
import { Placeholder } from "@tiptap/extension-placeholder";
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  Strikethrough,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Table as TableIcon,
  Highlighter,
  Undo,
  Redo,
  Plus,
  Minus,
  Trash2,
  ChevronDown,
  Type
} from "lucide-react";
import { useState } from "react";

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  availableFields?: { fieldName: string; fieldLabel: string }[];
  className?: string;
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = "Start typing...",
  availableFields = [],
  className = "",
}: RichTextEditorProps) {
  const [showFieldDropdown, setShowFieldDropdown] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      TextStyle,
      Highlight.configure({
        multicolor: true,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[200px] p-4",
      },
    },
  });

  if (!editor) {
    return null;
  }

  const insertField = (fieldName: string) => {
    editor.chain().focus().insertContent(`{{${fieldName}}}`).run();
    setShowFieldDropdown(false);
  };

  return (
    <div className={`border rounded-lg overflow-hidden bg-white ${className}`}>
      {/* Toolbar */}
      <div className="border-b bg-gray-50 p-2 flex flex-wrap items-center gap-1">
        {/* Undo/Redo */}
        <div className="flex items-center gap-0.5 border-r pr-2 mr-1">
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Undo"
          >
            <Undo className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Redo"
          >
            <Redo className="w-4 h-4" />
          </ToolbarButton>
        </div>

        {/* Text formatting */}
        <div className="flex items-center gap-0.5 border-r pr-2 mr-1">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive("bold")}
            title="Bold"
          >
            <Bold className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive("italic")}
            title="Italic"
          >
            <Italic className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            isActive={editor.isActive("underline")}
            title="Underline"
          >
            <UnderlineIcon className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            isActive={editor.isActive("strike")}
            title="Strikethrough"
          >
            <Strikethrough className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            isActive={editor.isActive("highlight")}
            title="Highlight"
          >
            <Highlighter className="w-4 h-4" />
          </ToolbarButton>
        </div>

        {/* Headings */}
        <div className="flex items-center gap-0.5 border-r pr-2 mr-1">
          <select
            className="text-sm border rounded px-2 py-1 bg-white"
            value={
              editor.isActive("heading", { level: 1 })
                ? "h1"
                : editor.isActive("heading", { level: 2 })
                ? "h2"
                : editor.isActive("heading", { level: 3 })
                ? "h3"
                : "p"
            }
            onChange={(e) => {
              if (e.target.value === "p") {
                editor.chain().focus().setParagraph().run();
              } else {
                const level = parseInt(e.target.value.replace("h", "")) as 1 | 2 | 3;
                editor.chain().focus().toggleHeading({ level }).run();
              }
            }}
          >
            <option value="p">Paragraph</option>
            <option value="h1">Heading 1</option>
            <option value="h2">Heading 2</option>
            <option value="h3">Heading 3</option>
          </select>
        </div>

        {/* Lists */}
        <div className="flex items-center gap-0.5 border-r pr-2 mr-1">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive("bulletList")}
            title="Bullet List"
          >
            <List className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive("orderedList")}
            title="Numbered List"
          >
            <ListOrdered className="w-4 h-4" />
          </ToolbarButton>
        </div>

        {/* Alignment */}
        <div className="flex items-center gap-0.5 border-r pr-2 mr-1">
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
            isActive={editor.isActive({ textAlign: "left" })}
            title="Align Left"
          >
            <AlignLeft className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
            isActive={editor.isActive({ textAlign: "center" })}
            title="Align Center"
          >
            <AlignCenter className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
            isActive={editor.isActive({ textAlign: "right" })}
            title="Align Right"
          >
            <AlignRight className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign("justify").run()}
            isActive={editor.isActive({ textAlign: "justify" })}
            title="Justify"
          >
            <AlignJustify className="w-4 h-4" />
          </ToolbarButton>
        </div>

        {/* Table */}
        <div className="flex items-center gap-0.5 border-r pr-2 mr-1">
          <div className="relative group">
            <ToolbarButton title="Insert Table">
              <TableIcon className="w-4 h-4" />
              <ChevronDown className="w-3 h-3 ml-0.5" />
            </ToolbarButton>
            <div className="absolute top-full left-0 hidden group-hover:block bg-white border rounded-lg shadow-lg p-2 z-10 min-w-[180px]">
              <button
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 rounded flex items-center gap-2"
                onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
              >
                <Plus className="w-4 h-4" />
                Insert 3x3 Table
              </button>
              {editor.isActive("table") && (
                <>
                  <hr className="my-1" />
                  <button
                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 rounded"
                    onClick={() => editor.chain().focus().addColumnAfter().run()}
                  >
                    Add Column After
                  </button>
                  <button
                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 rounded"
                    onClick={() => editor.chain().focus().addRowAfter().run()}
                  >
                    Add Row After
                  </button>
                  <button
                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 rounded text-red-600"
                    onClick={() => editor.chain().focus().deleteColumn().run()}
                  >
                    Delete Column
                  </button>
                  <button
                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 rounded text-red-600"
                    onClick={() => editor.chain().focus().deleteRow().run()}
                  >
                    Delete Row
                  </button>
                  <button
                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 rounded text-red-600"
                    onClick={() => editor.chain().focus().deleteTable().run()}
                  >
                    <Trash2 className="w-4 h-4 inline mr-2" />
                    Delete Table
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Insert Field */}
        {availableFields.length > 0 && (
          <div className="relative">
            <button
              className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700"
              onClick={() => setShowFieldDropdown(!showFieldDropdown)}
            >
              <Type className="w-4 h-4" />
              Insert Field
              <ChevronDown className="w-3 h-3" />
            </button>
            {showFieldDropdown && (
              <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg z-20 min-w-[200px] max-h-[300px] overflow-auto">
                {availableFields.map((field) => (
                  <button
                    key={field.fieldName}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 border-b last:border-b-0"
                    onClick={() => insertField(field.fieldName)}
                  >
                    <span className="font-medium text-indigo-600">{`{{${field.fieldName}}}`}</span>
                    <span className="block text-xs text-gray-500">{field.fieldLabel}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Editor Content */}
      <EditorContent editor={editor} />

      {/* Field Legend */}
      {availableFields.length > 0 && (
        <div className="border-t bg-gray-50 p-2 text-xs text-gray-500">
          <span className="font-medium">Available fields:</span>{" "}
          {availableFields.map((f, i) => (
            <span key={f.fieldName}>
              <code className="bg-indigo-100 text-indigo-700 px-1 rounded">
                {`{{${f.fieldName}}}`}
              </code>
              {i < availableFields.length - 1 && ", "}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

interface ToolbarButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title?: string;
  dark?: boolean;
}

function ToolbarButton({
  children,
  onClick,
  isActive = false,
  disabled = false,
  title,
  dark = false,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded transition-colors ${
        dark
          ? `text-white ${isActive ? "bg-white/20" : "hover:bg-white/10"}`
          : `${
              isActive
                ? "bg-indigo-100 text-indigo-700"
                : "text-gray-700 hover:bg-gray-200"
            }`
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {children}
    </button>
  );
}

export default RichTextEditor;
