from rfc_formatter import RFCFormatter
from rfc_loader import RFCLoader
from text_factory import RFCFormatFactory
from source_text_server import *
import uuid
import logging

rfc_root = "https://tools.ietf.org/rfc"

if __name__ == "__main__":
  logging.basicConfig(format='%(levelname)s   %(asctime)s   %(message)s', level=logging.DEBUG)
  loader = RFCLoader(rfc_root)
  article = loader.Load("6190")

  formatter = RFCFormatter()
  factory = RFCFormatFactory(article, formatter)
  factory.ReconstructRFC()

  output_file_name = "dump_%s.txt" % uuid.uuid4().hex
  logging.info("Output file: %s"%output_file_name)
  factory.SetDumpFile(output_file_name)

  # 启动服务器
  translate_server = MakeTranslateServerWithArgv(factory)
  server_address = ('', 6789)
  httpd = HTTPServer(server_address, translate_server)
  logging.debug("Start server: %s:%d"% server_address)
  httpd.serve_forever()