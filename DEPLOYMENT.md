# OpenJob Windows - Deployment Guide

This guide covers different ways to deploy and run the OpenJob Windows application.

## 🚀 Quick Start (Recommended)

### Option 1: Static File Server
The easiest way to run the application:

```bash
# Navigate to the project directory
cd openjob-windows

# Install a simple static file server
npm install -g serve

# Serve the built application
serve dist

# Or use Python (if available)
python -m http.server 8000 -d dist

# Or use Node.js built-in server
npx serve dist
```

The application will be available at `http://localhost:8888` (or the port shown).

### Option 2: Development Mode
For development or customization:

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Application available at http://localhost:8888
```

## 🌐 Web Deployment

### Deploy to Netlify
1. Create account at netlify.com
2. Drag and drop the `dist` folder to Netlify
3. Your app will be live with a custom URL

### Deploy to Vercel
1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in the project directory
3. Follow the prompts

### Deploy to GitHub Pages
1. Push code to GitHub repository
2. Go to Settings → Pages
3. Set source to "GitHub Actions"
4. Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [ main ]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

## 🖥️ Desktop Application

### Using Electron (Windows/Mac/Linux)
To create a true desktop application:

1. Install Electron:
```bash
npm install electron electron-builder --save-dev
```

2. Add to `package.json`:
```json
{
  "main": "electron.js",
  "scripts": {
    "electron": "electron .",
    "electron-build": "electron-builder"
  },
  "build": {
    "appId": "com.openjob.windows",
    "productName": "OpenJob Windows",
    "directories": {
      "output": "electron-dist"
    },
    "files": [
      "dist/**/*",
      "electron.js"
    ]
  }
}
```

3. Create `electron.js`:
```javascript
const { app, BrowserWindow } = require('electron')
const path = require('path')

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  win.loadFile('dist/index.html')
}

app.whenReady().then(createWindow)
```

4. Build desktop app:
```bash
npm run build
npm run electron-build
```

### Using Tauri (Rust-based, smaller size)
For a more efficient desktop app:

1. Install Tauri CLI:
```bash
npm install @tauri-apps/cli --save-dev
```

2. Initialize Tauri:
```bash
npx tauri init
```

3. Configure `src-tauri/tauri.conf.json`
4. Build: `npx tauri build`

## 🐳 Docker Deployment

### Dockerfile
```dockerfile
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Build and run:
```bash
docker build -t openjob-windows .
docker run -p 8080:80 openjob-windows
```

## ☁️ Cloud Deployment

### AWS S3 + CloudFront
1. Create S3 bucket
2. Upload `dist` folder contents
3. Configure bucket for static website hosting
4. Set up CloudFront distribution

### Google Cloud Storage
1. Create storage bucket
2. Upload files: `gsutil -m cp -r dist/* gs://your-bucket/`
3. Make bucket public: `gsutil iam ch allUsers:objectViewer gs://your-bucket`

### Azure Static Web Apps
1. Create Static Web App resource
2. Connect to GitHub repository
3. Configure build settings:
   - App location: `/`
   - Build location: `dist`

## 🔧 Configuration for Production

### Environment Variables
Create `.env.production`:
```
VITE_APP_TITLE=JobM8
VITE_DEFAULT_AI_PROVIDER=openai
```

### Build Optimization
```bash
# Build with optimizations
npm run build

# Analyze bundle size
npm install -g vite-bundle-analyzer
npx vite-bundle-analyzer dist/assets/*.js
```

### Performance Tuning
- Enable gzip compression on server
- Set proper cache headers
- Use CDN for static assets
- Optimize images and fonts

## 🔒 Security Considerations

### HTTPS
Always serve over HTTPS in production:
- Use Let's Encrypt for free SSL certificates
- Configure proper security headers
- Enable HSTS

### Content Security Policy
Add to your server configuration:
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';
```

### API Keys
- Never commit API keys to version control
- Use environment variables
- Implement key rotation

## 📱 Mobile Considerations

### Progressive Web App (PWA)
The app includes PWA capabilities:
- Works offline
- Can be installed on mobile devices
- Responsive design

### Mobile Deployment
- Test on various screen sizes
- Ensure touch-friendly interface
- Optimize for mobile performance

## 🔄 Updates and Maintenance

### Updating the Application
1. Pull latest changes
2. Run `npm install` for new dependencies
3. Run `npm run build`
4. Deploy new `dist` folder

### Monitoring
- Set up error tracking (Sentry, LogRocket)
- Monitor performance metrics
- Track user analytics (if desired)

### Backup Strategy
- Regular backups of user data
- Version control for code
- Database backups (if using external storage)

## 🆘 Troubleshooting Deployment

### Common Issues

**Build Fails**
- Check Node.js version (18+ required)
- Clear node_modules and reinstall
- Check for dependency conflicts

**App Won't Load**
- Verify all files are uploaded
- Check server configuration
- Ensure proper MIME types

**AI Features Not Working**
- Verify API keys are set
- Check CORS configuration
- Ensure network connectivity

### Performance Issues
- Enable compression
- Optimize images
- Use CDN
- Implement caching

---

Choose the deployment method that best fits your needs. For most users, the static file server option is the simplest and most reliable.

