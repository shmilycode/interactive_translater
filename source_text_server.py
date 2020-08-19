from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, unquote
import logging
import json
from text_factory import *
import uuid

def MakeTranslateServerWithArgv(text_factory):
  class TranslateServer(BaseHTTPRequestHandler):
    def __init__(self, request, client_address, server):
      self.text_factory = text_factory
      super().__init__(request, client_address, server)

    def _set_headers(self):
      self.send_response(200)
      self.send_header('Content-Type', 'application/json')
      self.send_header('Access-Control-Allow-Origin', '*')
      self.end_headers()

    def do_GET(self):
      parsed_path = urlparse(self.path)
      logging.debug(parsed_path)
      get_query = json.loads(unquote(parsed_path.query))
      line_status = self.text_factory.GetNextLine()
      text_index = -1
      text = ""
      if line_status != None:
        logging.debug("%d %s", line_status.index, line_status.source_line)
        text_index = line_status.index
        text = line_status.source_line

      self._set_headers()
      response = {
        'text_index': text_index,
        'text': text 
      }
      self.wfile.write(json.dumps(response).encode('utf-8'))
      return

    def do_POST(self):
      content_length = int(self.headers['Content-Length'])
      post_data = json.loads(self.rfile.read(content_length))
      logging.debug("%d %s" % (post_data["text_index"], post_data["text_content"]))
      self.text_factory.UpdateTranslate(int(post_data["text_index"]), post_data["text_content"])

      self._set_headers()
      response = {
        'text_index': 0,
      }
      self.wfile.write(json.dumps(response).encode('utf-8'))
      return

    def do_PUT(self):
      self._set_headers()
      return

  return TranslateServer

if __name__ == "__main__":
  logging.basicConfig(format='%(levelname)s   %(asctime)s   %(message)s', level=logging.DEBUG)
  text_factory = RFCFormatFactory()
  translate_server = MakeTranslateServerWithArgv(text_factory)

  server_address = ('', 6789)
  httpd = HTTPServer(server_address, translate_server)
  logging.debug("Start server: %s:%d"% server_address)
  httpd.serve_forever()