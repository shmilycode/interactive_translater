from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, unquote
import logging
import json

class TranslateServer(BaseHTTPRequestHandler):
    def _set_headers(self):
      self.send_response(200)
      self.send_header('Content-Type', 'application/json')
      self.send_header('Access-Control-Allow-Origin', '*')
      self.end_headers()

    def do_GET(self):
      logging.debug(self.headers)
      parsed_path = urlparse(self.path)
      logging.debug(parsed_path)
      get_query = json.loads(unquote(parsed_path.query))

      self._set_headers()
      response = {
        'text_index': 0,
        'text': "why not?"
      }
      self.wfile.write(json.dumps(response).encode('utf-8'))
      return

    def do_POST(self):
      content_length = int(self.headers['Content-Length'])
      post_data = json.loads(self.rfile.read(content_length))
      logging.debug(post_data["text_content"])
      self._set_headers()
      return

    def do_PUT(self):
      self._set_headers()
      return

if __name__ == "__main__":
  logging.basicConfig(format='%(levelname)s   %(asctime)s   %(message)s', level=logging.DEBUG)
  server_address = ('', 6789)
  httpd = HTTPServer(server_address, TranslateServer)
  logging.debug("Start server: %s:%d"% server_address)
  httpd.serve_forever()