import { AppShell } from "@/components/layout/shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requirePlatformAdmin } from "@/lib/data/auth";

export default async function NewTenantPage() {
  const profile = await requirePlatformAdmin();

  return (
    <AppShell profile={profile} mode="admin">
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Create controlled tenant</CardTitle>
          <CardDescription>Founder-only setup for first-client demos. Tenant rows are created through authenticated admin context and protected by RLS.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action="/admin/tenants/create" method="post" className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Organization name</Label>
              <Input id="name" name="name" required placeholder="Demo Realty Group" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input id="slug" name="slug" placeholder="demo-realty-group" />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2"><Label htmlFor="primary_color">Primary</Label><Input id="primary_color" name="primary_color" defaultValue="#111827" /></div>
              <div className="space-y-2"><Label htmlFor="secondary_color">Secondary</Label><Input id="secondary_color" name="secondary_color" defaultValue="#f8fafc" /></div>
              <div className="space-y-2"><Label htmlFor="accent_color">Accent</Label><Input id="accent_color" name="accent_color" defaultValue="#c8a96a" /></div>
            </div>
            <Button type="submit">Create tenant</Button>
          </form>
        </CardContent>
      </Card>
    </AppShell>
  );
}
