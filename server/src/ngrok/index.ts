import ngrok from "ngrok";

let tunnelUrl: string | null = null;

/**
 * Initialize Ngrok tunnel
 * @param port - Local port to tunnel
 * @returns Promise<string> - Public tunnel URL
 */
export async function initializeTunnel(port: number): Promise<string> {
  try {
    // Kill any existing tunnels first to avoid conflicts
    await ngrok.kill();
    
    const authtoken = process.env.NGROK_AUTHTOKEN;
    
    if (authtoken) {
      await ngrok.authtoken(authtoken);
      console.log("🔐 Ngrok authenticated with provided token");
    } else {
      console.log("🆓 No NGROK_AUTHTOKEN provided - using free tunnel");
    }

    tunnelUrl = await ngrok.connect({
      addr: port,
      proto: "http",
    });

    console.log("🌐 Ngrok tunnel created successfully!");
    console.log(`🔗 Public URL: ${tunnelUrl}`);
    console.log(`🏠 Local URL: http://localhost:${port}`);
    
    return tunnelUrl;
  } catch (error) {
    console.error("❌ Failed to create Ngrok tunnel:", error);
    throw error;
  }
}

/**
 * Get the current tunnel URL
 * @returns string | null - Current tunnel URL or null if not initialized
 */
export function getTunnelUrl(): string | null {
  return tunnelUrl;
}

/**
 * Close the Ngrok tunnel
 */
export async function closeTunnel(): Promise<void> {
  try {
    if (tunnelUrl) {
      await ngrok.disconnect();
      console.log("🔌 Ngrok tunnel closed");
      tunnelUrl = null;
    }
  } catch (error) {
    console.error("⚠️  Error closing Ngrok tunnel:", error);
  }
}

/**
 * Kill all Ngrok processes
 */
export async function killAllTunnels(): Promise<void> {
  try {
    await ngrok.kill();
    tunnelUrl = null;
    console.log("🧹 All Ngrok tunnels killed");
  } catch (error) {
    console.error("⚠️  Error killing Ngrok tunnels:", error);
  }
}
