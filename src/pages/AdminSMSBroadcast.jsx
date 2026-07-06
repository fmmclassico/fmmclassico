import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Send, Upload, Loader2, CheckCircle2, XCircle, Trash2, Phone, Users } from 'lucide-react';
import { toast } from 'sonner';

var SMS_CLIENT_ID = import.meta.env.VITE_HUBTEL_SMS_CLIENT_ID || '';
var SMS_CLIENT_SECRET = import.meta.env.VITE_HUBTEL_SMS_CLIENT_SECRET || '';
var SMS_SENDER_ID = import.meta.env.VITE_HUBTEL_SMS_SENDER_ID || 'FMMCLASSICO';

function formatPhone(phone) {
  if (!phone) return null;
  var cleaned = phone.toString().replace(/[^0-9+]/g, '');
  if (cleaned.startsWith('+233')) return cleaned.replace('+', '');
  if (cleaned.startsWith('233')) return cleaned;
  if (cleaned.startsWith('0') && cleaned.length === 10) return '233' + cleaned.slice(1);
  if (cleaned.length === 9) return '233' + cleaned;
  return null;
}

async function sendSMS(to, message) {
  var formattedPhone = formatPhone(to);
  if (!formattedPhone) return { success: false, phone: to, error: 'Invalid phone number' };

  try {
    var url = 'https://sms.hubtel.com/v1/messages/send?clientsecret=' + SMS_CLIENT_SECRET + '&clientid=' + SMS_CLIENT_ID + '&from=' + SMS_SENDER_ID + '&to=' + formattedPhone + '&content=' + encodeURIComponent(message);

    var response = await fetch(url);
    var data = await response.json();

    if (response.ok && data.status === 0) {
      return { success: true, phone: to };
    }
    return { success: false, phone: to, error: data.message || 'Failed' };
  } catch (err) {
    return { success: false, phone: to, error: err.message };
  }
}

