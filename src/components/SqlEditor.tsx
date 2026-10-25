import { useEffect, useRef } from 'react'
import { basicSetup } from 'codemirror'
import { Compartment, EditorState, Prec } from '@codemirror/state'
import { EditorView, keymap, placeholder } from '@codemirror/view'
import { MSSQL, sql, SQLDialect } from '@codemirror/lang-sql'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'
import type { TableInfo } from '../sql/engine'

// Dialecto MSSQL + funciones que soporta el simulador, para resaltarlas como funciones.
const dialect = SQLDialect.define({
  ...MSSQL.spec,
  builtin: `${MSSQL.spec.builtin ?? ''} count sum avg min max round upper lower substr year month day getdate len isnull ifnull coalesce`,
})

// Los colores salen de variables CSS del tema activo: un solo editor para todos los temas.
const editorTheme = EditorView.theme({
  '&': { backgroundColor: 'var(--editor-bg)', color: 'var(--editor-text)', fontFamily: 'var(--font-code)', fontSize: 'var(--editor-size)' },
  '.cm-content': { caretColor: 'var(--editor-caret)', fontFamily: 'var(--font-code)' },
  '.cm-scroller': { fontFamily: 'var(--font-code)', lineHeight: '1.35' },
  '.cm-gutters': { backgroundColor: 'var(--editor-gutter-bg)', color: 'var(--editor-gutter-text)', border: 'none' },
  '.cm-activeLine, .cm-activeLineGutter': { backgroundColor: 'var(--editor-active-line)' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': { backgroundColor: 'var(--editor-selection) !important' },
  '.cm-cursor': { borderLeftColor: 'var(--editor-caret)', borderLeftWidth: '2px' },
  '.cm-tooltip': { backgroundColor: 'var(--panel)', color: 'var(--text)', border: '2px solid var(--border)' },
  '.cm-tooltip-autocomplete ul li[aria-selected]': { backgroundColor: 'var(--accent)', color: 'var(--bg)' },
  '.cm-placeholder': { color: 'var(--syn-comment)' },
})

const highlight = HighlightStyle.define([
  { tag: t.keyword, color: 'var(--syn-keyword)', fontWeight: 'var(--syn-keyword-weight)' },
  { tag: [t.standard(t.name), t.function(t.variableName)], color: 'var(--syn-function)' },
  { tag: [t.number, t.bool, t.null], color: 'var(--syn-number)' },
  { tag: t.string, color: 'var(--syn-string)' },
  { tag: [t.special(t.string), t.typeName], color: 'var(--syn-table)' },
  { tag: [t.lineComment, t.blockComment], color: 'var(--syn-comment)', fontStyle: 'italic' },
  { tag: t.operator, color: 'var(--syn-keyword)' },
])

function toNamespace(schema: TableInfo[] | undefined) {
  const ns: Record<string, string[]> = {}
  for (const table of schema ?? []) {
    ns[table.name.includes(' ') ? `[${table.name}]` : table.name] = table.columns.map((c) => c.name)
  }
  return ns
}

interface Props {
  value: string
  onChange: (value: string) => void
  onRun: () => void
  schema?: TableInfo[]
}

export function SqlEditor({ value, onChange, onRun, schema }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const view = useRef<EditorView | null>(null)
  const language = useRef(new Compartment())
  const callbacks = useRef({ onChange, onRun })
  callbacks.current = { onChange, onRun }

  useEffect(() => {
    const v = new EditorView({
      parent: host.current!,
      state: EditorState.create({
        doc: value,
        extensions: [
          Prec.highest(keymap.of([{ key: 'Mod-Enter', run: () => (callbacks.current.onRun(), true) }])),
          basicSetup,
          language.current.of(sql({ dialect, upperCaseKeywords: true })),
          editorTheme,
          syntaxHighlighting(highlight),
          placeholder('Escribe tu consulta SQL aquí…  (Ctrl+Enter para ejecutar)'),
          EditorView.lineWrapping,
          EditorView.updateListener.of((u) => {
            if (u.docChanged) callbacks.current.onChange(u.state.doc.toString())
          }),
        ],
      }),
    })
    view.current = v
    return () => v.destroy()
    // El editor se crea una sola vez; los cambios de value se aplican abajo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Cambios desde fuera (otro ejercicio, "usar solución"): reemplaza el documento.
  useEffect(() => {
    const v = view.current
    if (v && v.state.doc.toString() !== value) {
      v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: value } })
    }
  }, [value])

  useEffect(() => {
    view.current?.dispatch({
      effects: language.current.reconfigure(sql({ dialect, upperCaseKeywords: true, schema: toNamespace(schema) })),
    })
  }, [schema])

  return <div className="editor" ref={host} />
}
