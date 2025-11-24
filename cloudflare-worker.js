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

// Valid license keys - trong production nên lưu trong KV storage
const VALID_LICENSES = [
  'MZ1A-K9X4-7P2M-5R8T', 'MZ2B-L3Y6-8Q4N-6S9U', 'MZ3C-M4Z7-9R5P-7T1V',
  // ... rest of keys
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
