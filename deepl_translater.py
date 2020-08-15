import urllib.request
import ssl
import logging
from lxml import etree 

deepl_root = "https://www.deepl.com/translator#en/zh/"
result_element_class = "lmt__translations_as_text__text_btn"

class TranslaterDetails:
  root = ""
  result_element = ""
  result_class = ""

  def SetRoot(self, root_url):
    self.root =root_url 

  def SetResultElement(self, element_name):
    self.result_element = element_name

  def SetResultClass(self, class_name): 
    self.result_class = class_name

class DeeplTranslater:
  def __init__(self, details):
    self.details = details
    self.context = ssl._create_unverified_context()

  def BuildTranslaterRequest(self, text):
    return self.details.root + urllib.parse.quote(text)
  

  def GetTranslateResult(self, url, word_counts):
    logging.debug("Requesting %s" % url)
    logging.info("Translating %d words" % word_counts)
    request = urllib.request.Request(url)
    response = urllib.request.urlopen(url=request,context=self.context)
    response_html = response.read().decode('utf-8')
    print(response_html)

    etree_content = etree.HTML(response_html, etree.HTMLParser())
    xpath_parameter = '//%s[@class=\"%s\"]//text()' % \
        (self.details.result_element, self.details.result_class)
    result = etree_content.xpath(xpath_parameter)
    return result 
  
  def LineTranslate(self, text):
    if text.rfind("\n") > 0 or text.rfind("\r\n") > 0:
      raise Exception("Try one line once time")
    request = self.BuildTranslaterRequest(text)
    return self.GetTranslateResult(request, len(text))
    
if __name__ == "__main__":
  logging.basicConfig(format='%(levelname)s   %(asctime)s   %(message)s', level=logging.DEBUG)

  details = TranslaterDetails()
  details.SetRoot(deepl_root)
  details.SetResultElement("button")
  details.SetResultClass(result_element_class)

  translater = DeeplTranslater(details)
  print(translater.LineTranslate("Why not?"))