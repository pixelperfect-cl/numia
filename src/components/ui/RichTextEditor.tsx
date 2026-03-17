import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import { Button } from '@/components/ui/button'
import {
    Bold,
    Italic,
    List,
    ListOrdered,
    Quote,
    Undo,
    Redo,
    Link as LinkIcon,
    Image as ImageIcon,
    Code,
    Heading1,
    Heading2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'

interface RichTextEditorProps {
    content: string
    onChange: (content: string) => void
    onImageUpload?: (file: File) => Promise<string>
    placeholder?: string
    editable?: boolean
    className?: string
}

export function RichTextEditor({
    content,
    onChange,
    onImageUpload,
    placeholder = 'Escribe aquí...',
    editable = true,
    className
}: RichTextEditorProps) {
    const [isUploading, setIsUploading] = useState(false)

    const editor = useEditor({
        extensions: [
            StarterKit,
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-primary underline cursor-pointer',
                },
            }),
            Image.configure({
                HTMLAttributes: {
                    class: 'rounded-md max-w-full my-4 border',
                },
            }),
        ],
        content: content,
        editable: editable,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML())
        },
        editorProps: {
            attributes: {
                class: cn(
                    "prose prose-sm dark:prose-invert max-w-none min-h-[150px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                    !editable && "border-none px-0 focus-visible:ring-0"
                ),
            },
            handlePaste: (view, event, slice) => {
                if (!onImageUpload) return false

                const items = Array.from(event.clipboardData?.items || [])
                const imageItem = items.find(item => item.type.startsWith('image'))

                if (imageItem) {
                    event.preventDefault()
                    const file = imageItem.getAsFile()
                    if (file) {
                        setIsUploading(true)
                        onImageUpload(file)
                            .then(url => {
                                const { schema } = view.state
                                const node = schema.nodes.image.create({ src: url })
                                const transaction = view.state.tr.replaceSelectionWith(node)
                                view.dispatch(transaction)
                            })
                            .catch(err => console.error("Failed to upload image pasted", err))
                            .finally(() => setIsUploading(false))
                    }
                    return true
                }
                return false
            },
            handleDrop: (view, event, slice, moved) => {
                if (!onImageUpload || moved) return false;

                const hasFiles = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0;
                if (!hasFiles) return false;

                event.preventDefault();

                const images = Array.from(event.dataTransfer?.files || []).filter(file => file.type.startsWith('image'));

                if (images.length > 0) {
                    setIsUploading(true);
                    // Upload first image for now
                    const file = images[0];
                    onImageUpload(file)
                        .then(url => {
                            const { schema } = view.state;
                            const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
                            if (coordinates) {
                                const node = schema.nodes.image.create({ src: url });
                                const transaction = view.state.tr.insert(coordinates.pos, node);
                                view.dispatch(transaction);
                            }
                        })
                        .catch(err => console.error("Failed to upload image dropped", err))
                        .finally(() => setIsUploading(false));
                    return true;
                }
                return false;
            }
        },
    })

    // Sync content if it changes externally (e.g. initial load)
    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            // Avoid loop if content is mostly same but just minor diffs? 
            // Ideally we only set content if editor is empty or forcefully reset
            if (editor.isEmpty && content) {
                editor.commands.setContent(content)
            }
        }
    }, [content, editor])

    if (!editor) {
        return null
    }

    if (!editable) {
        return <EditorContent editor={editor} />
    }

    const addImage = () => {
        if (!onImageUpload) return;

        const input = document.createElement('input')
        input.type = 'file'
        input.accept = 'image/*'
        input.onchange = async () => {
            if (input.files?.length) {
                const file = input.files[0]
                setIsUploading(true)
                try {
                    const url = await onImageUpload(file)
                    editor.chain().focus().setImage({ src: url }).run()
                } catch (error) {
                    console.error(error)
                } finally {
                    setIsUploading(false)
                }
            }
        }
        input.click()
    }

    const setLink = () => {
        const previousUrl = editor.getAttributes('link').href
        const url = window.prompt('URL', previousUrl)

        if (url === null) {
            return
        }

        if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run()
            return
        }

        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }

    return (
        <div className={cn("border rounded-md overflow-hidden bg-background", className)}>
            <div className="flex flex-wrap gap-1 p-2 border-b bg-muted/40">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => editor.chain().focus().toggleBold().run()} disabled={!editor.can().chain().focus().toggleBold().run()} data-active={editor.isActive('bold') ? 'is-active' : undefined}>
                    <Bold className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => editor.chain().focus().toggleItalic().run()} disabled={!editor.can().chain().focus().toggleItalic().run()} data-active={editor.isActive('italic') ? 'is-active' : undefined}>
                    <Italic className="h-4 w-4" />
                </Button>
                <div className="w-px h-6 bg-border mx-1 my-auto" />
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} data-active={editor.isActive('heading', { level: 1 }) ? 'is-active' : undefined}>
                    <Heading1 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} data-active={editor.isActive('heading', { level: 2 }) ? 'is-active' : undefined}>
                    <Heading2 className="h-4 w-4" />
                </Button>
                <div className="w-px h-6 bg-border mx-1 my-auto" />
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => editor.chain().focus().toggleBulletList().run()} data-active={editor.isActive('bulletList') ? 'is-active' : undefined}>
                    <List className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => editor.chain().focus().toggleOrderedList().run()} data-active={editor.isActive('orderedList') ? 'is-active' : undefined}>
                    <ListOrdered className="h-4 w-4" />
                </Button>
                <div className="w-px h-6 bg-border mx-1 my-auto" />
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={setLink} data-active={editor.isActive('link') ? 'is-active' : undefined}>
                    <LinkIcon className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={addImage} title="Insertar Imagen">
                    <ImageIcon className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => editor.chain().focus().toggleBlockquote().run()} data-active={editor.isActive('blockquote') ? 'is-active' : undefined}>
                    <Quote className="h-4 w-4" />
                </Button>
            </div>
            <div className="relative">
                <EditorContent editor={editor} className="min-h-[150px] p-2" />
                {isUploading && (
                    <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                        <span className="text-sm font-medium animate-pulse">Subiendo imagen...</span>
                    </div>
                )}
            </div>

            <style>{`
                .ProseMirror p.is-editor-empty:first-child::before {
                    color: #adb5bd;
                    content: attr(data-placeholder);
                    float: left;
                    height: 0;
                    pointer-events: none;
                }
                .ProseMirror:focus {
                    outline: none;
                }
                /* Basic Typography for Tiptap */
                .ProseMirror h1 { font-size: 1.5rem; font-weight: bold; margin-bottom: 0.5rem; }
                .ProseMirror h2 { font-size: 1.25rem; font-weight: bold; margin-bottom: 0.5rem; }
                .ProseMirror ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 0.5rem; }
                .ProseMirror ol { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 0.5rem; }
                .ProseMirror blockquote { border-left: 3px solid #e2e8f0; padding-left: 1rem; font-style: italic; }
                .ProseMirror img { max-width: 100%; height: auto; border-radius: 0.375rem; }
                .ProseMirror a { color: #0ea5e9; text-decoration: underline; }
            `}</style>
        </div>
    )
}
