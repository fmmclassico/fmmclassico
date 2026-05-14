import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Smartphone, Download, Globe, Apple, Monitor, CheckCircle, QrCode } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function DownloadApp() {
  const appUrl = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center mb-8">
        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#2E86C1] to-[#2578ae] flex items-center justify-center shadow-xl">
          <Smartphone className="h-10 w-10 text-white" />
        </div>
        <h1 className="text-4xl font-black text-gray-800 mb-2">FMM CLASSICO App</h1>
        <p className="text-gray-600 text-lg">Download & Install on Any Device</p>
        <p className="text-sm text-gray-500 mt-2">Your app URL: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{appUrl}</span></p>
      </div>

      <Card className="mb-6 border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-800">
            <CheckCircle className="h-5 w-5" />
            Your App is Live & Ready!
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 mb-3">
            Your FMM CLASSICO e-commerce app is fully deployed and accessible online. 
            Share the URL above with customers, or they can install it as a PWA (Progressive Web App) 
            on their phones and computers.
          </p>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-[#2E86C1]" />
            Install on iPhone (iOS)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 text-gray-700">
            <li className="flex gap-2">
              <span className="font-bold text-[#2E86C1]">1.</span>
              Open <strong>Safari</strong> browser
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-[#2E86C1]">2.</span>
              Visit: <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-sm">{appUrl}</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-[#2E86C1]">3.</span>
              Tap the <strong>Share</strong> button (square with arrow ↑)
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-[#2E86C1]">4.</span>
              Scroll and tap <strong>"Add to Home Screen"</strong>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-[#2E86C1]">5.</span>
              Tap <strong>"Add"</strong>
            </li>
          </ol>
          <p className="text-sm text-gray-500 mt-4">✓ App icon appears on home screen like a native app!</p>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-[#2E86C1]" />
            Install on Android
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 text-gray-700">
            <li className="flex gap-2">
              <span className="font-bold text-[#2E86C1]">1.</span>
              Open <strong>Chrome</strong> browser
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-[#2E86C1]">2.</span>
              Visit: <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-sm">{appUrl}</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-[#2E86C1]">3.</span>
              Tap <strong>three dots menu</strong> (⋮) top right
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-[#2E86C1]">4.</span>
              Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-[#2E86C1]">5.</span>
              Tap <strong>"Install"</strong>
            </li>
          </ol>
          <p className="text-sm text-gray-500 mt-4">✓ App appears in app drawer and home screen!</p>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5 text-[#2E86C1]" />
            Install on Computer (Windows/Mac)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="font-semibold text-gray-800 mb-2">Chrome / Edge:</p>
              <ol className="space-y-2 text-gray-700 text-sm">
                <li>1. Visit the app URL in browser</li>
                <li>2. Look for install icon (⊕ or ↓) in address bar</li>
                <li>3. Click <strong>"Install"</strong></li>
                <li>4. App opens in own window & appears in Start Menu/Applications</li>
              </ol>
            </div>
            <div>
              <p className="font-semibold text-gray-800 mb-2">Safari (Mac):</p>
              <ol className="space-y-2 text-gray-700 text-sm">
                <li>1. Open website in Safari</li>
                <li>2. Click <strong>File</strong> → <strong>"Add to Dock..."</strong></li>
                <li>3. Click <strong>"Add"</strong></li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6 bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <Globe className="h-5 w-5" />
            Share Your App
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="font-semibold text-gray-800 mb-2">Share via WhatsApp:</p>
            <a 
              href={`https://wa.me/?text=Check out FMM CLASSICO app - your one-stop shop for phones & electronics in Ghana! ${appUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-green-700 hover:text-green-800 font-medium"
            >
              <svg className="h-5 w-5 fill-green-600" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Share on WhatsApp
            </a>
          </div>
          <div>
            <p className="font-semibold text-gray-800 mb-2">Copy Link:</p>
            <div className="flex gap-2">
              <input 
                type="text" 
                readOnly 
                value={appUrl} 
                className="flex-1 text-sm border rounded px-3 py-2 bg-white"
              />
              <Button 
                onClick={() => {
                  navigator.clipboard.writeText(appUrl);
                  alert('URL copied to clipboard!');
                }}
                className="bg-[#2E86C1] hover:bg-[#2578ae]"
              >
                Copy
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-[#2E86C1]" />
            QR Code (Coming Soon)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 text-sm">
            You can generate a QR code for easy sharing. Customers can scan it with their phone 
            camera to instantly visit your app. Use any free QR code generator online with your app URL.
          </p>
        </CardContent>
      </Card>

      <div className="text-center space-y-4">
        <Link to="/">
          <Button className="bg-[#2E86C1] hover:bg-[#2578ae] text-white px-8 py-6 text-lg">
            <Globe className="mr-2 h-5 w-5" />
            Go to FMM CLASSICO Store
          </Button>
        </Link>
        <p className="text-sm text-gray-500">
          Your app is hosted at: <span className="font-mono">{appUrl}</span>
        </p>
      </div>
    </div>
  );
}