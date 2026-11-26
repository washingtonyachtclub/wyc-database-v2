import { useEffect, useRef, useState } from 'react'
import Cropper from 'react-easy-crop'
import { Camera, ZoomIn, ZoomOut } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/Modal'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { preparePhotoUpload } from '@/domains/member-photos/prepare-upload'
import { photoUrl, type PhotoCrop } from '@/domains/member-photos/photo'
import { MemberAvatar } from './MemberAvatar'

type Props = { id: number; name: string; version: string; crop: PhotoCrop | null; canEdit: boolean }
export function MemberPhotoEditor(props: Props) {
  const [editing, setEditing] = useState<Pick<Props, 'version' | 'crop'> | null>(null)
  const [file, setFile] = useState<File>()
  const [revision, setRevision] = useState(0)
  const [preparing, setPreparing] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const picker = useRef<HTMLInputElement>(null)
  function close() {
    setEditing(null)
    setFile(undefined)
    setUploadError('')
  }
  const avatar = <MemberAvatar {...props} className="size-16 text-xl" />
  return (
    <>
      {props.canEdit ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              aria-label="Edit photo"
              className="relative size-16 shrink-0 rounded-md p-0"
              disabled={preparing}
              onClick={() => {
                setUploadError('')
                if (props.version) setEditing({ version: props.version, crop: props.crop })
                else picker.current?.click()
              }}
            >
              {avatar}
              <span className="absolute -bottom-0.5 -right-0.5 grid size-6 place-items-center rounded-full border bg-background text-foreground">
                <Camera className="size-3.5" />
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Edit photo</TooltipContent>
        </Tooltip>
      ) : (
        avatar
      )}
      {props.canEdit && (
        <Input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          ref={picker}
          className="hidden"
          aria-label="Choose photo"
          onChange={async (event) => {
            const selected = event.target.files?.[0]
            event.target.value = ''
            if (!selected) return
            setPreparing(true)
            try {
              const prepared = await preparePhotoUpload(selected)
              setFile(prepared)
              setRevision((value) => value + 1)
              setUploadError('')
              setEditing((current) => current ?? { version: props.version, crop: props.crop })
            } catch {
              setUploadError('Could not open image. Choose a JPEG, PNG, or WebP photo.')
            } finally {
              setPreparing(false)
            }
          }}
        />
      )}
      {uploadError && !editing && (
        <p role="alert" className="text-sm text-destructive">
          {uploadError}
        </p>
      )}
      {editing && (
        <Editor
          key={revision}
          id={props.id}
          version={editing.version}
          crop={editing.crop}
          file={file}
          preparing={preparing}
          uploadError={uploadError}
          chooseFile={() => picker.current?.click()}
          close={close}
        />
      )}
    </>
  )
}

function Editor({
  id,
  version,
  crop: initial,
  file,
  preparing,
  uploadError,
  chooseFile,
  close,
}: Pick<Props, 'id' | 'version' | 'crop'> & {
  file?: File
  preparing: boolean
  uploadError: string
  chooseFile: () => void
  close: () => void
}) {
  const client = useQueryClient()
  const [preview, setPreview] = useState('')
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [area, setArea] = useState<PhotoCrop>()
  const [error, setError] = useState('')
  const [saving, setBusy] = useState(false)
  const busy = preparing || saving
  const [removing, setRemoving] = useState(false)
  useEffect(() => {
    if (!file) return
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])
  const src = preview || (version ? photoUrl(id, version, true) : '')
  async function save(remove: boolean) {
    setBusy(true)
    setError('')
    try {
      const body = new FormData()
      if (file) body.set('file', file)
      if (area) body.set('crop', JSON.stringify(area))
      const res = await fetch(photoUrl(id, version), {
        method: remove ? 'DELETE' : 'POST',
        headers: { 'X-WYC-Photo': '1' },
        body: remove ? undefined : body,
      })
      if (!res.ok) {
        setError(
          res.status === 409
            ? 'Photo changed. Reopen to edit.'
            : res.status === 422
              ? 'Choose a JPEG, PNG, or WebP image.'
              : 'Could not save photo.',
        )
        if (res.status === 409)
          await client.invalidateQueries({ queryKey: ['members', 'byId', id] })
        return
      }
      await Promise.all(
        [['members', 'byId', id], ['chiefs'], ['officers']].map((queryKey) =>
          client.invalidateQueries({ queryKey }),
        ),
      )
      close()
    } catch {
      setError('Could not save photo.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal
      title={removing ? 'Remove photo?' : 'Profile photo'}
      onClose={() => {
        if (!busy) close()
      }}
      contentClassName="max-w-sm"
    >
      {!removing && (
        <>
          {src && (
            <>
              <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
                <Cropper
                  key={src}
                  image={src}
                  aspect={1}
                  cropShape="rect"
                  showGrid={false}
                  crop={position}
                  zoom={zoom}
                  onCropChange={setPosition}
                  onZoomChange={setZoom}
                  initialCroppedAreaPercentages={file ? undefined : (initial ?? undefined)}
                  onCropComplete={setArea}
                  onMediaLoaded={() => setError('')}
                  mediaProps={{
                    onError: () => {
                      setArea(undefined)
                      setError('Could not open image.')
                    },
                  }}
                />
              </div>
              <div className="flex items-center gap-3">
                <ZoomOut className="size-4" />
                <Input
                  aria-label="Zoom"
                  type="range"
                  min={1}
                  max={3}
                  step={0.01}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="h-6 border-0 p-0 shadow-none accent-primary"
                />
                <ZoomIn className="size-4" />
              </div>
            </>
          )}
        </>
      )}
      {(error || uploadError) && (
        <p role="alert" className="text-sm text-destructive">
          {uploadError || error}
        </p>
      )}
      <div className="flex items-center gap-2">
        {removing ? (
          <>
            <Button variant="outline" disabled={busy} onClick={() => setRemoving(false)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={busy} onClick={() => save(true)}>
              Remove
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" disabled={busy} onClick={chooseFile}>
              Replace
            </Button>
            {version && (
              <Button variant="ghost" disabled={busy} onClick={() => setRemoving(true)}>
                Remove
              </Button>
            )}
            {src && (
              <Button className="ml-auto" disabled={!area || busy} onClick={() => save(false)}>
                Save
              </Button>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}
