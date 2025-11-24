// Cloudflare Workers Script - FREE tier
// Deploy tại: https://workers.cloudflare.com/

/**
 * Firmware Proxy với License Verification
 * URLs KHÔNG BAO GIỜ gửi về client
 * Client chỉ nhận binary data sau khi verify license
 */

// Firmware URLs - CHỈ TỒN TẠI TRÊN SERVER
const FIRMWARE_URLS = {
  1: 'https://raw.githubusercontent.com/conghuy93/minizflash/main/firmware1.bin',
  2: 'https://raw.githubusercontent.com/conghuy93/minizflash/main/firmware2.bin',
  3: 'https://raw.githubusercontent.com/conghuy93/minizflash/main/firmware3.bin',
  4: 'https://raw.githubusercontent.com/conghuy93/minizflash/main/firmware4.bin',
  5: 'https://raw.githubusercontent.com/conghuy93/minizflash/main/firmware5.bin'
};

// Valid license keys - 100 pre-generated keys
const VALID_LICENSES = [
  'MZ1A-K9X4-7P2M-5R8T', 'MZ2B-L3Y6-8Q4N-6S9U', 'MZ3C-M4Z7-9R5P-7T1V',
  'MZ4D-N5A8-1S6Q-8U2W', 'MZ5E-P6B9-2T7R-9V3X', 'MZ6F-Q7C1-3U8S-1W4Y',
  'MZ7G-R8D2-4V9T-2X5Z', 'MZ8H-S9E3-5W1U-3Y6A', 'MZ9I-T1F4-6X2V-4Z7B',
  'MZ1J-U2G5-7Y3W-5A8C', 'MZ2K-V3H6-8Z4X-6B9D', 'MZ3L-W4I7-9A5Y-7C1E',
  'MZ4M-X5J8-1B6Z-8D2F', 'MZ5N-Y6K9-2C7A-9E3G', 'MZ6P-Z7L1-3D8B-1F4H',
  'MZ7Q-A8M2-4E9C-2G5I', 'MZ8R-B9N3-5F1D-3H6J', 'MZ9S-C1P4-6G2E-4I7K',
  'MZ1T-D2Q5-7H3F-5J8L', 'MZ2U-E3R6-8I4G-6K9M', 'MZ3V-F4S7-9J5H-7L1N',
  'MZ4W-G5T8-1K6I-8M2P', 'MZ5X-H6U9-2L7J-9N3Q', 'MZ6Y-I7V1-3M8K-1P4R',
  'MZ7Z-J8W2-4N9L-2Q5S', 'MZ8A-K9X3-5P1M-3R6T', 'MZ9B-L1Y4-6Q2N-4S7U',
  'MZ1C-M2Z5-7R3P-5T8V', 'MZ2D-N3A6-8S4Q-6U9W', 'MZ3E-P4B7-9T5R-7V1X',
  'MZ4F-Q5C8-1U6S-8W2Y', 'MZ5G-R6D9-2V7T-9X3Z', 'MZ6H-S7E1-3W8U-1Y4A',
  'MZ7I-T8F2-4X9V-2Z5B', 'MZ8J-U9G3-5Y1W-3A6C', 'MZ9K-V1H4-6Z2X-4B7D',
  'MZ1L-W2I5-7A3Y-5C8E', 'MZ2M-X3J6-8B4Z-6D9F', 'MZ3N-Y4K7-9C5A-7E1G',
  'MZ4P-Z5L8-1D6B-8F2H', 'MZ5Q-A6M9-2E7C-9G3I', 'MZ6R-B7N1-3F8D-1H4J',
  'MZ7S-C8P2-4G9E-2I5K', 'MZ8T-D9Q3-5H1F-3J6L', 'MZ9U-E1R4-6I2G-4K7M',
  'MZ1V-F2S5-7J3H-5L8N', 'MZ2W-G3T6-8K4I-6M9P', 'MZ3X-H4U7-9L5J-7N1Q',
  'MZ4Y-I5V8-1M6K-8P2R', 'MZ5Z-J6W9-2N7L-9Q3S', 'MZ6A-K7X1-3P8M-1R4T',
  'MZ7B-L8Y2-4Q9N-2S5U', 'MZ8C-M9Z3-5R1P-3T6V', 'MZ9D-N1A4-6S2Q-4U7W',
  'MZ1E-P2B5-7T3R-5V8X', 'MZ2F-Q3C6-8U4S-6W9Y', 'MZ3G-R4D7-9V5T-7X1Z',
  'MZ4H-S5E8-1W6U-8Y2A', 'MZ5I-T6F9-2X7V-9Z3B', 'MZ6J-U7G1-3Y8W-1A4C',
  'MZ7K-V8H2-4Z9X-2B5D', 'MZ8L-W9I3-5A1Y-3C6E', 'MZ9M-X1J4-6B2Z-4D7F',
  'MZ1N-Y2K5-7C3A-5E8G', 'MZ2P-Z3L6-8D4B-6F9H', 'MZ3Q-A4M7-9E5C-7G1I',
  'MZ4R-B5N8-1F6D-8H2J', 'MZ5S-C6P9-2G7E-9I3K', 'MZ6T-D7Q1-3H8F-1J4L',
  'MZ7U-E8R2-4I9G-2K5M', 'MZ8V-F9S3-5J1H-3L6N', 'MZ9W-G1T4-6K2I-4M7P',
  'MZ1X-H2U5-7L3J-5N8Q', 'MZ2Y-I3V6-8M4K-6P9R', 'MZ3Z-J4W7-9N5L-7Q1S',
  'MZ4A-K5X8-1P6M-8R2T', 'MZ5B-L6Y9-2Q7N-9S3U', 'MZ6C-M7Z1-3R8P-1T4V',
  'MZ7D-N8A2-4S9Q-2U5W', 'MZ8E-P9B3-5T1R-3V6X', 'MZ9F-Q1C4-6U2S-4W7Y',
  'MZ1G-R2D5-7V3T-5X8Z', 'MZ2H-S3E6-8W4U-6Y9A', 'MZ3I-T4F7-9X5V-7Z1B',
  'MZ4J-U5G8-1Y6W-8A2C', 'MZ5K-V6H9-2Z7X-9B3D', 'MZ6L-W7I1-3A8Y-1C4E',
  'MZ7M-X8J2-4B9Z-2D5F', 'MZ8N-Y9K3-5C1A-3E6G', 'MZ9P-Z1L4-6D2B-4F7H',
  'MZ1Q-A2M5-7E3C-5G8I', 'MZ2R-B3N6-8F4D-6H9J', 'MZ3S-C4P7-9G5E-7I1K',
  'MZ4T-D5Q8-1H6F-8J2L', 'MZ5U-E6R9-2I7G-9K3M', 'MZ6V-F7S1-3J8H-1L4N',
  'MZ7W-G8T2-4K9I-2M5P', 'MZ8X-H9U3-5L1J-3N6Q', 'MZ9Y-I1V4-6M2K-4P7R'
];

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Handle preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only POST allowed
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405,
      headers: corsHeaders 
    });
  }

  try {
    const body = await request.json();
    const { firmwareId, licenseKey, deviceMAC } = body;

    // Validate inputs
    if (!firmwareId || !deviceMAC) {
      return new Response(JSON.stringify({ 
        error: 'Missing required parameters' 
      }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Firmware 1 requires license
    if (firmwareId === 1) {
      if (!licenseKey) {
        return new Response(JSON.stringify({ 
          error: 'License required for Firmware 1' 
        }), { 
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Validate license format
      const licenseRegex = /^MZ[0-9][A-Z]-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
      if (!licenseRegex.test(licenseKey)) {
        return new Response(JSON.stringify({ 
          error: 'Invalid license format' 
        }), { 
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Check if license is valid
      if (!VALID_LICENSES.includes(licenseKey)) {
        return new Response(JSON.stringify({ 
          error: 'Invalid license key' 
        }), { 
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // TODO: Check license binding in KV storage
      // const binding = await env.LICENSES.get(licenseKey);
      // if (binding && binding !== deviceMAC) {
      //   return error 'License bound to different device'
      // }
    }

    // Get firmware URL (NEVER sent to client!)
    const firmwareUrl = FIRMWARE_URLS[firmwareId];
    if (!firmwareUrl) {
      return new Response(JSON.stringify({ 
        error: 'Invalid firmware ID' 
      }), { 
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Download firmware from GitHub (server-side)
    console.log(`Downloading firmware ${firmwareId} for MAC ${deviceMAC}`);
    const firmwareResponse = await fetch(firmwareUrl);
    
    if (!firmwareResponse.ok) {
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch firmware' 
      }), { 
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Return firmware binary (client never knows GitHub URL)
    return new Response(firmwareResponse.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="firmware${firmwareId}.bin"`,
        'X-Firmware-ID': firmwareId.toString(),
        'X-License-Verified': licenseKey ? 'yes' : 'no'
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message 
    }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
