# Cloudflare Analytics Dashboard

Multi-account, multi-zone Cloudflare traffic analytics dashboard

English | [中文](./README.md)

## Features

- Support for multiple Cloudflare accounts
- Multi-zone traffic monitoring
- Real-time data chart display
- 30-day historical data analysis
- Hourly precision for 1-day and 3-day data
- Daily precision for 7-day and 30-day data
- Multi-language support (Chinese/English)
- **Geography Statistics**: Bar chart and list display of today's top 5 countries/regions by traffic (only shown in 1-day data view)

## Tech Stack

- Frontend: React + Recharts
- Backend: Node.js + Express
- Deployment: Docker + Nginx

## Quick Start

### Configuration Methods (Environment Variables Supported!)

Now supports three configuration methods, listed by priority:

#### Method 1: Environment Variable Configuration (Recommended)

```bash
# Single account configuration
docker run -p 80:80 \
  -e CF_TOKENS="your_cloudflare_api_token" \
  -e CF_ZONES="zone_id_1,zone_id_2" \
  -e CF_DOMAINS="example.com,cdn.example.com" \
  -e CF_ACCOUNT_NAME="My Primary Account" \
  geekertao/cloudflare-analytics

# Multi-account configuration
docker run -p 80:80 \
  -e CF_TOKENS_1="token1" \
  -e CF_ZONES_1="zone1,zone2" \
  -e CF_DOMAINS_1="site1.com,site2.com" \
  -e CF_ACCOUNT_NAME_1="Account 1" \
  -e CF_TOKENS_2="token2" \
  -e CF_ZONES_2="zone3,zone4" \
  -e CF_DOMAINS_2="site3.com,site4.com" \
  -e CF_ACCOUNT_NAME_2="Account 2" \
  geekertao/cloudflare-analytics

# JSON format configuration
docker run -p 80:80 \
  -e CF_CONFIG='{"accounts":[{"name":"Primary Account","token":"your_token","zones":[{"zone_id":"zone1","domain":"example.com"},{"zone_id":"zone2","domain":"cdn.example.com"}]}]}' \
  geekertao/cloudflare-analytics
```

#### Method 2: Docker Compose Configuration

Edit the `docker-compose.yml` file and modify the environment section:

```yaml
environment:
  - CF_TOKENS=your_cf_token_here
  - CF_ZONES=zone_id_1,zone_id_2
  - CF_DOMAINS=example.com,cdn.example.com
  - CF_ACCOUNT_NAME=My Primary Account
```

#### Method 3: Configuration File (Traditional Method)

Edit the `server/zones.yml` file:

```yaml
accounts:
  - name: "Account Name"
    token: "Your Cloudflare API Token"
    zones:
      - domain: "example.com"
        zone_id: "Your Zone ID"
```

### Local Development Steps

1. Clone the project

```bash
git clone <repository-url>
cd Cloudflare-Analytics
```

2. Generate package-lock.json files (Important!)

```bash
# Method 1: Manual generation (recommended)
cd web && npm install --package-lock-only && cd ..
cd server && npm install --package-lock-only && cd ..

# Method 2: Use helper script
node generate-lockfiles.js
```

3. Start services

```bash
# Using Docker Compose (recommended)
docker-compose up -d

# Or build and run directly
docker build -t cf-analytics .
docker run -p 80:80 \
  -e CF_TOKENS="your_token" \
  -e CF_ZONES="your_zone_id" \
  -e CF_DOMAINS="your_domain" \
  cf-analytics
```

### Cloudflare API Token Configuration

To use this dashboard, you need to create a Cloudflare API Token with the following permissions:

1. **Account | Analytics | Read**
2. **Zone | Analytics | Read**
3. **Zone | Zone | Read**

You can create the token at: https://dash.cloudflare.com/profile/api-tokens

### 📋 Token Permissions vs Configured Zones

**Important Note**: Token permissions and actually configured zones are two different concepts:

#### Token Permission Scope

- Your Cloudflare API Token may have permission to access **all zones** under your account
- During token validation, you'll see something like: `Token can access 10 zones`
- This means your account has 10 total zones, and the token can access all of them

