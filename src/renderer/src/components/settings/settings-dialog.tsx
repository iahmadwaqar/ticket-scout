import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import GoLoginSettings from './gologin-settings'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Configure your application settings and integrations
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="gologin" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="gologin">GoLogin</TabsTrigger>
            <TabsTrigger value="general">General</TabsTrigger>
          </TabsList>

          <TabsContent value="gologin" className="mt-6">
            <GoLoginSettings />
          </TabsContent>

          <TabsContent value="general" className="mt-6">
            <div className="py-8 text-center text-muted-foreground">
              General settings coming soon...
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
