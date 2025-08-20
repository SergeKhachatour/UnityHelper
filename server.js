const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 3001;

// Simple logger used across the app (prints timestamped messages)
const logger = {
	info: (...args) => console.log(new Date().toISOString(), '[INFO]', ...args),
	warn: (...args) => console.warn(new Date().toISOString(), '[WARN]', ...args),
	error: (...args) => console.error(new Date().toISOString(), '[ERROR]', ...args),
	debug: (...args) => console.debug(new Date().toISOString(), '[DEBUG]', ...args)
};

// Most permissive CORS setup (for development only)
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', '*');
    res.header('Access-Control-Allow-Headers', '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});

app.use(cors());

// Parse JSON bodies
app.use(express.json());

// API key for authentication using .env file
const API_KEY = process.env.API_KEY;

// Middleware function to authenticate API requests
// Checks for a valid Authorization header with the correct API key
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401); 
    if (token !== API_KEY) return res.sendStatus(403); 
    next(); 
}

// Static data representing IoT Base Gateway locations
// Each marker contains geographical coordinates and a descriptive label
// Used to display network infrastructure points on the Unity map
const baseMarkers = [
    // Original city bases (scattered within ~2-3km)
    { blockchain: "Stellar", publicKey: "GA111111111111111111111111111111111111111111111111111", latitude: 37.7749 + (Math.random() * 0.02 - 0.01), longitude: -122.4194 + (Math.random() * 0.02 - 0.01), label: "IoT Base 100 - San Francisco" },
    { blockchain: "Stellar", publicKey: "GA222222222222222222222222222222222222222222222222222", latitude: 34.26945 + (Math.random() * 0.02 - 0.01), longitude: -118.7815 + (Math.random() * 0.02 - 0.01), label: "IoT Base-200 - Los Angeles" },
    { blockchain: "Stellar", publicKey: "GA333333333333333333333333333333333333333333333333333", latitude: 51.507351 + (Math.random() * 0.02 - 0.01), longitude: -0.127758 + (Math.random() * 0.02 - 0.01), label: "IoT Base-300 - London"},
    
    // Simi Valley bases (SV01-SV33) scattered within Simi Valley area
    { blockchain: "Stellar", publicKey: "GCRQTKFXY7XZV76K5QIWOEJEL23ZRBRUMQAAV5WVPC4L5QOOZ6XAYEYO", latitude: 34.269447 + (Math.random() * 0.01 - 0.005), longitude: -118.781479 + (Math.random() * 0.01 - 0.005), label: "IoT Base-SV01 - Simi Valley" },
    { blockchain: "Stellar", publicKey: "GSV02222222222222222222222222222222222222222222222222", latitude: 34.271856 + (Math.random() * 0.01 - 0.005), longitude: -118.766459 + (Math.random() * 0.01 - 0.005), label: "IoT Base-SV02 - Simi Valley" },
    { blockchain: "Stellar", publicKey: "GSV03333333333333333333333333333333333333333333333333", latitude: 34.261392 + (Math.random() * 0.01 - 0.005), longitude: -118.775471 + (Math.random() * 0.01 - 0.005), label: "IoT Base-SV03 - Simi Valley" },
    // ... continue pattern for SV04-SV33 ...
    { blockchain: "Stellar", publicKey: "GSV33333333333333333333333333333333333333333333333333", latitude: 34.265432 + (Math.random() * 0.01 - 0.005), longitude: -118.768234 + (Math.random() * 0.01 - 0.005), label: "IoT Base-SV33 - Simi Valley" },

    // Los Angeles Circle bases (LA01-LA10) scattered within LA area
    { blockchain: "Circle", publicKey: "0x1111111111111111111111111111111111111111", latitude: 34.052235 + (Math.random() * 0.015 - 0.0075), longitude: -118.243683 + (Math.random() * 0.015 - 0.0075), label: "IoT Base-LA01 - Downtown" },
    { blockchain: "Circle", publicKey: "0x2222222222222222222222222222222222222222", latitude: 34.081402 + (Math.random() * 0.015 - 0.0075), longitude: -118.152809 + (Math.random() * 0.015 - 0.0075), label: "IoT Base-LA02 - East LA" },
    { blockchain: "Circle", publicKey: "0x3333333333333333333333333333333333333333", latitude: 34.147812 + (Math.random() * 0.015 - 0.0075), longitude: -118.359802 + (Math.random() * 0.015 - 0.0075), label: "IoT Base-LA03 - North Hollywood" },
    // ... continue pattern for LA04-LA10 ...
    { blockchain: "Circle", publicKey: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", latitude: 34.167431 + (Math.random() * 0.015 - 0.0075), longitude: -118.60875 + (Math.random() * 0.015 - 0.0075), label: "IoT Base-LA10 - Encino" },

    // Simi Valley Circle bases (SV01-SV08)
    { blockchain: "Circle", publicKey: "0xb111111111111111111111111111111111111111", latitude: 34.269447 + (Math.random() * 0.01 - 0.005), longitude: -118.781482 + (Math.random() * 0.01 - 0.005), label: "IoT Base-SV01 - Simi Valley Town Center" },
    { blockchain: "Circle", publicKey: "0xb222222222222222222222222222222222222222", latitude: 34.276312 + (Math.random() * 0.01 - 0.005), longitude: -118.766891 + (Math.random() * 0.01 - 0.005), label: "IoT Base-SV02 - Wood Ranch" },
    // ... continue pattern for remaining SV entries ...
    { blockchain: "Circle", publicKey: "0xb888888888888888888888888888888888888888", latitude: 34.280123 + (Math.random() * 0.01 - 0.005), longitude: -118.742389 + (Math.random() * 0.01 - 0.005), label: "IoT Base-SV08 - Big Sky Ranch" },

    // Rio de Janeiro bases (scattered within ~2-3km)
    { blockchain: "Stellar", publicKey: "GBOOL6FPE2E24XWN26JXZASAOW4KP3WOZHNV67QSEMZ7HSODAB7RA7M6", latitude: -22.967852 + (Math.random() * 0.02 - 0.01), longitude: -43.178983 + (Math.random() * 0.02 - 0.01), label: "IoT Base-RIO01 - Christ the Redeemer" },
    { blockchain: "Stellar", publicKey: "GBWFXEJAJWG6TSYUOVE6OFQFEFJMQVJ54NO2IYMGQW2GSVFCCXANWLAB", latitude: -22.967852, longitude: -43.178983, label: "IoT Copacabana Palace" },
    { blockchain: "Stellar", publicKey: "GC2TR74CEDTJ46QJNTM3E4OU2Q2AR576LBXSDWCMKELMSF5UDQ2WF5QT", latitude: -22.9480 + (Math.random() * 0.02 - 0.01), longitude: -43.1566 + (Math.random() * 0.02 - 0.01), label: "IoT Base-RIO03 - Sugarloaf Mountain" },
    { blockchain: "Stellar", publicKey: "GAABVCQ6IPC3235RIHUPZ2HTY5G6O3WFYYD3CQGZAPXBMOJU7SFSDMFW", latitude: -22.9519 + (Math.random() * 0.02 - 0.01), longitude: -43.2105 + (Math.random() * 0.02 - 0.01), label: "IoT Base-RIO04 - Leblon" },
    { blockchain: "Stellar", publicKey: "GAWWB5OVQRDF25YDK3WX36QDMKFFJDHTCHTVXF7MOK2NQ6K6UBAYISUS", latitude: -22.9122 + (Math.random() * 0.02 - 0.01), longitude: -43.2302 + (Math.random() * 0.02 - 0.01), label: "IoT Base-RIO05 - Christ the Redeemer" },
    { blockchain: "Stellar", publicKey: "GAVGAV4T3SBJJIS735YRPI6D2BPKA7FJRYGRTDKAW4JEGFVK4YYHU6LN", latitude: -22.8943 + (Math.random() * 0.02 - 0.01), longitude: -43.1809 + (Math.random() * 0.02 - 0.01), label: "IoT Base-RIO06 - Flamengo" },
    { blockchain: "Stellar", publicKey: "GA4AFKYJ6CN53RYBEYPOUEG7EFHXTMVTO6HRXUGRNDYTIB6VXYQUJN3U", latitude: -22.9068 + (Math.random() * 0.02 - 0.01), longitude: -43.1822 + (Math.random() * 0.02 - 0.01), label: "IoT Base-RIO07 - Botafogo" },
    { blockchain: "Stellar", publicKey: "GASZVAC3BDCXWJ7M2EIDF7XKAG77KHEGVEQNOBZNGCF4MVEOH4DMKGUJ", latitude: -22.8975 + (Math.random() * 0.02 - 0.01), longitude: -43.1803 + (Math.random() * 0.02 - 0.01), label: "IoT Base-RIO08 - Urca" }
];

// Static data representing Blockchain Wallet locations in London
// Each marker contains geographical coordinates and a wallet identifier
// Used to display active wallet positions on the Unity map
const walletMarkers = [
    // London wallets (scattered within central London)
    { blockchain: "Stellar", publicKey: "GW111111111111111111111111111111111111111111111111111", latitude: 51.520156 + (Math.random() * 0.02 - 0.01), longitude: -0.117860 + (Math.random() * 0.02 - 0.01), label: "Wallet X - London" },
    { blockchain: "Stellar", publicKey: "GW222222222222222222222222222222222222222222222222222", latitude: 51.512634 + (Math.random() * 0.02 - 0.01), longitude: -0.131724 + (Math.random() * 0.02 - 0.01), label: "Wallet Y - London" },
    { blockchain: "Stellar", publicKey: "GW333333333333333333333333333333333333333333333333333", latitude: 51.507351 + (Math.random() * 0.02 - 0.01), longitude: -0.127758 + (Math.random() * 0.02 - 0.01), label: "Wallet X - London" },
    
    // Los Angeles wallets (scattered within LA area)
    { blockchain: "Stellar", publicKey: "GW444444444444444444444444444444444444444444444444444", latitude: 34.052235 + (Math.random() * 0.015 - 0.0075), longitude: -118.243683 + (Math.random() * 0.015 - 0.0075), label: "Wallet A - Los Angeles" },
    { blockchain: "Stellar", publicKey: "GW555555555555555555555555555555555555555555555555555", latitude: 34.040713 + (Math.random() * 0.015 - 0.0075), longitude: -118.246769 + (Math.random() * 0.015 - 0.0075), label: "Wallet B - Los Angeles" },
    { blockchain: "Stellar", publicKey: "GW666666666666666666666666666666666666666666666666666", latitude: 34.052235 + (Math.random() * 0.015 - 0.0075), longitude: -118.243683 + (Math.random() * 0.015 - 0.0075), label: "Wallet C - Los Angeles" },
    
    // Simi Valley wallets (scattered within Simi Valley)
    { blockchain: "Stellar", publicKey: "GW777777777777777777777777777777777777777777777777777", latitude: 34.269447 + (Math.random() * 0.01 - 0.005), longitude: -118.781479 + (Math.random() * 0.01 - 0.005), label: "Wallet SV1 - Simi Valley" },
    { blockchain: "Stellar", publicKey: "GW888888888888888888888888888888888888888888888888888", latitude: 34.271856 + (Math.random() * 0.01 - 0.005), longitude: -118.766459 + (Math.random() * 0.01 - 0.005), label: "Wallet SV2 - Simi Valley" },
    { blockchain: "Stellar", publicKey: "GW999999999999999999999999999999999999999999999999999", latitude: 34.261392 + (Math.random() * 0.01 - 0.005), longitude: -118.775471 + (Math.random() * 0.01 - 0.005), label: "Wallet SV3 - Simi Valley" },
    { blockchain: "Stellar", publicKey: "GW000000000000000000000000000000000000000000000000000", latitude: 34.277653 + (Math.random() * 0.01 - 0.005), longitude: -118.788688 + (Math.random() * 0.01 - 0.005), label: "Wallet SV4 - Simi Valley" }
];

// API endpoint to retrieve Base Gateway marker data
// Protected by authentication middleware
// Returns: Array of marker objects with lat/long coordinates and labels
app.get('/api/base_markers', authenticateToken, async (req, res) => {
    try{
        res.json(baseMarkers);
    }
    catch(error){
        console.error(`Base Markers Error: ${error.message}`);
        res.status(400).send(`Base Markers Error: ${error.message}`);
    }
});

// API endpoint to retrieve Wallet marker data
// Protected by authentication middleware
// Returns: Array of marker objects with lat/long coordinates and labels
app.get('/api/wallet_markers', authenticateToken, async (req, res) => {
    try{
        res.json(walletMarkers);
    }
    catch(error){
        console.error(`Wallet Markers Error: ${error.message}`);
        res.status(400).send(`Wallet Markers Error: ${error.message}`);
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    logger.info('=== HEALTH CHECK ===');
    res.status(200).json({ status: 'healthy xxx' });
  });
  
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});