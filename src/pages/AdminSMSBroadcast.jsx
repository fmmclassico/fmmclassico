import React, { useState, useRef, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Phone, Plus, Trash2, Send, Users, CheckCircle2, Loader2,
  Search, MessageSquare, UserPlus, X, Download, Upload,
  Pencil, Save, FileSpreadsheet, Filter, ChevronDown,
  BookTemplate, Copy, ExternalLink, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

const NAVY = '#1B3A6B';

// ─── Helpers ────────────────────────────────────────────────
function parseExcelLike(text) {
  // Accepts CSV, TSV, or plain list
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const results = [];
  for (const line of lines) {
    // Try comma or tab or semicolon separation
    const parts = line.split(/[,\t;]/).map(p => p.trim().replace(/^["']|["']$/g, ''));
    let phone = '', name = 'Customer', group = 'Customers';
    if (parts.length === 1) {
      phone = parts[0];
    } else if (parts.length === 2) {
      // Could be "Name, Phone" or "Phone, Name" — detect by which looks like a number
      if (/^[\d+\s\-()]+$/.test(parts[0])) { phone = parts[0]; name = parts[1] || 'Customer'; }
      else { name = parts[0]; phone = parts[1]; }
    } else if (parts.length >= 3) {
      name = parts[0]; phone = parts[1]; group = parts[2] || 'Customers';
    }
    phone = phone.replace(/\s/g, '');
    if (phone.length >= 9) results.push({ name: name || 'Customer', phone, group });
  }
  return results;
}

// ─── Sub-components ─────────────────────────────────────────
function ContactRow({ c, selected, onToggle, onEdit, onDelete }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors border-b last:border-0 ${selected ? 'bg-blue-50' : ''}`}>
      <input type="checkbox" checked={selected} onChange={onToggle} className="w-4 h-4 rounded" style={{ accentColor: NAVY }} />
      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white text-xs"
        style={{ background: NAVY }}>
        {(c.name || 'C')[0].toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-gray-800 truncate">{c.name || 'Customer'}</p>
        <p className="text-xs text-gray-500">{c.phone}</p>
      </div>
      <span className="text-[10px] font-medium bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full hidden sm:block">{c.group || 'Customers'}</span>
      <button onClick={onEdit} className="text-gray-300 hover:text-blue-600 transition-colors ml-1">
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button onClick={onDelete} className="text-gray-300 hover:text-red-500 transition-colors ml-0.5">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────
export default function AdminSMSBroadcast() {
  const queryClient = useQueryClient();

  // Auth
  const [user, setUser] = React.useState(null);
  const [isAdmin, setIsAdmin] = React.useState(false);
  React.useEffect(() => {
    base44.auth.isAuthenticated().then(auth => {
      if (auth) base44.auth.me().then(u => { setUser(u); setIsAdmin(u.role === 'admin'); });
    });
  }, []);

  // Tabs
  const [tab, setTab] = useState('contacts');

  // Contact state
  const [searchQuery, setSearchQuery] = useState('');
  const [groupFilter, setGroupFilter] = useState('All');
  const [selectedIds, setSelectedIds] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', phone: '', group: 'Customers' });
  const [editingContact, setEditingContact] = useState(null);
  const [showImportPanel, setShowImportPanel] = useState(false);
  const [importText, setImportText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importGroup, setImportGroup] = useState('Customers');
  const fileRef = useRef(null);
  const xlsxRef = useRef(null);

  // Broadcast state
  const [message, setMessage] = useState('');
  const [broadcastGroup, setBroadcastGroup] = useState('All');
  const [broadcastSelection, setBroadcastSelection] = useState('group'); // 'group' | 'selected'
  const [waSent, setWaSent] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ title: '', message: '', category: 'General' });
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);

  // ─── Data ──────────────────────────────────────────────────
  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['smsContacts'],
    queryFn: () => base44.entities.SMSContact.list('-created_date', 9999),
    enabled: isAdmin,
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['smsTemplates'],
    queryFn: () => base44.entities.SMSTemplate.list('-created_date', 100),
    enabled: isAdmin,
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['ordersForSMS'],
    queryFn: () => base44.entities.Order.list('-created_date', 500),
    enabled: isAdmin,
  });

  // ─── Mutations ─────────────────────────────────────────────
  const addMutation = useMutation({
    mutationFn: (data) => base44.entities.SMSContact.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['smsContacts'] }); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SMSContact.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smsContacts'] });
      setEditingContact(null);
      toast.success('Contact updated');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SMSContact.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['smsContacts'] }); },
  });

  const addTemplateMutation = useMutation({
    mutationFn: (data) => base44.entities.SMSTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smsTemplates'] });
      setNewTemplate({ title: '', message: '', category: 'General' });
      setShowSaveTemplate(false);
      toast.success('Template saved!');
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id) => base44.entities.SMSTemplate.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['smsTemplates'] }),
  });

  // ─── Derived data ──────────────────────────────────────────
  const groups = useMemo(() =>
    ['All', ...Array.from(new Set(contacts.map(c => c.group || 'Customers')))],
    [contacts]);

  const filteredContacts = useMemo(() => contacts.filter(c => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || c.phone.includes(q) || (c.name || '').toLowerCase().includes(q) || (c.group || '').toLowerCase().includes(q);
    const matchGroup = groupFilter === 'All' || c.group === groupFilter;
    return matchSearch && matchGroup;
  }), [contacts, searchQuery, groupFilter]);

  const broadcastTargets = useMemo(() => {
    if (broadcastSelection === 'selected' && selectedIds.length > 0) {
      return contacts.filter(c => selectedIds.includes(c.id));
    }
    if (broadcastGroup === 'All') return contacts;
    return contacts.filter(c => c.group === broadcastGroup);
  }, [broadcastSelection, selectedIds, broadcastGroup, contacts]);

  // ─── Handlers ──────────────────────────────────────────────
  const handleAddContact = async () => {
    if (!newContact.phone.trim()) { toast.error('Phone required'); return; }
    await addMutation.mutateAsync({ name: newContact.name || 'Customer', phone: newContact.phone.trim(), group: newContact.group });
    setNewContact({ name: '', phone: '', group: 'Customers' });
    setShowAddForm(false);
    toast.success('Contact added!');
  };

  const handleDeleteSelected = async () => {
    if (!selectedIds.length) return;
    if (!confirm(`Delete ${selectedIds.length} contacts?`)) return;
    for (const id of selectedIds) await deleteMutation.mutateAsync(id);
    setSelectedIds([]);
    toast.success(`${selectedIds.length} contacts deleted`);
  };

  const handleBulkImport = async () => {
    const parsed = parseExcelLike(importText);
    if (!parsed.length) { toast.error('No valid numbers found'); return; }
    setIsImporting(true);
    const existing = new Set(contacts.map(c => c.phone.replace(/\s/g, '')));
    let added = 0, skipped = 0;
    // Batch in chunks of 50
    const chunks = [];
    for (let i = 0; i < parsed.length; i += 50) chunks.push(parsed.slice(i, i + 50));
    for (const chunk of chunks) {
      await Promise.all(chunk.map(async c => {
        if (!existing.has(c.phone)) {
          await base44.entities.SMSContact.create({ ...c, group: importGroup }).catch(() => {});
          existing.add(c.phone);
          added++;
        } else { skipped++; }
      }));
    }
    queryClient.invalidateQueries({ queryKey: ['smsContacts'] });
    setIsImporting(false);
    setImportText('');
    setShowImportPanel(false);
    toast.success(`✅ ${added} imported, ${skipped} skipped (duplicates)`);
  };

  const handleFileUpload = (e, isExcel) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      if (file.name.endsWith('.vcf')) {
        const lines = text.split('\n');
        const entries = [];
        let curName = '', curPhone = '';
        lines.forEach(line => {
          if (line.startsWith('FN:')) curName = line.replace('FN:', '').trim();
          if (line.startsWith('TEL')) {
            curPhone = line.split(':').pop().trim().replace(/\D/g, '');
            if (curPhone.startsWith('233')) curPhone = '0' + curPhone.slice(3);
          }
          if (line.startsWith('END:VCARD') && curPhone) {
            entries.push(`${curName}, ${curPhone}`);
            curName = ''; curPhone = '';
          }
        });
        setImportText(entries.join('\n'));
      } else {
        setImportText(text);
      }
      setShowImportPanel(true);
      toast.info('File loaded — review then click Import');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const importFromOrders = async () => {
    const existing = new Set(contacts.map(c => c.phone));
    const toAdd = [];
    orders.forEach(o => {
      if (o.customer_phone?.trim().length >= 9 && !existing.has(o.customer_phone.trim())) {
        toAdd.push({ name: o.customer_name || 'Customer', phone: o.customer_phone.trim(), group: 'Customers' });
        existing.add(o.customer_phone.trim());
      }
    });
    if (!toAdd.length) { toast.info('All order contacts already in list'); return; }
    setIsImporting(true);
    for (const c of toAdd) await base44.entities.SMSContact.create(c).catch(() => {});
    queryClient.invalidateQueries({ queryKey: ['smsContacts'] });
    setIsImporting(false);
    toast.success(`${toAdd.length} contacts imported from orders!`);
  };

  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const toggleAll = () => setSelectedIds(prev => prev.length === filteredContacts.length ? [] : filteredContacts.map(c => c.id));

  const copyAllPhones = () => {
    navigator.clipboard.writeText(broadcastTargets.map(c => c.phone).join('\n'));
    toast.success(`${broadcastTargets.length} numbers copied!`);
  };

  const copyMessage = () => {
    if (!message.trim()) { toast.error('Write a message first'); return; }
    navigator.clipboard.writeText(message);
    toast.success('Message copied!');
  };

  const openWhatsApp = () => {
    if (!message.trim()) { toast.error('Write a message first'); return; }
    if (!broadcastTargets.length) { toast.error('No contacts selected'); return; }
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${broadcastTargets[0].phone.replace(/^0/, '233')}?text=${encoded}`, '_blank');
    setWaSent(true);
  };

  if (!user) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" style={{ color: NAVY }} /></div>;
  if (!isAdmin) return <div className="text-center py-20 text-red-500 font-semibold">Admin access only.</div>;

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: NAVY }}>
          <MessageSquare className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-800">SMS / WhatsApp Broadcast</h1>
          <div className="flex gap-2 mt-1">
            <Badge className="text-xs bg-blue-100 text-blue-800"><Users className="h-3 w-3 mr-1 inline" />{contacts.length} contacts</Badge>
            <Badge className="text-xs bg-purple-100 text-purple-800">{groups.length - 1} groups</Badge>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-xl">
        {[
          { id: 'contacts', label: '👥 Contacts' },
          { id: 'broadcast', label: '📲 Broadcast' },
          { id: 'templates', label: '📋 Templates' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-all ${tab === t.id ? 'text-white shadow' : 'text-gray-600 hover:bg-white/60'}`}
            style={tab === t.id ? { background: NAVY } : {}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════ CONTACTS TAB ══════════ */}
      {tab === 'contacts' && (
        <div className="space-y-4">
          {/* Action bar */}
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setShowAddForm(!showAddForm)} size="sm" className="gap-1 text-white" style={{ background: NAVY }}>
              <UserPlus className="h-4 w-4" /> Add Contact
            </Button>
            <Button onClick={() => setShowImportPanel(!showImportPanel)} size="sm" variant="outline" className="gap-1">
              <Upload className="h-4 w-4" /> Paste Import
            </Button>
            <Button onClick={() => fileRef.current?.click()} size="sm" variant="outline" className="gap-1">
              <FileSpreadsheet className="h-4 w-4" /> Upload CSV / VCF
            </Button>
            <input ref={fileRef} type="file" accept=".csv,.vcf,.txt" className="hidden" onChange={(e) => handleFileUpload(e, false)} />
            <Button onClick={importFromOrders} size="sm" variant="outline" className="gap-1" disabled={isImporting}>
              {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              From Orders
            </Button>
            {selectedIds.length > 0 && (
              <Button onClick={handleDeleteSelected} size="sm" variant="outline" className="gap-1 text-red-600 border-red-200 hover:bg-red-50 ml-auto">
                <Trash2 className="h-4 w-4" /> Delete {selectedIds.length}
              </Button>
            )}
          </div>

          {/* Add contact form */}
          {showAddForm && (
            <Card className="p-4 border-blue-200 bg-blue-50">
              <h3 className="font-bold text-gray-800 mb-3 text-sm">Add New Contact</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                <div>
                  <Label className="text-xs mb-1 block">Name</Label>
                  <Input value={newContact.name} onChange={e => setNewContact(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Kofi Mensah" />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Phone *</Label>
                  <Input value={newContact.phone} onChange={e => setNewContact(p => ({ ...p, phone: e.target.value }))} placeholder="0244123456" />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Group</Label>
                  <Input value={newContact.group} onChange={e => setNewContact(p => ({ ...p, group: e.target.value }))} placeholder="Customers, VIP…" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddContact} disabled={addMutation.isPending} size="sm" className="text-white" style={{ background: NAVY }}>
                  {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add
                </Button>
                <Button onClick={() => setShowAddForm(false)} size="sm" variant="ghost"><X className="h-4 w-4" /></Button>
              </div>
            </Card>
          )}

          {/* Paste/Import panel */}
          {showImportPanel && (
            <Card className="p-4 border-purple-200 bg-purple-50">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-gray-800 text-sm">Bulk Import (Paste from Excel / CSV)</h3>
                <button onClick={() => setShowImportPanel(false)}><X className="h-4 w-4 text-gray-400" /></button>
              </div>
              <div className="bg-white rounded-lg border p-3 mb-3 text-xs text-gray-500 space-y-0.5">
                <p>✅ Supported formats (one per line):</p>
                <p className="font-mono">Name, Phone, Group</p>
                <p className="font-mono">Name, Phone</p>
                <p className="font-mono">0244123456</p>
                <p className="text-gray-400 mt-1">Paste directly from Excel — comma, tab or semicolon separated</p>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <Label className="text-xs mb-1 block">Default Group for imported contacts</Label>
                  <Input value={importGroup} onChange={e => setImportGroup(e.target.value)} placeholder="Customers" />
                </div>
                <div className="flex items-end">
                  <p className="text-xs text-gray-400">Detected: <strong>{parseExcelLike(importText).length}</strong> numbers</p>
                </div>
              </div>
              <Textarea
                value={importText}
                onChange={e => setImportText(e.target.value)}
                rows={7}
                placeholder={"Kofi Mensah\t0244123456\tVIP\nAba Asante, 0551234567\n0201234567"}
                className="font-mono text-xs mb-3 bg-white"
              />
              <div className="flex gap-2">
                <Button onClick={handleBulkImport} disabled={isImporting || !importText.trim()} size="sm" className="text-white" style={{ background: NAVY }}>
                  {isImporting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />}
                  Import {parseExcelLike(importText).length} Contacts
                </Button>
                <Button onClick={() => { setImportText(''); setShowImportPanel(false); }} size="sm" variant="ghost">Cancel</Button>
              </div>
            </Card>
          )}

          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search name, phone, group…" className="pl-9" />
            </div>
            <select value={groupFilter} onChange={e => setGroupFilter(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 min-w-[130px]">
              {groups.map(g => <option key={g}>{g === 'All' ? `All (${contacts.length})` : `${g} (${contacts.filter(c => c.group === g).length})`}</option>)}
            </select>
          </div>

          {/* Table header */}
          {!isLoading && filteredContacts.length > 0 && (
            <div className="bg-gray-50 border rounded-t-xl px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <input type="checkbox" checked={selectedIds.length === filteredContacts.length && filteredContacts.length > 0} onChange={toggleAll} className="w-4 h-4" style={{ accentColor: NAVY }} />
                <span className="text-xs font-semibold text-gray-500">
                  {selectedIds.length > 0 ? `${selectedIds.length} selected` : `${filteredContacts.length} contacts`}
                </span>
              </div>
              {selectedIds.length > 0 && (
                <button onClick={() => {
                  setTab('broadcast');
                  setBroadcastSelection('selected');
                }} className="text-xs font-semibold underline" style={{ color: NAVY }}>
                  Broadcast to {selectedIds.length} selected →
                </button>
              )}
            </div>
          )}

          {/* Contact list */}
          {isLoading ? (
            <div className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin mx-auto" style={{ color: NAVY }} /></div>
          ) : filteredContacts.length === 0 ? (
            <Card className="p-10 text-center text-gray-400">
              <Users className="h-12 w-12 mx-auto mb-3 text-gray-200" />
              <p className="font-medium">No contacts found.</p>
              <p className="text-sm mt-1">Add contacts manually or import from orders / CSV.</p>
            </Card>
          ) : (
            <Card className="overflow-hidden border rounded-b-xl rounded-t-none -mt-[1px]">
              <div className="divide-y max-h-[520px] overflow-y-auto">
                {filteredContacts.map(c => (
                  editingContact?.id === c.id ? (
                    <div key={c.id} className="flex items-center gap-2 px-4 py-2 bg-yellow-50 border-b">
                      <Input value={editingContact.name} onChange={e => setEditingContact(p => ({ ...p, name: e.target.value }))} className="h-8 text-sm" placeholder="Name" />
                      <Input value={editingContact.phone} onChange={e => setEditingContact(p => ({ ...p, phone: e.target.value }))} className="h-8 text-sm" placeholder="Phone" />
                      <Input value={editingContact.group} onChange={e => setEditingContact(p => ({ ...p, group: e.target.value }))} className="h-8 text-sm" placeholder="Group" />
                      <Button size="sm" onClick={() => updateMutation.mutate({ id: editingContact.id, data: { name: editingContact.name, phone: editingContact.phone, group: editingContact.group } })} className="text-white h-8 px-2" style={{ background: NAVY }}>
                        <Save className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingContact(null)} className="h-8 px-2">
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <ContactRow
                      key={c.id}
                      c={c}
                      selected={selectedIds.includes(c.id)}
                      onToggle={() => toggleSelect(c.id)}
                      onEdit={() => setEditingContact({ ...c })}
                      onDelete={() => { if (confirm('Remove this contact?')) deleteMutation.mutate(c.id); }}
                    />
                  )
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ══════════ BROADCAST TAB ══════════ */}
      {tab === 'broadcast' && (
        <div className="space-y-4">
          {/* Info card */}
          <Card className="p-4 bg-green-50 border-green-200">
            <p className="text-sm font-bold text-green-800 mb-2 flex items-center gap-2">
              <svg className="h-4 w-4 fill-green-600" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              How to Broadcast via WhatsApp
            </p>
            <ol className="text-xs text-gray-700 space-y-1 list-decimal ml-4">
              <li>Compose your message below</li>
              <li>Select target group or use contacts selected from Contacts tab</li>
              <li>Click <strong>Copy Numbers</strong> → open WhatsApp → New Broadcast List → paste</li>
              <li>Or click <strong>Open WhatsApp</strong> to open one contact with pre-filled message</li>
            </ol>
          </Card>

          {/* Target selector */}
          <Card className="p-4">
            <h3 className="font-bold text-sm text-gray-700 mb-3">Send To</h3>
            <div className="flex gap-2 mb-3">
              <button onClick={() => setBroadcastSelection('group')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${broadcastSelection === 'group' ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-300'}`}
                style={broadcastSelection === 'group' ? { background: NAVY } : {}}>
                By Group
              </button>
              <button onClick={() => setBroadcastSelection('selected')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${broadcastSelection === 'selected' ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-300'}`}
                style={broadcastSelection === 'selected' ? { background: NAVY } : {}}>
                Selected ({selectedIds.length})
              </button>
            </div>
            {broadcastSelection === 'group' && (
              <div className="flex flex-wrap gap-2">
                {groups.map(g => (
                  <button key={g} onClick={() => setBroadcastGroup(g)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${broadcastGroup === g ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}
                    style={broadcastGroup === g ? { background: NAVY } : {}}>
                    {g} ({g === 'All' ? contacts.length : contacts.filter(c => c.group === g).length})
                  </button>
                ))}
              </div>
            )}
            {broadcastSelection === 'selected' && selectedIds.length === 0 && (
              <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                Go to Contacts tab, check the contacts you want, then come back here.
              </div>
            )}
            <div className="mt-3 text-sm font-semibold" style={{ color: NAVY }}>
              📤 Will send to: <strong>{broadcastTargets.length} contacts</strong>
            </div>
          </Card>

          {/* Message composer */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-gray-700">Compose Message</h3>
              <button onClick={() => setShowTemplates(!showTemplates)}
                className="text-xs font-semibold flex items-center gap-1 hover:underline" style={{ color: NAVY }}>
                <BookTemplate className="h-3.5 w-3.5" /> Use Template
              </button>
            </div>

            {showTemplates && (
              <div className="mb-3 bg-gray-50 border rounded-xl p-3 max-h-48 overflow-y-auto space-y-2">
                {templates.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">No templates yet. Save one after composing.</p>
                ) : templates.map(t => (
                  <div key={t.id} className="flex items-start gap-2 p-2 bg-white border rounded-lg hover:border-blue-300 transition-colors">
                    <div className="flex-1 cursor-pointer" onClick={() => { setMessage(t.message); setShowTemplates(false); toast.info('Template loaded'); }}>
                      <p className="text-xs font-bold text-gray-700">{t.title}</p>
                      <p className="text-xs text-gray-500 truncate">{t.message}</p>
                    </div>
                    <button onClick={() => deleteTemplateMutation.mutate(t.id)} className="text-gray-300 hover:text-red-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <Textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={6}
              placeholder="Hi! 👋 Big sale at FMM CLASSICO! Get 20% off all phone accessories this weekend only. Visit our store or call 0509 896 035. 🛍️"
              className="mb-2"
            />
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>{message.length} characters · ~{Math.ceil(message.length / 160)} SMS part(s)</span>
              <button onClick={() => setShowSaveTemplate(true)} className="font-semibold hover:underline" style={{ color: NAVY }}>
                Save as Template
              </button>
            </div>

            {showSaveTemplate && (
              <div className="mt-3 bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-2">
                <Input value={newTemplate.title} onChange={e => setNewTemplate(p => ({ ...p, title: e.target.value }))} placeholder="Template name e.g. Flash Sale" className="text-sm" />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => addTemplateMutation.mutate({ ...newTemplate, message })} disabled={!newTemplate.title.trim() || addTemplateMutation.isPending} className="text-white text-xs" style={{ background: NAVY }}>
                    {addTemplateMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowSaveTemplate(false)} className="text-xs"><X className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            )}
          </Card>

          {/* Action buttons */}
          <div className="space-y-3">
            <Button onClick={openWhatsApp} disabled={!message.trim() || !broadcastTargets.length}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-5 gap-2 text-base">
              <ExternalLink className="h-5 w-5" />
              Open WhatsApp ({broadcastTargets.length} contacts)
            </Button>
            <div className="grid grid-cols-2 gap-3">
              <Button onClick={copyAllPhones} variant="outline" className="py-4 gap-2 border-blue-300 text-blue-700 hover:bg-blue-50 font-semibold">
                <Copy className="h-4 w-4" /> Copy {broadcastTargets.length} Numbers
              </Button>
              <Button onClick={copyMessage} variant="outline" className="py-4 gap-2 border-gray-300 font-semibold">
                <Copy className="h-4 w-4" /> Copy Message
              </Button>
            </div>
            {waSent && (
              <Card className="p-4 bg-green-50 border-green-200 text-center">
                <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="font-bold text-green-800">WhatsApp opened!</p>
                <p className="text-xs text-gray-500 mt-1">For bulk: Copy Numbers → WhatsApp → New Broadcast List → paste all numbers.</p>
                <Button variant="ghost" size="sm" className="mt-2 text-green-700" onClick={() => { setWaSent(false); setMessage(''); }}>
                  Compose Another
                </Button>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ══════════ TEMPLATES TAB ══════════ */}
      {tab === 'templates' && (
        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="font-bold text-gray-800 mb-3">Save New Template</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs mb-1 block">Template Name *</Label>
                  <Input value={newTemplate.title} onChange={e => setNewTemplate(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Flash Sale Announcement" />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Category</Label>
                  <Input value={newTemplate.category} onChange={e => setNewTemplate(p => ({ ...p, category: e.target.value }))} placeholder="Promotions, Order Updates…" />
                </div>
              </div>
              <div>
                <Label className="text-xs mb-1 block">Message *</Label>
                <Textarea value={newTemplate.message} onChange={e => setNewTemplate(p => ({ ...p, message: e.target.value }))} rows={4} placeholder="Your message here…" />
                <p className="text-xs text-gray-400 mt-1">{newTemplate.message.length} chars</p>
              </div>
              <Button onClick={() => addTemplateMutation.mutate(newTemplate)} disabled={!newTemplate.title || !newTemplate.message || addTemplateMutation.isPending} className="text-white" style={{ background: NAVY }}>
                {addTemplateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />} Save Template
              </Button>
            </div>
          </Card>

          <div className="space-y-3">
            {templates.length === 0 ? (
              <Card className="p-10 text-center text-gray-400">
                <BookTemplate className="h-10 w-10 mx-auto mb-2 text-gray-200" />
                <p>No templates yet. Create one above.</p>
              </Card>
            ) : templates.map(t => (
              <Card key={t.id} className="p-4 hover:shadow transition-shadow">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-gray-800">{t.title}</p>
                      <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{t.category || 'General'}</span>
                    </div>
                    <p className="text-sm text-gray-500 whitespace-pre-wrap">{t.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{t.message.length} characters</p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Button size="sm" onClick={() => { setMessage(t.message); setTab('broadcast'); toast.info('Template loaded in Broadcast tab'); }} className="text-white text-xs h-8 px-3" style={{ background: NAVY }}>
                      Use
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => deleteTemplateMutation.mutate(t.id)} className="text-red-500 border-red-200 hover:bg-red-50 h-8 px-3 text-xs">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}