import React, { useState, useEffect, useRef } from 'react';
import { appClient } from '@/api/appClient.js';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Send, Upload, Loader2, CheckCircle2, XCircle, Trash2, Phone, Users } from 'lucide-react';
import { toast } from 'sonner';

function formatPhone(phone) {
  if (!phone) return null;
  const cleaned = phone.toString().replace(/[^0-9+]/g, '');
  if (cleaned.startsWith('+233')) return cleaned;
  if (cleaned.startsWith('233')) return '+' + cleaned;
  if (cleaned.startsWith('0') && cleaned.length === 10) return '+233' + cleaned.slice(1);
  if (cleaned.length === 9) return '+233' + cleaned;
  return null;
}

function parseFileContacts(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
        const phones = [];
        for (const line of lines) {
          let cells = line.split(',');
          if (cells.length === 1) cells = line.split(';');
          if (cells.length === 1) cells = line.split('\t');
          for (const cell of cells) {
            const digitsOnly = cell.trim().replace(/"|'/g, '').replace(/[^0-9+]/g, '');
            if (digitsOnly.length >= 9 && digitsOnly.length <= 15) phones.push(digitsOnly);
          }
        }
        resolve([...new Set(phones)]);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

export default function AdminSMSBroadcast() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [message, setMessage] = useState('');
  const [contacts, setContacts] = useState([]);
  const [manualNumber, setManualNumber] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [results, setResults] = useState(null);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef(null);

  useEffect(() => {
    appClient.auth.me().then((u) => { setUser(u); setIsAdmin(u.role === 'admin'); }).catch(() => {});
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const phones = await parseFileContacts(file);
      if (phones.length === 0) return toast.error('No valid phone numbers found in file');
      setContacts((prev) => {
        const existing = prev.map((c) => c.phone);
        const newOnes = phones.filter((p) => !existing.includes(p)).map((p) => ({ phone: p }));
        return prev.concat(newOnes);
      });
      toast.success(`${phones.length} contacts loaded from file`);
    } catch (err) {
      toast.error('Failed to read file: ' + err.message);
    }
    e.target.value = '';
  };

  const handleAddManual = () => {
    if (!manualNumber.trim()) return;
    const numbers = manualNumber.replace(/[;,]/g, '\n').split('\n').map((n) => n.trim()).filter(Boolean);
    setContacts((prev) => {
      const existing = prev.map((c) => c.phone);
      const additions = numbers.filter((n) => !existing.includes(n)).map((n) => ({ phone: n }));
      if (additions.length > 0) toast.success(`${additions.length} number(s) added`);
      return prev.concat(additions);
    });
    setManualNumber('');
  };

  const handleSend = async () => {
    if (!message.trim()) return toast.error('Please write a message');
    if (contacts.length === 0) return toast.error('Add at least one contact');
    setIsSending(true);
    setResults(null);
    setProgress(0);
    let success = 0;
    let failed = 0;
    const failedNumbers = [];
    for (let i = 0; i < contacts.length; i++) {
      const formatted = formatPhone(contacts[i].phone);
      const result = formatted ? await appClient.integrations.Core.SendSMS({ to: formatted, message }) : { success: false, error: 'Invalid phone number' };
      if (result.success) success += 1;
      else {
        failed += 1;
        failedNumbers.push(`${contacts[i].phone} (${result.error || 'failed'})`);
      }
      setProgress(Math.round(((i + 1) / contacts.length) * 100));
      if (i < contacts.length - 1) await new Promise((resolve) => setTimeout(resolve, 300));
    }
    setResults({ success, failed, failedNumbers });
    setIsSending(false);
    if (failed === 0) toast.success(`All ${success} messages sent!`);
    else toast.error(`Sent: ${success}, Failed: ${failed}`);
  };

  if (!user) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!isAdmin) return <div className="p-8 text-center"><p>Admin access required</p></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Send className="w-5 h-5 text-blue-600" /> SMS Broadcast</h1>
        <p className="text-sm text-gray-500">Send SMS to one or many contacts using your deployed send-sms function</p>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-4">
          <Card className="p-4 rounded-2xl">
            <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><Phone className="w-4 h-4" /> Compose Message</h2>
            <Label className="text-sm font-medium">Message</Label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type your SMS message here..." rows={6} className="mt-1 rounded-xl" />
            <p className="text-xs text-gray-400 mt-1">{message.length} characters {message.length > 160 ? '(' + Math.ceil(message.length / 160) + ' SMS parts)' : ''}</p>
            <div className="mt-4">
              <Button onClick={handleSend} disabled={isSending || contacts.length === 0 || !message.trim()} className="w-full rounded-xl bg-blue-800 text-white hover:bg-blue-900 py-3">
                {isSending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Sending... {progress}%</> : <><Send className="w-4 h-4 mr-2" /> Send SMS to {contacts.length} Contact{contacts.length !== 1 ? 's' : ''}</>}
              </Button>
            </div>
            {isSending && <div className="mt-3"><div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: progress + '%' }}></div></div></div>}
            {results && (
              <div className="mt-4 p-3 bg-gray-50 rounded-xl text-sm">
                <div className="flex items-center gap-2 mb-2">{results.failed === 0 ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-red-500" />}<span className="font-bold">Broadcast Complete</span></div>
                <p className="text-green-700">Sent: {results.success}</p>
                {results.failed > 0 && <div><p className="text-red-600">Failed: {results.failed}</p><div className="mt-1 text-xs text-gray-500 max-h-20 overflow-y-auto">{results.failedNumbers.map((n, i) => <p key={i}>{n}</p>)}</div></div>}
              </div>
            )}
          </Card>
        </div>
        <div className="space-y-4">
          <Card className="p-4 rounded-2xl">
            <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><Users className="w-4 h-4" /> Contacts ({contacts.length})</h2>
            <div className="mb-3">
              <input type="file" ref={fileInputRef} className="hidden" accept=".csv,.xlsx,.xls,.txt" onChange={handleFileUpload} />
              <Button variant="outline" className="w-full rounded-xl" onClick={() => fileInputRef.current && fileInputRef.current.click()}><Upload className="w-4 h-4 mr-2" /> Upload Excel / CSV File</Button>
            </div>
            <div className="mb-3">
              <Label className="text-xs font-medium">Add numbers manually</Label>
              <div className="flex gap-2 mt-1"><Input value={manualNumber} onChange={(e) => setManualNumber(e.target.value)} placeholder="0208207543 or comma separated" className="flex-1 rounded-xl text-sm" onKeyDown={(e) => { if (e.key === 'Enter') handleAddManual(); }} /><Button size="sm" onClick={handleAddManual} className="rounded-xl bg-green-600 text-white hover:bg-green-700">Add</Button></div>
            </div>
            {contacts.length > 0 ? (
              <div>
                <div className="flex items-center justify-between mb-2"><Badge className="bg-blue-100 text-blue-700">{contacts.length} contacts</Badge><Button variant="ghost" size="sm" className="text-xs text-red-500 hover:text-red-700" onClick={() => setContacts([])}><Trash2 className="w-3 h-3 mr-1" /> Clear All</Button></div>
                <div className="max-h-[300px] overflow-y-auto space-y-1">{contacts.map((contact, idx) => <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm"><span className="text-gray-700">{contact.phone}</span><button onClick={() => setContacts((prev) => prev.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600"><XCircle className="w-4 h-4" /></button></div>)}</div>
              </div>
            ) : <div className="text-center py-8 text-gray-400 text-sm"><Phone className="w-8 h-8 mx-auto mb-2 opacity-50" /><p>No contacts yet</p><p className="text-xs">Upload a file or add numbers manually</p></div>}
          </Card>
          <Card className="p-3 rounded-2xl"><p className="text-xs font-semibold text-gray-700 mb-1">Tips:</p><ul className="text-xs text-gray-500 space-y-0.5 list-disc pl-4"><li>Numbers: 0208207543, 233208207543, or +233208207543</li><li>Excel: phone numbers found in any column</li><li>Over 160 chars counts as multiple SMS</li><li>This page now uses the server-side send-sms function instead of browser-side credentials</li></ul></Card>
        </div>
      </div>
    </div>
  );
}
