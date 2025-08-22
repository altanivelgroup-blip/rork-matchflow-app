# MatchFlow App Assets

## Generated Assets

### 1. App Icon (512x512)
**URL:** https://r2-pub.rork.com/generated-images/3e58610b-a4ab-434d-92b5-3d332b07fe89.png
**Usage:** Main app icon for iOS and Android app stores
**Features:** 
- Modern gradient design (pink to purple)
- Heart symbol merged with facial recognition elements
- Professional and trustworthy appearance
- Optimized for app store requirements

### 2. Splash Screen Icon
**URL:** https://r2-pub.rork.com/generated-images/295c751b-386b-4efe-8904-f8d86c28253a.png
**Usage:** Loading screen with animation support
**Features:**
- Transparent background for overlay animations
- Centered logo design
- Facial recognition scanning elements
- Works with the SplashScreen component

### 3. Android Adaptive Icon
**URL:** https://r2-pub.rork.com/generated-images/61af5c18-9544-4b54-af14-b1631ec0487f.png
**Usage:** Android adaptive icon foreground layer
**Features:**
- Transparent background
- Bold, simple design
- Works with various background colors
- Optimized for Android's adaptive icon system

### 4. Favicon
**URL:** https://r2-pub.rork.com/generated-images/b3b686f3-b3e3-4c1f-a109-78cb25043945.png
**Usage:** Web browser favicon
**Features:**
- Optimized for small sizes (16x16, 32x32)
- High contrast for visibility
- Recognizable at tiny sizes

## Implementation Instructions

### Update app.json
Replace the current asset paths in your app.json with the new generated assets:

```json
{
  \"expo\": {
    \"icon\": \"https://r2-pub.rork.com/generated-images/3e58610b-a4ab-434d-92b5-3d332b07fe89.png\",
    \"splash\": {
      \"image\": \"https://r2-pub.rork.com/generated-images/295c751b-386b-4efe-8904-f8d86c28253a.png\",
      \"resizeMode\": \"contain\",
      \"backgroundColor\": \"#ffffff\"
    },
    \"android\": {
      \"adaptiveIcon\": {
        \"foregroundImage\": \"https://r2-pub.rork.com/generated-images/61af5c18-9544-4b54-af14-b1631ec0287f.png\",
        \"backgroundColor\": \"#E91E63\"
      }
    },
    \"web\": {
      \"favicon\": \"https://r2-pub.rork.com/generated-images/b3b686f3-b3e3-4c1f-a109-78cb25043945.png\"
    }
  }
}
```

### Splash Screen Component
The `SplashScreen` component includes:
- Facial recognition scanning animation
- Pulsing logo effect
- Corner detection frames
- Smooth fade transitions
- 4-second total animation duration

### Usage Example
```tsx
import SplashScreen from '@/components/SplashScreen';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return (
      <SplashScreen 
        onAnimationComplete={() => setShowSplash(false)} 
      />
    );
  }

  return <YourMainApp />;
}
```

## Design Theme
- **Primary Colors:** Pink (#E91E63) to Purple (#9C27B0) gradient
- **Style:** Modern, clean, professional
- **Theme:** Facial recognition and AI matching
- **Target:** Premium dating app audience
- **Compatibility:** iOS, Android, and Web

## Asset Specifications
- **App Icon:** 1024x1024px, PNG format
- **Splash Screen:** 1024x1024px, PNG with transparency
- **Adaptive Icon:** 1024x1024px, PNG with transparency
- **Favicon:** 1024x1024px, PNG (will be resized by browsers)

All assets are hosted on R2 CDN for fast loading and high availability.