import logging
import io
import sys
from rfc_formatter import RFCFormatter

class TextFactory:
  def __init__(self):
    self.index = 0
    self.test_text = ["hi", "how old are you?", "I'm fine."]

  def getNextLine(self):
    if self.index < len(self.test_text):
      text = self.test_text[self.index][:]
      result = (self.index, text)
      self.index += 1
      return result

  def eof(self):
    if self.index >= len(self.test_text):
      return True
    return False
  
  def reset(self):
    self.index = 0

class LineStatus:
  def __init__(self, index, need_translate, source_line):
    self.index = index
    self.need_translate = need_translate
    self.source_line = source_line
    self.translated_line = ""
    self.translated = False

class RFCFormatFactory:
  def __init__(self, article, formatter):
    self.article = article
    self.article_buffer = article.split('\n')
    self.rfc_formatter = formatter
    self.translate_index = 0 
    self.line_index = 0
    self.dump_index = 0

  def FormatNextLine(self):
    while(self.line_index < len(self.article_buffer)):
      formatted_line = self.rfc_formatter.GetFormattedLine()
      if formatted_line != None:
        return formatted_line
      self.rfc_formatter.PushRawLine(self.article_buffer[self.line_index])
      self.line_index += 1

  def ReconstructRFC(self):
    self.line_needs_to_translate = []
    self.article_map = []
    formatted_line = self.FormatNextLine()
    index = 0
    skip_line = 0
    while (formatted_line != None):
      (need_translate, line) = formatted_line
      self.article_map.append(LineStatus(index, need_translate, line))
      if self.article_map[index].need_translate:
        self.line_needs_to_translate.append(self.article_map[index])
        if skip_line < self.translate_index:
          self.line_needs_to_translate[skip_line].translated = True
          skip_line += 1
      formatted_line = self.FormatNextLine()
      index += 1
    logging.debug("Total %d lines"%(len(self.line_needs_to_translate)))

  def GetNextLineToTranslate(self):
    if (self.translate_index == len(self.line_needs_to_translate)):
      for line_status in self.line_needs_to_translate:
        if line_status.translated is True:
          self.line_needs_to_translate.remove(line_status)
      self.translate_index = 0

    if (len(self.line_needs_to_translate) == 0):
      return None

    line = self.line_needs_to_translate[self.translate_index]
    self.translate_index += 1
    return line

  def UpdateTranslate(self, index, translated_line):
    if translated_line == None or index < 0 or index > len(self.article_map):
      return
    line_status = self.article_map[index]
    line_status.translated = True 
    line_status.translated_line = translated_line

    if index < self.dump_index:
      return
    for i in range(self.dump_index, index):
      line_status = self.article_map[i]
      if (line_status.need_translate):
        self.dump_file.write(line_status.translated_line + '\n')
      else:
        self.dump_file.write(line_status.source_line + '\n')

    self.dump_file.flush()
    self.dump_index = index

  def SetDumpFile(self, name):
    self.dump_file = open(name, 'w')

  def DumpFile(self, target_file):
    with open(target_file, 'a') as output: 
      for line_status in self.article_map:
        if (line_status.need_translate):
          output.write(line_status.translated_line + '\n')
        else:
          output.write(line_status.source_line + '\n')

  def GetNextLine(self):
    return self.GetNextLineToTranslate()


  def EOF(self):
    if (len(self.line_needs_to_translate) == 0):
      return True
    return False

def TestFormat(argv):
  with open(argv[1]) as f:
    article = f.read()
    formatter = RFCFormatter()
    factory = RFCFormatFactory(article, formatter)
    factory.ReconstructRFC()
    with open("dump.txt", 'w') as output:
      for line_status in factory.article_map:
        if (line_status.need_translate):
          output.write('** ')
        else:
          output.write('-- ')
        output.write(line_status.source_line)
        output.write('\n\n')

def TestGetTranslateLine(argv):
  with open(argv[1]) as f:
    article = f.read()
    formatter = RFCFormatter()
    factory = RFCFormatFactory(article, formatter)
    factory.ReconstructRFC()
    factory.SetDumpFile("dump.txt")
    line_status = factory.GetNextLine()
    while line_status != None:
      factory.UpdateTranslate(line_status.index, line_status.source_line)
      line_status = factory.GetNextLine()
    

if __name__ == "__main__":
  logging.basicConfig(level=logging.DEBUG)
#  TestFormat(sys.argv)
  TestGetTranslateLine(sys.argv)

