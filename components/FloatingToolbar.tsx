import React, { useRef, useEffect, useState } from 'react';
import { Highlighter, Palette, Bold, Italic, Underline as UnderlineIcon, Strikethrough, CheckSquare, Heading1, Heading2, Type, ChevronDown } from 'lucide-react';

export const fontFamilies = [
    { name: 'Standard', value: 'Inter, sans-serif' },
    { name: 'Modern', value: 'Space Grotesk, sans-serif' },
    { name: 'Elegant', value: 'Playfair Display, serif' },
    { name: 'Technical', value: 'JetBrains Mono, monospace' },
    { name: 'Handwritten', value: 'cursive' }
];

export const fontSizes = [
    { label: '8', value: '1' },
    { label: '10', value: '2' },
    { label: '12', value: '3' },
    { label: '14', value: '4' },
    { label: '18', value: '5' },
    { label: '24', value: '6' },
    { label: '36', value: '7' }
];

export const textColors = [
    { name: 'Slate', value: '#334155' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Amber', value: '#f59e0b' },
    { name: 'Green', value: '#22c55e' },
    { name: 'Emerald', value: '#10b981' },
    { name: 'Teal', value: '#14b8a6' },
    { name: 'Cyan', value: '#06b6d4' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Indigo', value: '#6366f1' },
    { name: 'Violet', value: '#8b5cf6' },
    { name: 'Purple', value: '#a855f7' },
    { name: 'Fuchsia', value: '#d946ef' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Rose', value: '#f43f5e' },
    { name: 'Clear', value: 'transparent' }
];

export const highlightColors = [
    { name: 'Yellow', value: '#fef3c7' },
    { name: 'Green', value: '#dcfce7' },
    { name: 'Blue', value: '#dbeafe' },
    { name: 'Pink', value: '#fce7f3' },
    { name: 'Orange', value: '#ffedd5' },
    { name: 'Clear', value: 'transparent' }
];

export const FloatingToolbar = () => {
    const [pickerPos, setPickerPos] = useState<{ x: number, y: number } | null>(null);
    const savedRange = useRef<Range | null>(null);

    useEffect(() => {
        const handleSelection = () => {
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            
            // Only show if the selection is inside a contenteditable
            let isEditable = false;
            let node = range.commonAncestorContainer;
            while (node) {
              if (node.nodeType === 1 && (node as HTMLElement).getAttribute('contenteditable') === 'true') {
                isEditable = true;
                break;
              }
              node = node.parentNode as Node;
            }

            if (isEditable && rect.width > 0) {
              setPickerPos({
                x: rect.left + (rect.width / 2),
                y: rect.top - 10
              });
              savedRange.current = range.cloneRange();
            } else {
              setPickerPos(null);
            }
          } else {
            setPickerPos(null);
          }
        };

        const handleMouseUp = () => setTimeout(handleSelection, 10);
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'Shift' || e.key.startsWith('Arrow')) {
                setTimeout(handleSelection, 10);
            }
        };

        document.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('keyup', handleKeyUp);
        
        return () => {
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    const applyTextColor = (color: string) => {
        const selection = window.getSelection();
        if (!selection || !savedRange.current) return;
        
        selection.removeAllRanges();
        selection.addRange(savedRange.current);

        if (color === 'transparent') {
            document.execCommand('removeFormat', false, undefined);
        } else {
            document.execCommand('foreColor', false, color);
        }

        selection.removeAllRanges();
        savedRange.current = null;
        setPickerPos(null);
    };

    const applyHighlightColor = (color: string) => {
        const selection = window.getSelection();
        if (!selection || !savedRange.current) return;
        
        selection.removeAllRanges();
        selection.addRange(savedRange.current);

        if (color === 'transparent') {
            document.execCommand('backColor', false, 'transparent');
        } else {
            document.execCommand('hiliteColor', false, color); // hiliteColor for standard browsers
            document.execCommand('backColor', false, color);
        }

        selection.removeAllRanges();
        savedRange.current = null;
        setPickerPos(null);
    };

    const applyFormat = (command: string, value?: string) => {
        const selection = window.getSelection();
        if (!selection || !savedRange.current) return;
        
        selection.removeAllRanges();
        selection.addRange(savedRange.current);

        document.execCommand(command, false, value);

        // Keep selection active to allow combining formats
        savedRange.current = selection.getRangeAt(0).cloneRange();
    };

    const applyHeading = (level: string) => {
        applyFormat('formatBlock', level);
    };

    const insertChecklist = () => {
        const selection = window.getSelection();
        if (!selection || !savedRange.current) return;
        
        selection.removeAllRanges();
        selection.addRange(savedRange.current);

        const html = `<ul style="list-style-type: none; padding-left: 0; margin-top: 4px; margin-bottom: 4px;"><li style="display: flex; gap: 8px; align-items: flex-start;"><span contenteditable="false" class="task-checkbox" style="cursor: pointer; user-select: none;">⬜</span><span>List item</span></li></ul><div><br></div>`;
        document.execCommand('insertHTML', false, html);
        
        savedRange.current = null;
        setPickerPos(null);
    };

    if (!pickerPos) return null;

    return (
        <div 
            className="fixed z-[9999] bg-white/95 backdrop-blur p-2 rounded-2xl shadow-2xl border border-slate-200 flex flex-wrap gap-3 items-center animate-in fade-in zoom-in slide-in-from-bottom-2 duration-200"
            style={{ left: pickerPos.x, top: pickerPos.y, transform: 'translateX(-50%) translateY(-100%)', maxWidth: '90vw' }}
            onMouseDown={(e) => e.preventDefault()}
        >
            <div className="flex gap-1 items-center border-r border-slate-200 pr-2">
                <div className="relative group/font">
                    <button className="flex items-center gap-1 px-2 py-1 hover:bg-slate-100 rounded text-[10px] font-bold text-slate-600 transition-colors">
                        <Type size={12} /> <ChevronDown size={10} />
                    </button>
                    <div className="absolute hidden group-hover/font:block top-full left-0 bg-white border border-slate-200 rounded-lg shadow-xl p-1 min-w-[120px] mt-1">
                        {fontFamilies.map(f => (
                            <button 
                                key={f.value}
                                onClick={() => applyFormat('fontName', f.value)}
                                className="w-full text-left px-2 py-1.5 hover:bg-slate-50 rounded text-[10px] font-medium"
                                style={{ fontFamily: f.value }}
                            >
                                {f.name}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="relative group/size">
                    <button className="flex items-center gap-1 px-2 py-1 hover:bg-slate-100 rounded text-[10px] font-bold text-slate-600 transition-colors">
                        Size <ChevronDown size={10} />
                    </button>
                    <div className="absolute hidden group-hover/size:block top-full left-0 bg-white border border-slate-200 rounded-lg shadow-xl p-1 min-w-[60px] mt-1">
                        {fontSizes.map(s => (
                            <button 
                                key={s.value}
                                onClick={() => applyFormat('fontSize', s.value)}
                                className="w-full text-left px-2 py-1.5 hover:bg-slate-50 rounded text-[10px] font-medium"
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex gap-2 items-center">
                <button
                    onClick={() => applyHeading('H1')}
                    className="p-1 hover:bg-slate-100 rounded text-slate-600 transition-colors font-bold"
                    title="Heading 1"
                >
                    <Heading1 size={14} />
                </button>
                <button
                    onClick={() => applyHeading('H2')}
                    className="p-1 hover:bg-slate-100 rounded text-slate-600 transition-colors font-bold"
                    title="Heading 2"
                >
                    <Heading2 size={14} />
                </button>
                <div className="w-px h-4 bg-slate-200 self-center mx-1" />
                <button
                    onClick={() => applyFormat('bold')}
                    className="p-1 hover:bg-slate-100 rounded text-slate-600 transition-colors"
                    title="Bold"
                >
                    <Bold size={14} />
                </button>
                <button
                    onClick={() => applyFormat('italic')}
                    className="p-1 hover:bg-slate-100 rounded text-slate-600 transition-colors"
                    title="Italic"
                >
                    <Italic size={14} />
                </button>
                <button
                    onClick={() => applyFormat('underline')}
                    className="p-1 hover:bg-slate-100 rounded text-slate-600 transition-colors"
                    title="Underline"
                >
                    <UnderlineIcon size={14} />
                </button>
                <button
                    onClick={() => applyFormat('strikeThrough')}
                    className="p-1 hover:bg-slate-100 rounded text-slate-600 transition-colors"
                    title="Strikethrough"
                >
                    <Strikethrough size={14} />
                </button>
                <div className="w-px h-4 bg-slate-200 self-center mx-1" />
                <button
                    onClick={insertChecklist}
                    className="p-1 hover:bg-slate-100 rounded text-slate-600 transition-colors"
                    title="Insert Checklist"
                >
                    <CheckSquare size={14} />
                </button>
            </div>
            <div className="w-px h-5 bg-slate-200 self-center" />
            <div className="flex gap-2 items-center">
                <Palette size={14} className="text-slate-400" />
                <div className="flex gap-1">
                {textColors.map(color => (
                    <button 
                        key={color.value}
                        className={`w-5 h-5 rounded-full border border-black/5 hover:scale-110 transition-transform ${color.value === 'transparent' ? 'bg-slate-100 flex items-center justify-center' : ''}`}
                        style={{ backgroundColor: color.value === 'transparent' ? '' : color.value }}
                        onClick={() => applyTextColor(color.value)}
                        title={color.name}
                    >
                        {color.value === 'transparent' && <span className="text-[8px] font-black opacity-40">✕</span>}
                    </button>
                ))}
                </div>
            </div>
            <div className="w-px h-5 bg-slate-200 self-center" />
            <div className="flex gap-2 items-center">
                <Highlighter size={14} className="text-slate-400" />
                <div className="flex gap-1">
                {highlightColors.map(color => (
                    <button 
                        key={color.value}
                        className={`w-5 h-5 rounded-full border border-black/5 hover:scale-110 transition-transform ${color.value === 'transparent' ? 'bg-slate-100 flex items-center justify-center' : ''}`}
                        style={{ backgroundColor: color.value === 'transparent' ? '' : color.value }}
                        onClick={() => applyHighlightColor(color.value)}
                        title={color.name}
                    >
                        {color.value === 'transparent' && <span className="text-[8px] font-black opacity-40">✕</span>}
                    </button>
                ))}
                </div>
            </div>
        </div>
    );
};

export const RichTextDiv: React.FC<{
    value: string;
    onChange: (val: string) => void;
    className?: string;
    style?: React.CSSProperties;
    placeholder?: string;
    tagName?: string;
    onFocus?: () => void;
    onBlur?: () => void;
}> = ({ value, onChange, className, style, placeholder, tagName = 'div', onFocus, onBlur }) => {
    const editorRef = useRef<HTMLElement>(null);

    // Only update innerHTML if it's different from current state (prevents cursor jumping)
    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== value) {
            editorRef.current.innerHTML = value || '';
        }
    }, [value]);

    const handleBlur = (e: React.FocusEvent<HTMLElement>) => {
        if (e.target.innerHTML !== value) {
            onChange(e.target.innerHTML);
        }
        if (onBlur) onBlur();
    };

    const handleFocus = () => {
        if (onFocus) onFocus();
    };

    const handleClick = (e: React.MouseEvent<HTMLElement>) => {
        const target = e.target as HTMLElement;
        if (target.classList?.contains('task-checkbox') && target.getAttribute('contenteditable') === 'false') {
            const text = target.innerText.trim();
            const toggles: Record<string, string> = {
                '⬜': '✅', '✅': '⬜',
                '[ ]': '[x]', '[x]': '[ ]',
                '🔳': '✅',
                '⚪': '🟢', '🟢': '⚪',
                '🔴': '🟢',
                '❎': '✅',
                '✓': '✅'
            };
            if (toggles[text]) {
                target.innerText = toggles[text];
                if (editorRef.current) {
                    onChange(editorRef.current.innerHTML);
                }
            }
        }
    };

    const Tag = tagName as any;

    return (
        <Tag
            ref={editorRef}
            contentEditable={true}
            className={`outline-none empty:before:content-[attr(placeholder)] empty:before:text-black/30 ${className || ''}`}
            style={style}
            onBlur={handleBlur}
            onFocus={handleFocus}
            onClick={handleClick}
            placeholder={placeholder}
            dangerouslySetInnerHTML={{ __html: value || '' }}
        />
    );
};
