import '@mdxeditor/editor/style.css'
import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  CreateLink,
  headingsPlugin,
  linkDialogPlugin,
  linkPlugin,
  listsPlugin,
  ListsToggle,
  MDXEditor,
  type MDXEditorMethods,
  StrikeThroughSupSubToggles,
  toolbarPlugin,
  UndoRedo,
} from '@mdxeditor/editor'
import { forwardRef } from 'react'

const plugins = [
  headingsPlugin({ allowedHeadingLevels: [2, 3] }),
  listsPlugin(),
  linkPlugin(),
  linkDialogPlugin(),
  toolbarPlugin({
    toolbarContents: () => (
      <>
        <UndoRedo />
        <BlockTypeSelect />
        <BoldItalicUnderlineToggles options={['Bold', 'Italic']} />
        <StrikeThroughSupSubToggles options={['Strikethrough']} />
        <ListsToggle options={['bullet', 'number']} />
        <CreateLink />
      </>
    ),
  }),
]

const MarkdownEditorClient = forwardRef<
  MDXEditorMethods,
  { value: string; onChange: (value: string) => void }
>(({ value, onChange }, ref) => (
  <MDXEditor
    ref={ref}
    markdown={value}
    onChange={onChange}
    plugins={plugins}
    placeholder="Write an announcement..."
    className="lesson-announcement-editor"
    contentEditableClassName="lesson-announcement-editor-content"
  />
))

MarkdownEditorClient.displayName = 'MarkdownEditorClient'

export default MarkdownEditorClient
