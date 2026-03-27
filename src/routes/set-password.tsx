import { createFileRoute } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { requirePrivilegeForRoute } from '../lib/route-guards'
import { setPasswordServerFn } from '../lib/password-server-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export const Route = createFileRoute('/set-password')({
  beforeLoad: ({ context }) => {
    requirePrivilegeForRoute(context, '/set-password')
  },
  component: SetPasswordPage,
})

function SetPasswordPage() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const mutation = useMutation({
    mutationFn: () => setPasswordServerFn({ data: { newPassword } }),
    onSuccess: (result) => {
      if (result.success) {
        setNewPassword('')
        setConfirmPassword('')
        setSuccessMessage('Password updated successfully.')
      }
    },
  })

  const passwordsMatch = newPassword === confirmPassword
  const meetsMinLength = newPassword.length >= 6
  const isValid = passwordsMatch && meetsMinLength && newPassword.length > 0
  const hasAttemptedConfirm = confirmPassword.length > 0

  return (
    <div className="max-w-md mx-auto mt-12 p-6">
      <h1 className="text-2xl font-bold mb-6">Set Password</h1>

      {successMessage && (
        <div className="mb-4 rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-800">
          {successMessage}
        </div>
      )}

      {mutation.data && !mutation.data.success && (
        <div className="mb-4 rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
          {mutation.data.message}
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="new-password">New Password</Label>
          <Input
            id="new-password"
            type="password"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value)
              setSuccessMessage('')
            }}
            placeholder="Enter new password"
          />
          {newPassword.length > 0 && !meetsMinLength && (
            <p className="text-sm text-destructive">Password must be at least 6 characters</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm New Password</Label>
          <Input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value)
              setSuccessMessage('')
            }}
            placeholder="Confirm new password"
          />
          {hasAttemptedConfirm && !passwordsMatch && (
            <p className="text-sm text-destructive">Passwords do not match</p>
          )}
        </div>

        <Button
          onClick={() => setShowConfirmDialog(true)}
          disabled={!isValid || mutation.isPending}
          className="w-full"
        >
          {mutation.isPending ? 'Updating...' : 'Set Password'}
        </Button>
      </div>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Password</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to change your password? You will need to use your new password
              the next time you log in.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                mutation.mutate()
              }}
            >
              Change Password
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
