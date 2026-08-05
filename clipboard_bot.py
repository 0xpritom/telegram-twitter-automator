import asyncio
import websockets
import pyperclip
import re
import json
import urllib.parse
import time
from datetime import datetime

print("========================================")
print("  Telegram Desktop to X Automator Bot   ")
print("========================================")
print("Starting...")

def normalize_url(url):
    try:
        if not url.startswith('http'):
            url = 'https://' + url
            
        parsed = urllib.parse.urlparse(url)
        host = parsed.hostname.lower() if parsed.hostname else ""
        
        if host in ['x.com', 'www.x.com', 'www.twitter.com']:
            host = 'twitter.com'
            
        # Preserve search params for /intent/ paths, else strip them
        search = parsed.query
        if not '/intent/' in parsed.path:
            search = ""
            
        final_url = f"https://{host}{parsed.path}"
        if search:
            final_url += f"?{search}"
            
        return final_url
    except Exception as e:
        return url

def extract_x_links(text):
    if not text:
        return []
    
    # Regex to find x.com or twitter.com links
    url_pattern = r'(?:https?:\/\/)?(?:www\.)?(?:x\.com|twitter\.com)\/[^\s<>"\']+'
    matches = re.findall(url_pattern, text, re.IGNORECASE)
    
    normalized_links = set()
    for match in matches:
        clean_url = match.rstrip('.,;!?)')
        normalized = normalize_url(clean_url)
        normalized_links.add(normalized)
        
    return list(normalized_links)

# Store connected Chrome Extension clients
connected_clients = set()

async def websocket_handler(websocket, path):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Chrome Extension Connected!")
    connected_clients.add(websocket)
    try:
        async for message in websocket:
            pass # We don't expect messages from Chrome, just connection
    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Chrome Extension Disconnected.")
        connected_clients.remove(websocket)

async def clipboard_monitor():
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Monitoring clipboard for Telegram links...")
    print("Simply select messages in Telegram Desktop and press Ctrl+C.")
    
    last_clipboard = pyperclip.paste()
    
    while True:
        try:
            current_clipboard = pyperclip.paste()
            if current_clipboard != last_clipboard:
                last_clipboard = current_clipboard
                
                links = extract_x_links(current_clipboard)
                if links:
                    print(f"\n[{datetime.now().strftime('%H:%M:%S')}] Found {len(links)} links in clipboard!")
                    for link in links:
                        print(f" - {link}")
                        
                    if connected_clients:
                        message = json.dumps({"action": "new_links", "links": links})
                        # Broadcast to all connected extensions
                        await asyncio.gather(
                            *[client.send(message) for client in connected_clients],
                            return_exceptions=True
                        )
                        print(f"[{datetime.now().strftime('%H:%M:%S')}] Sent to Chrome Extension.")
                    else:
                        print(f"[{datetime.now().strftime('%H:%M:%S')}] Warning: Chrome Extension is not connected. Make sure Chrome is open and the extension is active.")
                        
        except Exception as e:
            print(f"Clipboard read error: {e}")
            
        await asyncio.sleep(1) # Check every 1 second

async def main():
    try:
        # Start WebSocket Server
        server = await websockets.serve(websocket_handler, "localhost", 8765)
        print(f"[{datetime.now().strftime('%H:%M:%S')}] WebSocket server started on ws://localhost:8765")
        
        # Start Clipboard Monitor
        await clipboard_monitor()
        
    except Exception as e:
        print(f"Server Error: {e}")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nStopping bot...")
