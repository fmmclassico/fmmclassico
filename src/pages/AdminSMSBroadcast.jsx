import React, { useState, useEffect, useRef } from 'react';
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
  Search, MessageSquare, UserPlus, X, Download, Upload
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminSMSBroadcast() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tab, setTab] = useState('contacts');
  const [searchQuery, setSearchQuery] = useState('');

  // Add contact form
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newGroup, setNewGroup] = useState('Customers');
  const [isAdding, setIsAdding] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Bulk import
  const [bulkText, setBulkText] = useState('');
  const [showBulkImport, setShowBulkImport] = useState(false);

  // File upload for contacts
  const fileInputRef = useRef(null);

  // Broadcast form
  const [message, setMessage] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('All');
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [waSent, setWaSent] = useState(false);

  const queryClient = useQueryClient();

  useEffect(() => {
    const init = async () => {
      const auth = await base44.auth.isAuthenticated();
      if (auth) {
        const userData = await base44.auth.me();
        setUser(userData);
        setIsAdmin(userData.role === 'admin');
      }
    };
    init();
  }, []);

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['smsContacts'],
    queryFn: () => base44.entities.SMSContact.list('-created_date', 500),
    enabled: isAdmin,
  });

  // Also pull from orders automatically
  const { data: orders = [] } = useQuery({
    queryKey: ['ordersForSMS'],
    queryFn: () => base44.entities.Order.list('-created_date', 300),
    enabled: isAdmin,
  });

  const addContactMutation = useMutation({
    mutationFn: (data) => base44.entities.SMSContact.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smsContacts'] });
      setNewName(''); setNewPhone(''); setShowAddForm(false);
      toast.success('Contact added!');
    },
    onError: () => toast.error('Failed to add contact')
  });

  const deleteContactMutation = useMutation({
    mutationFn: (id) => base44.entities.SMSContact.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smsContacts'] });
      toast.success('Contact removed');
    }
  });

  const handleAddContact = () => {
    if (!newPhone.trim()) { toast.error('Phone number required'); return; }
    addContactMutation.mutate({ name: newName.trim() || 'Customer', phone: newPhone.trim(), group: newGroup });
  };

  const handleBulkImport = async () => {
    const lines = bulkText.split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) { toast.error('No numbers found'); return; }
    setIsAdding(true);
    let count = 0;
    for (const line of lines) {
      // Accept "Name, Number" or just number
      const parts = line.split(',').map(p => p.trim());
      const phone = parts.length >= 2 ? parts[1] : parts[0];
      const name = parts.length >= 2 ? parts[0] : 'Customer';
      if (phone.length >= 9) {
        await base44.entities.SMSContact.create({ name, phone, group: newGroup }).catch(() => {});
        count++;
      }
    }
    queryClient.invalidateQueries({ queryKey: ['smsContacts'] });
    setIsAdding(false);
    setBulkText('');
    setShowBulkImport(false);
    toast.success(`${count} contacts imported!`);
  };

  const importFromOrders = async () => {
    const existing = new Set(contacts.map(c => c.phone));
    const toAdd = [];
    orders.forEach(o => {
      if (o.customer_phone && o.customer_phone.trim().length >= 9 && !existing.has(o.customer_phone.trim())) {
        toAdd.push({ name: o.customer_name || 'Customer', phone: o.customer_phone.trim(), group: 'Customers' });
        existing.add(o.customer_phone.trim());
      }
    });
    if (!toAdd.length) { toast.info('All order contacts already in list'); return; }
    setIsAdding(true);
    for (const c of toAdd) await base44.entities.SMSContact.create(c).catch(() => {});
    queryClient.invalidateQueries({ queryKey: ['smsContacts'] });
    setIsAdding(false);
    toast.success(`${toAdd.length} contacts imported from orders!`);
  };

  const groups = ['All', ...Array.from(new Set(contacts.map(c => c.group || 'Customers')))];

  const filteredContacts = contacts.filter(c => {
    const matchSearch = !searchQuery || c.phone.includes(searchQuery) || (c.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchGroup = selectedGroup === 'All' || c.group === selectedGroup;
    return matchSearch && matchGroup;
  });

  const broadcastTargets = selectedContacts.length > 0
    ? contacts.filter(c => selectedContacts.includes(c.id))
    : (selectedGroup === 'All' ? contacts : contacts.filter(c => c.group === selectedGroup));

  // Parse CSV/VCF contact file upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      // Try CSV first
      if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
        setBulkText(text);
        setShowBulkImport(true);
      } else if (file.name.endsWith('.vcf')) {
        // Parse VCF
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
        setBulkText(entries.join('\n'));
        setShowBulkImport(true);
        toast.success(`${entries.length} contacts parsed from VCF`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // WhatsApp broadcast: open wa.me links for each contact
  const handleWhatsAppBroadcast = () => {
    if (!message.trim()) { toast.error('Please write a message'); return; }
    if (!broadcastTargets.length) { toast.error('No contacts to send to'); return; }
    // Open first contact in WhatsApp, copy message
    const encodedMsg = encodeURIComponent(message);
    // Open WhatsApp for the first target, show instructions
    window.open(`https://wa.me/${broadcastTargets[0].phone.replace(/^0/, '233')}?text=${encodedMsg}`, '_blank');
    setWaSent(true);
    toast.success('WhatsApp opened! To broadcast: copy the number list and paste into WhatsApp Broadcast List.');
  };

  const copyAllPhones = () => {
    const phones = broadcastTargets.map(c => c.phone).join('\n');
    navigator.clipboard.writeText(phones);
    toast.success(`${broadcastTargets.length} numbers copied! Create a WhatsApp Broadcast List and paste.`);
  };

  const copyMessageAndPhones = () => {
    if (!message.trim()) { toast.error('Write a message first'); return; }
    const text = `MESSAGE:\n${message}\n\nCONTACTS:\n${broadcastTargets.map(c => `${c.name}: ${c.phone}`).join('\n')}`;
    navigator.clipboard.writeText(text);
    toast.success('Message + contacts copied!');
  };

  const toggleSelect = (id) => {
    setSelectedContacts(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  if (!user) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-orange-500" /></div>;
  if (!isAdmin) return <div className="text-center py-20 text-red-500 font-semibold">Admin access only.</div>;

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 bg-green-100 rounded-full">
            <MessageSquare className="h-6 w-6 text-green-600" />
          </div>
          <h1 className="text-2xl font-black text-gray-800">WhatsApp Broadcast</h1>
          <Badge className="bg-green-500 text-white text-xs">WhatsApp</Badge>
        </div>
        <p className="text-gray-500 text-sm ml-14">Manage your contact list and broadcast messages via WhatsApp to customers.</p>
        <div className="flex gap-3 mt-2 ml-14">
          <Badge className="bg-blue-100 text-blue-700"><Users className="h-3 w-3 mr-1" />{contacts.length} contacts</Badge>
          <Badge className="bg-green-100 text-green-700"><Phone className="h-3 w-3 mr-1" />{groups.length - 1} groups</Badge>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {[
          { id: 'contacts', label: '👥 Contacts' },
          { id: 'broadcast', label: '📲 WhatsApp Broadcast' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap px-3 ${tab === t.id ? 'bg-green-600 text-white shadow' : 'bg-white text-gray-600 border'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── CONTACTS TAB ─── */}
      {tab === 'contacts' && (
        <div className="space-y-4">
          {/* Action bar */}
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setShowAddForm(!showAddForm)} size="sm" className="bg-orange-500 hover:bg-orange-600 gap-1">
              <UserPlus className="h-4 w-4" /> Add Contact
            </Button>
            <Button onClick={() => setShowBulkImport(!showBulkImport)} size="sm" variant="outline" className="gap-1">
              <Upload className="h-4 w-4" /> Bulk Import
            </Button>
            <Button onClick={importFromOrders} size="sm" variant="outline" className="gap-1" disabled={isAdding}>
              {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Import from Orders
            </Button>
          </div>

          {/* Add single contact form */}
          <AnimatePresence>
            {showAddForm && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                <Card className="p-4 border-orange-200 bg-orange-50">
                  <h3 className="font-bold text-gray-800 mb-3 text-sm">Add New Contact</h3>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <Label className="text-xs mb-1 block">Name</Label>
                      <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Customer name" />
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block">Phone * (Ghana)</Label>
                      <Input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="0244123456" />
                    </div>
                  </div>
                  <div className="mb-3">
                    <Label className="text-xs mb-1 block">Group</Label>
                    <Input value={newGroup} onChange={e => setNewGroup(e.target.value)} placeholder="Customers, VIP, etc." />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAddContact} disabled={addContactMutation.isPending} size="sm" className="bg-orange-500 hover:bg-orange-600">
                      {addContactMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add
                    </Button>
                    <Button onClick={() => setShowAddForm(false)} size="sm" variant="ghost"><X className="h-4 w-4" /></Button>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bulk import */}
          <AnimatePresence>
            {showBulkImport && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                <Card className="p-4 border-blue-200 bg-blue-50">
                  <h3 className="font-bold text-gray-800 mb-2 text-sm">Bulk Import Phone Numbers</h3>
                  <p className="text-xs text-gray-500 mb-2">One per line. Format: <code>Name, 0244123456</code> or just <code>0244123456</code></p>
                  <Textarea value={bulkText} onChange={e => setBulkText(e.target.value)} rows={5} placeholder={"Kofi Mensah, 0244123456\nAba Asante, 0551234567\n0201234567"} className="font-mono text-sm mb-3 bg-white" />
                  <div className="flex gap-2">
                    <Button onClick={handleBulkImport} disabled={isAdding} size="sm" className="bg-blue-600 hover:bg-blue-700">
                      {isAdding ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />} Import
                    </Button>
                    <Button onClick={() => setShowBulkImport(false)} size="sm" variant="ghost"><X className="h-4 w-4" /></Button>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Search + Group filter */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search contacts..." className="pl-9" />
            </div>
            <select value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-400">
              {groups.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          {/* Contact list */}
          {isLoading ? (
            <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin text-orange-500 mx-auto" /></div>
          ) : filteredContacts.length === 0 ? (
            <Card className="p-8 text-center text-gray-400">
              <Users className="h-10 w-10 mx-auto mb-2 text-gray-200" />
              <p>No contacts yet. Add contacts or import from orders.</p>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-500">{filteredContacts.length} contacts</p>
                <button onClick={() => {
                  const allIds = filteredContacts.map(c => c.id);
                  setSelectedContacts(prev => prev.length === allIds.length ? [] : allIds);
                }} className="text-xs text-orange-600 font-semibold">
                  {selectedContacts.length === filteredContacts.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <div className="divide-y max-h-96 overflow-y-auto">
                {filteredContacts.map(c => (
                  <div key={c.id} className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${selectedContacts.includes(c.id) ? 'bg-orange-50' : ''}`}>
                    <input type="checkbox" checked={selectedContacts.includes(c.id)} onChange={() => toggleSelect(c.id)} className="w-4 h-4 accent-orange-500" />
                    <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 font-bold text-orange-600 text-sm">
                      {(c.name || 'C')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-800 truncate">{c.name || 'Customer'}</p>
                      <p className="text-xs text-gray-500">{c.phone}</p>
                    </div>
                    <Badge className="text-[10px] bg-gray-100 text-gray-600 hidden sm:flex">{c.group || 'Customers'}</Badge>
                    <button onClick={() => { if (confirm('Remove this contact?')) deleteContactMutation.mutate(c.id); }}
                      className="text-gray-300 hover:text-red-500 transition-colors ml-1">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ─── BROADCAST TAB ─── */}
      {tab === 'broadcast' && (
        <div className="space-y-5">
          <Card className="p-5 border-orange-200">
            <h2 className="font-bold text-gray-800 mb-1 flex items-center gap-2 text-base">
              <Send className="h-4 w-4 text-orange-500" /> Compose SMS Message
            </h2>
            <p className="text-xs text-gray-500 mb-4">Write your message and select who to send it to. For real Ghana SMS delivery, use the "Copy Numbers" button to paste into mNotify or Hubtel.</p>

            <div className="space-y-4">
              <div>
                <Label className="mb-1 block text-sm">Target Group</Label>
                <div className="flex flex-wrap gap-2">
                  {groups.map(g => (
                    <button key={g} onClick={() => setSelectedGroup(g)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${selectedGroup === g ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-300 hover:border-orange-400'}`}>
                      {g} {g === 'All' ? `(${contacts.length})` : `(${contacts.filter(c => c.group === g).length})`}
                    </button>
                  ))}
                </div>
              </div>

              {selectedContacts.length > 0 && (
                <div className="p-2 bg-orange-50 rounded-lg text-xs text-orange-700 font-medium flex items-center justify-between">
                  <span>📌 {selectedContacts.length} contacts hand-picked from Contacts tab</span>
                  <button onClick={() => setSelectedContacts([])} className="underline">Clear</button>
                </div>
              )}

              <div>
                <Label className="mb-1 block text-sm">Message *</Label>
                <Textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={5}
                  placeholder="e.g. Hi! Your order from FMM CLASSICO is ready 🚚. Call 0509896035 for queries. Thank you!"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>{message.length} chars</span>
                  <span>{Math.ceil(message.length / 160)} SMS page{Math.ceil(message.length / 160) !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>
          </Card>

          {!sendDone ? (
            <div className="space-y-3">
              <Button onClick={handleSendBroadcast} disabled={isSending || !message.trim()} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-5">
                {isSending
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Sending {sentCount}/{selectedContacts.length || broadcastTargets.length}...</>
                  : <><Send className="h-4 w-4 mr-2" /> Send to {selectedContacts.length > 0 ? selectedContacts.length : broadcastTargets.length} Contacts</>
                }
              </Button>

              <Card className="p-4 bg-green-50 border-green-200">
                <p className="text-sm font-semibold text-green-800 mb-1">📱 Real Ghana SMS (9000+)</p>
                <p className="text-xs text-gray-600 mb-3">
                  For guaranteed delivery via Ghana telecom networks (MTN, Vodafone, AirtelTigo), copy the numbers below and paste into <strong>mNotify</strong> or <strong>Hubtel SMS</strong> platforms.
                </p>
                <Button onClick={copyAllPhones} size="sm" variant="outline" className="gap-2 text-green-700 border-green-400">
                  <Download className="h-4 w-4" /> Copy {broadcastTargets.length} Numbers for mNotify / Hubtel
                </Button>
              </Card>
            </div>
          ) : (
            <Card className="p-6 bg-green-50 border-green-300 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-3" />
              <p className="font-bold text-green-800 text-lg">Message sent to {sentCount} contacts!</p>
              <p className="text-xs text-gray-500 mt-1 mb-4">Emails sent where available. Use mNotify/Hubtel for direct SMS.</p>
              <Button variant="ghost" className="text-orange-600" onClick={() => { setSendDone(false); setMessage(''); setSentCount(0); }}>
                Send Another
              </Button>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}