import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi, type CategoryBody, type ServiceBody } from '../../api/endpoints'
import { errorText } from '../../api/client'
import type { Category, Service } from '../../api/types'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Field, Input, Segmented, Textarea, Toggle } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { ErrorState, PageHeader, PageLoader, Tabs } from '../../components/ui/misc'
import { useToast } from '../../components/ui/Toast'
import { cn } from '../../lib/cn'
import { categoryLabel } from '../../lib/format'

type TabKey = 'services' | 'categories'

/** Says how new incidents are categorised: by keywords only, or by Gemini with the keywords as fallback. */
function AiStatus() {
  const { data } = useQuery({ queryKey: ['admin', 'integrations'], queryFn: adminApi.integrations })
  const gemini = data?.find((i) => i.name === 'Gemini')
  if (!gemini) return null
  return (
    <p className="flex items-start gap-2 border-b border-line bg-surface-2/50 px-5 py-2.5 text-xs text-muted">
      <span className={cn('mt-1 size-2 shrink-0 rounded-full', gemini.enabled ? 'bg-emerald-500' : 'bg-slate-400')} />
      {gemini.enabled
        ? <span>New incidents are categorised by Google Gemini (<span className="font-mono">{gemini.detail}</span>). If it cannot be reached, the keywords below are used.</span>
        : <span>New incidents are categorised by the keywords below. To let Google Gemini choose the category instead, start the app with a <span className="font-mono">GEMINI_API_KEY</span>.</span>}
    </p>
  )
}

/** IT services (with business criticality) and incident categories (with auto-categorisation keywords). */
export function CatalogPage() {
  const [tab, setTab] = useState<TabKey>('services')
  const services = useQuery({ queryKey: ['admin', 'services'], queryFn: adminApi.services })
  const categories = useQuery({ queryKey: ['admin', 'categories'], queryFn: adminApi.categories })
  const [editService, setEditService] = useState<Service | 'new' | null>(null)
  const [editCategory, setEditCategory] = useState<Category | 'new' | null>(null)

  return (
    <div>
      <PageHeader title="Services and categories"
        subtitle="Categories added here are used straight away by auto-categorisation and assignment, with no code change."
        actions={tab === 'services'
          ? <Button onClick={() => setEditService('new')}>New service</Button>
          : <Button onClick={() => setEditCategory('new')}>New category</Button>} />
      <Card>
        <div className="px-4 pt-2">
          <Tabs<TabKey> value={tab} onChange={setTab} tabs={[
            { value: 'services', label: 'IT services', count: services.data?.length },
            { value: 'categories', label: 'Categories', count: categories.data?.length },
          ]} />
        </div>
        {tab === 'services' && (services.error ? <div className="p-5"><ErrorState error={services.error} /></div> : services.isLoading ? <PageLoader /> : (
          <ul className="divide-y divide-line">
            {[...(services.data ?? [])].sort((a, b) => b.businessCriticality - a.businessCriticality || a.name.localeCompare(b.name)).map((s) => (
              <li key={s.id} className={cn('flex items-center gap-4 px-5 py-3.5', !s.active && 'opacity-60')}>
                <Criticality value={s.businessCriticality} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-fg">{s.name} {!s.active && <Badge className="ml-1">Inactive</Badge>}</p>
                  <p className="truncate text-xs text-muted">{s.description}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setEditService(s)}>Edit</Button>
              </li>
            ))}
          </ul>
        ))}
        {tab === 'categories' && <AiStatus />}
        {tab === 'categories' && (categories.error ? <div className="p-5"><ErrorState error={categories.error} /></div> : categories.isLoading ? <PageLoader /> : (
          <ul className="divide-y divide-line">
            {[...(categories.data ?? [])].sort((a, b) => a.name.localeCompare(b.name)).map((c) => (
              <li key={c.id} className={cn('flex items-start gap-4 px-5 py-3.5', !c.active && 'opacity-60')}>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-fg">{categoryLabel(c.name)} <span className="font-mono text-[11px] font-normal text-faint">{c.name}</span> <span className="font-normal text-muted">· {c.description}</span></p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {(c.keywords ?? '').split(',').map((k) => k.trim()).filter(Boolean).map((k) => (
                      <span key={k} className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-muted ring-1 ring-line">{k}</span>
                    ))}
                    {!c.keywords && <span className="text-xs text-faint">No keywords: used when nothing else matches</span>}
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setEditCategory(c)}>Edit</Button>
              </li>
            ))}
          </ul>
        ))}
      </Card>
      {editService && <ServiceModal service={editService === 'new' ? null : editService} onClose={() => setEditService(null)} />}
      {editCategory && <CategoryModal category={editCategory === 'new' ? null : editCategory} onClose={() => setEditCategory(null)} />}
    </div>
  )
}

