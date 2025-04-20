from http.server import HTTPServer, SimpleHTTPRequestHandler
import sys

class CORSRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        return super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

port = 8000
print(f"Сервер запущено на http://localhost:{port}")
print(f"Відкрийте цю адресу в Chrome: http://localhost:{port}/index.html")
print("Для зупинки сервера натисніть Ctrl+C")

try:
    httpd = HTTPServer(('localhost', port), CORSRequestHandler)
    httpd.serve_forever()
except KeyboardInterrupt:
    print("\nСервер зупинено")
    sys.exit(0) 