function parseExcel(file) {
  return new Promise(function(resolve, reject) {
    var reader = new FileReader();
    reader.onload = function(e) {
      try {
        var text = e.target.result;
        var lines = text.split(/\r?
/).filter(function(line) { return line.trim(); });
        var phones = [];
        for (var i = 0; i < lines.length; i++) {
          var cells = lines[i].split(/[,;\t]/);
          for (var j = 0; j < cells.length; j++) {
            var cell = cells[j].trim().replace(/["']/g, '');
            if (cell.match(/^[+]?[0-9]{9,15}$/)) {
              phones.push(cell);
            }
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
  var [user, setUser] = useState(null);
  var [isAdmin, setIsAdmin] = useState(false);
  var [message, setMessage] = useState('');
  var [contacts, setContacts] = useState([]);
  var [manualNumber, setManualNumber] = useState('');
  var [isSending, setIsSending] = useState(false);
  var [results, setResults] = useState(null);
  var [progress, setProgress] = useState(0);
  var fileInputRef = useRef(null);

  useEffect(function() {
    base44.auth.me().then(function(u) { setUser(u); setIsAdmin(u.role === 'admin'); }).catch(function() {});
  }, []);

  var handleFileUpload = async function(e) {
    var file = e.target.files?.[0];
    if (!file) return;
    try {
      var phones = await parseExcel(file);
      if (phones.length === 0) {
        toast.error('No valid phone numbers found in file');
        return;
      }
      setContacts(function(prev) {
        var existing = prev.map(function(c) { return c.phone; });
        var newContacts = phones.filter(function(p) { return !existing.includes(p); }).map(function(p) { return { phone: p }; });
        return prev.concat(newContacts);
      });
      toast.success(phones.length + ' contacts loaded from file');
    } catch (err) {
      toast.error('Failed to read file: ' + err.message);
    }
    e.target.value = '';
  };

  var handleAddManual = function() {
    if (!manualNumber.trim()) return;
    var numbers = manualNumber.split(/[,;
]/).map(function(n) { return n.trim(); }).filter(Boolean);
    var newContacts = [];
    var existing = contacts.map(function(c) { return c.phone; });
    for (var i = 0; i < numbers.length; i++) {
      if (!existing.includes(numbers[i])) {
        newContacts.push({ phone: numbers[i] });
        existing.push(numbers[i]);
      }
    }
    if (newContacts.length > 0) {
      setContacts(function(prev) { return prev.concat(newContacts); });
      toast.success(newContacts.length + ' number(s) added');
    }
    setManualNumber('');
  };

  var handleRemoveContact = function(index) {
    setContacts(function(prev) { return prev.filter(function(_, i) { return i !== index; }); });
  };

  var handleClearAll = function() {
    if (confirm('Clear all ' + contacts.length + ' contacts?')) {
      setContacts([]);
    }
  };

  var handleSend = async function() {
    if (!message.trim()) { toast.error('Please write a message'); return; }
    if (contacts.length === 0) { toast.error('Add at least one contact'); return; }
    if (!SMS_CLIENT_ID || !SMS_CLIENT_SECRET) { toast.error('Hubtel SMS credentials not configured. Add VITE_HUBTEL_SMS_CLIENT_ID and VITE_HUBTEL_SMS_CLIENT_SECRET to env vars.'); return; }

    setIsSending(true);
    setResults(null);
    setProgress(0);

    var successCount = 0;
    var failCount = 0;
    var failedNumbers = [];

    for (var i = 0; i < contacts.length; i++) {
      var result = await sendSMS(contacts[i].phone, message);
      if (result.success) {
        successCount++;
      } else {
        failCount++;
        failedNumbers.push(result.phone + ' (' + (result.error || 'failed') + ')');
      }
      setProgress(Math.round(((i + 1) / contacts.length) * 100));
      // Small delay to avoid rate limiting
      if (i < contacts.length - 1) {
        await new Promise(function(resolve) { setTimeout(resolve, 500); });
      }
    }

    setResults({ success: successCount, failed: failCount, failedNumbers: failedNumbers });
    setIsSending(false);

    if (failCount === 0) {
      toast.success('All ' + successCount + ' messages sent successfully!');
    } else {
      toast.error('Sent: ' + successCount + ', Failed: ' + failCount);
    }
  };

  if (!user) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!isAdmin) return <div className="p-8 text-center"><p>Admin access required</p></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Send className="w-5 h-5 text-blue-600" /> SMS Broadcast</h1>
        <p className="text-sm text-gray-500">Send SMS to one or many contacts using Hubtel. Upload Excel or type numbers.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Left: Message + Send */}
        <div className="space-y-4">
          <Card className="p-4 rounded-2xl">
            <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><Phone className="w-4 h-4" /> Compose Message</h2>
            <div>
              <Label className="text-sm font-medium">Message</Label>
              <Textarea value={message} onChange={function(e) { setMessage(e.target.value); }} placeholder="Type your SMS message here..." rows={6} className="mt-1 rounded-xl" />
              <p className="text-xs text-gray-400 mt-1">{message.length} characters {message.length > 160 ? '(' + Math.ceil(message.length / 160) + ' SMS parts)' : ''}</p>
            </div>

            <div className="mt-4">
              <Button onClick={handleSend} disabled={isSending || contacts.length === 0 || !message.trim()} className="w-full rounded-xl bg-blue-800 text-white hover:bg-blue-900 py-3">
                {isSending ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Sending... {progress}%</>
                ) : (
                  <><Send className="w-4 h-4 mr-2" /> Send SMS to {contacts.length} Contact{contacts.length !== 1 ? 's' : ''}</>
                )}
              </Button>
            </div>

            {/* Progress bar */}
            {isSending && (
              <div className="mt-3">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: progress + '%' }}></div>
                </div>
              </div>
            )}

            {/* Results */}
            {results && (
              <div className="mt-4 p-3 bg-gray-50 rounded-xl text-sm">
                <div className="flex items-center gap-2 mb-2">
                  {results.failed === 0 ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-red-500" />}
                  <span className="font-bold">Broadcast Complete</span>
                </div>
                <p className="text-green-700">Sent: {results.success}</p>
                {results.failed > 0 && (
                  <div>
                    <p className="text-red-600">Failed: {results.failed}</p>
                    <div className="mt-1 text-xs text-gray-500 max-h-20 overflow-y-auto">
                      {results.failedNumbers.map(function(n, i) { return <p key={i}>{n}</p>; })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Sender ID info */}
          <Card className="p-3 rounded-2xl bg-blue-50 border-blue-200">
            <p className="text-xs text-blue-700">Sender ID: <strong>{SMS_SENDER_ID}</strong></p>
            <p className="text-xs text-blue-600">Messages will appear from "FMMCLASSICO" on recipient phones.</p>
          </Card>
        </div>

        {/* Right: Contacts */}
        <div className="space-y-4">
          <Card className="p-4 rounded-2xl">
            <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><Users className="w-4 h-4" /> Contacts ({contacts.length})</h2>

            {/* Upload Excel */}
            <div className="mb-3">
              <input type="file" ref={fileInputRef} className="hidden" accept=".csv,.xlsx,.xls,.txt" onChange={handleFileUpload} />
              <Button variant="outline" className="w-full rounded-xl" onClick={function() { fileInputRef.current?.click(); }}>
                <Upload className="w-4 h-4 mr-2" /> Upload Excel / CSV File
              </Button>
              <p className="text-[10px] text-gray-400 mt-1">Accepts .csv, .xlsx, .xls, .txt files with phone numbers</p>
            </div>

            {/* Manual add */}
            <div className="mb-3">
              <Label className="text-xs font-medium">Add numbers manually</Label>
              <div className="flex gap-2 mt-1">
                <Input value={manualNumber} onChange={function(e) { setManualNumber(e.target.value); }} placeholder="0208207543 or multiple separated by commas" className="flex-1 rounded-xl text-sm" onKeyDown={function(e) { if (e.key === 'Enter') handleAddManual(); }} />
                <Button size="sm" onClick={handleAddManual} className="rounded-xl bg-green-600 text-white hover:bg-green-700">Add</Button>
              </div>
            </div>

            {/* Contact list */}
            {contacts.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Badge className="bg-blue-100 text-blue-700">{contacts.length} contacts</Badge>
                  <Button variant="ghost" size="sm" className="text-xs text-red-500 hover:text-red-700" onClick={handleClearAll}>
                    <Trash2 className="w-3 h-3 mr-1" /> Clear All
                  </Button>
                </div>
                <div className="max-h-[300px] overflow-y-auto space-y-1">
                  {contacts.map(function(contact, idx) {
                    return (
                      <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                        <span className="text-gray-700">{contact.phone}</span>
                        <button onClick={function() { handleRemoveContact(idx); }} className="text-red-400 hover:text-red-600">
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {contacts.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm">
                <Phone className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No contacts yet</p>
                <p className="text-xs">Upload a file or add numbers manually</p>
              </div>
            )}
          </Card>

          {/* Tips */}
          <Card className="p-3 rounded-2xl">
            <p className="text-xs font-semibold text-gray-700 mb-1">Tips:</p><ul className="text-xs text-gray-500 space-y-0.5 list-disc pl-4">
              <li>Numbers can be in format: 0208207543, 233208207543, or +233208207543</li>
              <li>Excel file should have phone numbers in any column</li>
              <li>Each SMS over 160 characters counts as multiple messages</li>
              <li>There is a 500ms delay between messages to avoid rate limits</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