function Criticality({ value }: { value: number }) {
  return (
    <span className="flex w-20 shrink-0 flex-col" title={`Business criticality ${value} of 5`}>
      <span className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => <span key={n} className={cn('h-2 flex-1 rounded-sm', n <= value ? (value >= 5 ? 'bg-red-500' : value >= 4 ? 'bg-orange-500' : value >= 3 ? 'bg-amber-500' : 'bg-sky-500') : 'bg-surface-2')} />)}
      </span>
      <span className="mt-1 text-[11px] text-muted">criticality {value}/5</span>
    </span>
  )
}

function useSave<T>(fn: (body: T) => Promise<unknown>, success: string, onClose: () => void) {
  const toast = useToast()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] })
      queryClient.invalidateQueries({ queryKey: ['catalog'] })
      toast.success(success)
      onClose()
    },
    onError: (e) => toast.error('Could not save', errorText(e)),
  })
}

function ServiceModal({ service, onClose }: { service: Service | null; onClose: () => void }) {
  const [form, setForm] = useState<ServiceBody>({
    name: service?.name ?? '', description: service?.description ?? '', businessCriticality: service?.businessCriticality ?? 3, active: service?.active ?? true,
  })
  const save = useSave<ServiceBody>((b) => service ? adminApi.updateService(service.id, b) : adminApi.createService(b),
    service ? 'Service updated' : 'Service created', onClose)
  return (
    <Modal open onClose={onClose} title={service ? `Edit ${service.name}` : 'New IT service'}
      description="Business criticality multiplies into the priority of every incident on this service."
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button loading={save.isPending} onClick={() => save.mutate(form)}>Save</Button></>}>
      <div className="space-y-4">
        <Field label="Name" required><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Description"><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        <Field label="Business criticality" hint="1 = nice to have, 5 = the business stops without it">
          <Segmented name="Criticality" value={String(form.businessCriticality)} onChange={(v) => setForm({ ...form, businessCriticality: Number(v) })}
            options={['1', '2', '3', '4', '5'].map((v) => ({ value: v, label: v }))} />
        </Field>
        {service && <label className="flex items-center gap-3 text-sm text-fg"><Toggle checked={!!form.active} onChange={(v) => setForm({ ...form, active: v })} label="Active" /> Active (shown in the report form)</label>}
      </div>
    </Modal>
  )
}

function CategoryModal({ category, onClose }: { category: Category | null; onClose: () => void }) {
  const [form, setForm] = useState<CategoryBody>({
    name: category?.name ?? '', description: category?.description ?? '', keywords: category?.keywords ?? '', active: category?.active ?? true,
  })
  const save = useSave<CategoryBody>((b) => category ? adminApi.updateCategory(category.id, b) : adminApi.createCategory(b),
    category ? 'Category updated' : 'Category created', onClose)
  return (
    <Modal open onClose={onClose} title={category ? `Edit ${category.name}` : 'New category'}
      description="When an incident's text contains these keywords, it is put in this category automatically."
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button loading={save.isPending} onClick={() => save.mutate(form)}>Save</Button></>}>
      <div className="space-y-4">
        <Field label="Name" required hint={category ? 'Names cannot be changed (technician skills refer to them)' : 'Stored in capitals, e.g. PRINTING'}>
          <Input value={form.name} disabled={!!category} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Description"><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        <Field label="Keywords" hint="Comma separated, e.g. printer, toner, scanner">
          <Textarea rows={3} className="font-mono text-xs" value={form.keywords} onChange={(e) => setForm({ ...form, keywords: e.target.value })} />
        </Field>
        {category && <label className="flex items-center gap-3 text-sm text-fg"><Toggle checked={!!form.active} onChange={(v) => setForm({ ...form, active: v })} label="Active" /> Active</label>}
      </div>
    </Modal>
  )
}
