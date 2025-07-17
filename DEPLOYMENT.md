# Deployment Guide - IQ Tester on Render

This guide explains how to deploy the IQ Testing application to Render.

## 🚀 Deploy to Render

### Prerequisites
- Git repository with your code
- Render account (free tier available)

### Step 1: Prepare Your Repository

1. **Ensure all files are committed:**
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

2. **Verify your `package.json` has the correct scripts:**
```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  }
}
```

### Step 2: Create PostgreSQL Database on Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "PostgreSQL"
3. Configure the database:
   - **Name**: `iq-tester-db`
   - **Database**: `iq_tester`
   - **User**: `iq_tester_user`
   - **Region**: Choose closest to your users
   - **Plan**: Free (for testing) or Starter (for production)
4. Click "Create Database"
5. **Save the DATABASE_URL** from the database info page

### Step 3: Deploy the Web Service

1. In Render Dashboard, click "New +" → "Web Service"
2. Connect your Git repository
3. Configure the service:
   - **Name**: `iq-tester-app`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free (for testing) or Starter (for production)

### Step 4: Set Environment Variables

In the Render Web Service settings, add these environment variables:

```env
DATABASE_URL=postgresql://username:password@hostname:port/database
SESSION_SECRET=your-super-secure-production-secret-key
NODE_ENV=production
PORT=3000
```

**Important**: 
- Use the DATABASE_URL from Step 2
- Generate a strong SESSION_SECRET (32+ random characters)
- Set NODE_ENV to "production"

### Step 5: Deploy

1. Click "Create Web Service"
2. Render will automatically:
   - Clone your repository
   - Install dependencies
   - Start your application
   - Provide a public URL

### Step 6: Initialize Database

The application will automatically run the database schema on first startup. The admin user will be created with:
- **Username**: `admin`
- **Password**: `admin123`

**Security Note**: Change the admin password after first login in production!

## 🔧 Render Configuration Files

### render.yaml (Optional)
You can use this file for Infrastructure as Code:

```yaml
services:
  - type: web
    name: iq-tester-app
    env: node
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: SESSION_SECRET
        generateValue: true
      - key: DATABASE_URL
        fromDatabase:
          name: iq-tester-db
          property: connectionString
  
  - type: pserv
    name: iq-tester-db
    env: postgresql
    plan: free
    databaseName: iq_tester
    user: iq_tester_user
```

## 🌐 Access Your Application

After deployment:
1. **Application URL**: `https://your-app-name.onrender.com`
2. **Admin Login**: Use the admin tab with `admin`/`admin123`
3. **Candidate Registration**: Available on the main page

## 🔒 Production Security Checklist

Before going live:
- [ ] Change default admin password
- [ ] Use a strong SESSION_SECRET
- [ ] Enable SSL (Render provides this automatically)
- [ ] Review rate limiting settings
- [ ] Set up monitoring and logging
- [ ] Configure custom domain (if needed)
- [ ] Set up database backups

## 📊 Monitoring

Monitor your application:
- **Render Dashboard**: View logs, metrics, and deployments
- **Health Check**: `https://your-app.onrender.com/api/health`
- **Database Monitoring**: Available in PostgreSQL service

## 🚨 Troubleshooting

### Common Issues

**Database Connection Errors**:
1. Verify DATABASE_URL is correct
2. Check database service is running
3. Ensure database and web service are in same region

**Application Won't Start**:
1. Check build logs in Render dashboard
2. Verify all environment variables are set
3. Ensure Node.js version compatibility

**Session Issues**:
1. Verify SESSION_SECRET is set
2. Check PostgreSQL session table exists
3. Clear browser cookies

### Logs Access
```bash
# View real-time logs in Render Dashboard
# Or use Render CLI:
render logs -s your-service-name --tail
```

## 📈 Scaling

For production use:
- **Database**: Upgrade to Starter plan for better performance
- **Web Service**: Use Starter plan for zero cold starts
- **Custom Domain**: Configure your own domain
- **CDN**: Use Render's global CDN for static assets

## 🔄 Updates and Deployments

To update your application:
1. Push changes to your main branch
2. Render will automatically redeploy
3. Monitor deployment in dashboard
4. Test the updated application

---

Your IQ Testing application is now live and ready for candidates! 🎉 