'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import React, { useEffect } from 'react';
import './RichTextEditor.css';

const MenuBar = ({ editor }) => {
    if (!editor) return null;

    return (
        <div className="tiptap-toolbar">
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={editor.isActive('bold') ? 'is-active' : ''}
            >
                B
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={editor.isActive('italic') ? 'is-active' : ''}
            >
                I
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}
            >
                H2
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                className={editor.isActive('heading', { level: 3 }) ? 'is-active' : ''}
            >
                H3
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={editor.isActive('bulletList') ? 'is-active' : ''}
            >
                List
            </button>
        </div>
    );
};

const RichTextEditor = ({ content, onChange }) => {
    const editor = useEditor({
        extensions: [StarterKit],
        content: content,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
    });

    // Update content when props change
    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            editor.commands.setContent(content);
        }
    }, [content, editor]);

    return (
        <div className="tiptap-editor-wrapper">
            <MenuBar editor={editor} />
            <EditorContent editor={editor} className="tiptap-content" />
        </div>
    );
};

export default RichTextEditor;
