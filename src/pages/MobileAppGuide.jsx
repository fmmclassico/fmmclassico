import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Smartphone, Download, Globe, FileText, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function MobileAppGuide() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center mb-8">
        <Smartphone className="h-16 w-16 mx-auto mb-4 text-[#2E86C1]" />
        <h1 className="text-3xl font-bold text-gray-800 mb-2">FMM CLASSICO Mobile App</h1>
        <p className="text-gray-600">Progressive Web App (PWA) - Install on Any Device</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            What is a PWA?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 mb-3">
            A Progressive Web App (PWA) is a website that works like a native mobile app. 
            Users can install it on their phones without going through app stores, and it 
            will appear just like a regular app on their home screen.
          </p>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-800 font-semibold">✓ Benefits:</p>
            <ul className="text-sm text-green-700 mt-2 space-y-1">
              <li>• No app store approval needed</li>
              <li>• Works on iOS, Android, Windows, and Mac</li>
              <li>• Instant updates (no manual updates needed)</li>
              <li>• Takes up less space than native apps</li>
              <li>• Free to distribute</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-[#2E86C1]" />
            How to Install on iPhone (iOS)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 text-gray-700">
            <li className="flex gap-2">
              <span className="font-bold text-[#2E86C1]">1.</span>
              Open <strong>Safari</strong> browser on your iPhone
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-[#2E86C1]">2.</span>
              Go to the FMM CLASSICO website
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-[#2E86C1]">3.</span>
              Tap the <strong>Share</strong> button (square with arrow pointing up)
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-[#2E86C1]">4.</span>
              Scroll down and tap <strong>"Add to Home Screen"</strong>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-[#2E86C1]">5.</span>
              Tap <strong>"Add"</strong> in the top right corner
            </li>
          </ol>
          <p className="text-sm text-gray-500 mt-4">
            The app will now appear on your home screen like any other app!
          </p>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-[#2E86C1]" />
            How to Install on Android
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 text-gray-700">
            <li className="flex gap-2">
              <span className="font-bold text-[#2E86C1]">1.</span>
              Open <strong>Chrome</strong> browser on your Android phone
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-[#2E86C1]">2.</span>
              Go to the FMM CLASSICO website
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-[#2E86C1]">3.</span>
              Tap the <strong>three dots menu</strong> (⋮) in the top right
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-[#2E86C1]">4.</span>
              Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-[#2E86C1]">5.</span>
              Tap <strong>"Install"</strong> or <strong>"Add"</strong>
            </li>
          </ol>
          <p className="text-sm text-gray-500 mt-4">
            The app icon will now appear on your home screen or app drawer!
          </p>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-[#2E86C1]" />
            How to Install on Computer (Windows/Mac)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="font-semibold text-gray-800 mb-2">On Chrome/Edge:</p>
              <ol className="space-y-2 text-gray-700 text-sm">
                <li>1. Open the FMM CLASSICO website</li>
                <li>2. Look for the install icon (⊕ or ↓) in the address bar</li>
                <li>3. Click <strong>"Install"</strong></li>
                <li>4. The app will open in its own window and appear in your Start Menu/Applications</li>
              </ol>
            </div>
            <div>
              <p className="font-semibold text-gray-800 mb-2">On Safari (Mac):</p>
              <ol className="space-y-2 text-gray-700 text-sm">
                <li>1. Open the website in Safari</li>
                <li>2. Click <strong>File</strong> in the menu bar</li>
                <li>3. Click <strong>"Add to Dock..."</strong></li>
                <li>4. Click <strong>"Add"</strong></li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6 bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <FileText className="h-5 w-5" />
            Note About Native App Stores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 mb-3">
            If you specifically need the app on Apple App Store, Google Play Store, or 
            Microsoft Store, you would need to:
          </p>
          <ul className="text-sm text-gray-700 space-y-2 mb-4">
            <li>• Hire a mobile app developer to convert this PWA into a native app</li>
            <li>• Pay for developer accounts ($99/year for Apple, $25 one-time for Google)</li>
            <li>• Wait for app store approval (can take days to weeks)</li>
            <li>• Manage app updates manually through each store</li>
          </ul>
          <p className="text-sm text-blue-800 font-semibold">
            Recommendation: Start with the PWA approach above - it's free, instant, 
            and works on all devices!
          </p>
        </CardContent>
      </Card>

      <div className="text-center">
        <Link to="/">
          <Button className="bg-[#2E86C1] hover:bg-[#2578ae] text-white px-8 py-6 text-lg">
            <Smartphone className="mr-2 h-5 w-5" />
            Go to FMM CLASSICO Store
          </Button>
        </Link>
      </div>
    </div>
  );
}