#### Project Configured Zones

- You can **selectively configure** which zones you want to monitor
- For example: Configure only 3 important zones for monitoring
- The system will show: `Configuration loaded successfully: 1 account (3 zones)`

#### Validation Log Example

```bash
[Token Validation] Token can access 10 zones              # ← Token permission scope
✓ Account Geekertao token validation successful, can access 10 zones
  ✓ Zone geekertao.top (xxx) accessible                   # ← Specific configured zones
  ✓ Zone dpik.top (xxx) accessible
  ✓ Zone felicity.ac.cn (xxx) accessible

Configuration loaded successfully: 1 account (3 zones)    # ← Actually monitored zone count
```

**Advantages** of this design:

- 🔒 **Security**: Token permission validation ensures all configured zones are accessible
- 🎯 **Flexibility**: You can choose to monitor only important zones, avoiding information overload
- 📊 **Performance**: Reduces unnecessary data fetching, improving system response speed
- 🔧 **Scalability**: Easy to add more zones to monitoring list in the future

### Data Update Frequency

- Backend data updates: **Every 2 hours**
- Data precision:
  - **1-day and 3-day data**: Hourly precision (up to 168 data points)
  - **7-day and 30-day data**: Daily precision (up to 45 data points)

### Troubleshooting GitHub Actions Build Issues

If you encounter `npm ci` related build errors, please ensure:

1. All package-lock.json files are generated and committed to git
2. package.json and package-lock.json versions match
3. Run the commands in step 2 above to regenerate lock files

### Environment Variables

- `NGINX_PORT`: Nginx port (default: 80)
- `CF_TOKENS`: Cloudflare API tokens (comma-separated for single account)
- `CF_ZONES`: Zone IDs (comma-separated)
- `CF_DOMAINS`: Domain names (comma-separated)
- `CF_ACCOUNT_NAME`: Account display name

## Features Overview

### Multi-language Support

- Supports Chinese and English interfaces
- Language preference is saved locally
- Real-time language switching

### Data Visualization

- **Statistics Cards**: Total requests, traffic, and threats
- **Cache Analytics**: Request and bandwidth cache statistics with pie charts
- **Geography Analytics**: Shows today's top 5 countries/regions by traffic volume (only displayed in 1-day data view)
- **Traffic Trends**: Line charts showing hourly/daily trends
- **Responsive Design**: Perfect adaptation for desktop and mobile

### Time Range Selection

- **1 Day**: Hourly data (24 data points)
- **3 Days**: Hourly data (72 data points)
- **7 Days**: Daily data (7 data points)
- **30 Days**: Daily data (30 data points)

## GitHub Actions

This project uses GitHub Actions to automatically build and push Docker images to GitHub Container Registry and Docker Hub.

Build triggers:

- Push to `main` or `master` branch
- Create Pull Request
- Manual trigger

Required GitHub Secrets:

- `DOCKERHUB_USERNAME`: Docker Hub username
- `DOCKERHUB_TOKEN`: Docker Hub access token

## Project Structure

```
├── web/                    # Frontend React application
├── server/                 # Backend API service
├── .github/workflows/      # GitHub Actions configuration
├── dockerfile              # Docker build configuration
├── nginx.conf.template     # Nginx configuration template
├── start.sh               # Container startup script
├── docker-compose.yml     # Docker Compose configuration
└── generate-lockfiles.js  # Helper script for generating lock files
```

## API Endpoints

- `GET /health` - Health check
- `GET /api/status` - API status information
- `GET /data/analytics.json` - Analytics data (updated every 2 hours)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you encounter any issues or have questions, please:

1. Check the [Issues](https://github.com/Geekertao/Cloudflare-Analytics/issues) page
2. Create a new issue with detailed information
3. Ensure you have proper Cloudflare API token permissions

## Acknowledgments

- [Cloudflare](https://cloudflare.com) for providing the Analytics API
- [Recharts](https://recharts.org) for the charting library
- [React](https://reactjs.org) for the frontend framework
