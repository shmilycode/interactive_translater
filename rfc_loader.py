import urllib.request
import ssl
import logging

rfc_root = "https://tools.ietf.org/rfc"

class RFCLoader:
  def __init__(self, rfc_root):
    self.context = ssl._create_unverified_context()
    self.rfc_root = rfc_root

  def LoadContentFromHttps(self, url):
    logging.info("Requesting %s" % url)
    request = urllib.request.Request(url)
    response = urllib.request.urlopen(url=request,context=self.context)
    content = response.read().decode('utf-8')
    logging.debug('Response %d from %s' % (len(content), url))
    return content
  
  def BuildUrlFromRFCNumber(self, rfc_number):
    return self.rfc_root + "/rfc%d.txt" % rfc_number
  
  def MatchRFCNumber(self, input):
    try:
      rfc_number = int(input)
      return rfc_number
    except:
      logging.error("Input must be legal RFC number like \"6190\"")
      raise
      
  def Load(self, input):
    rfc_number = self.MatchRFCNumber(input)     
    if rfc_number < 0:
      logging.error("Invalid RFC number %d") % (rfc_number)
    url = self.BuildUrlFromRFCNumber(rfc_number)
    return self.LoadContentFromHttps(url)

if __name__ == "__main__":
  logging.basicConfig(format='%(levelname)s   %(asctime)s   %(message)s', level=logging.DEBUG)
  loader = RFCLoader(rfc_root)
  print(loader.Load("6190"))