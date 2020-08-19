from enum import Enum
import re
import queue

EMPTY_LINE = ''
LINE_BREAK = '\n'
LINE_END = '.'
LINE_COLON = ':'
NEW_PAGE_SYMBOL = '\x0c'

class ArticleFragment(Enum):
  BeforeAbstract = 0
  Abstract = 1
  MemoStatus = 2
  Copyright = 3
  ContentsTable = 4
  Contents = 5
  References = 6

class ArticleElement(Enum):
  PageFooterAndHeader = 0
  Title = 1
  Content = 2

class FormatStatus(Enum):
  Start = 0
  Processing = 1
  End = 2

class RFCFormatter:
  def __init__(self):
    self.fragment = ArticleFragment.BeforeAbstract
    # RFC 文档每页都有固定长度
    self.first_page_fix_length = 58
    self.page_fix_length = 55 
    self.status_handler = {}
    self.RegisterHandler()
    self.result_list = queue.Queue()
    self.line_cache = ""
    self.combine_line = []
    self.last_line = ""
    self.last_element = ArticleElement.Title
    self.current_page_lines = 0
    self.current_page_count = 0
  
  def RegisterHandler(self):
    self.status_handler[ArticleFragment.BeforeAbstract] = self.HandleBeforeAbstract
    self.status_handler[ArticleFragment.Abstract] = self.HandleAbstract
    self.status_handler[ArticleFragment.MemoStatus] = self.HandleMemoStatus
    self.status_handler[ArticleFragment.Copyright] = self.HandleCopyright
    self.status_handler[ArticleFragment.ContentsTable] = self.HandleContentsTable
    self.status_handler[ArticleFragment.Contents] = self.HandleContents
    self.status_handler[ArticleFragment.References] = self.HandleReferences

  def AddResult(self, result):
    self.result_list.put(result)

  def CombineLine(self, line):
    self.line_cache += line[:].lstrip().strip(LINE_BREAK)
    self.combine_line.append(line)

  # 简介之前的内容不做格式化，也不翻译
  def HandleBeforeAbstract(self, line):
    if (line == "Abstract"):
      self.last_element = ArticleElement.Title
      self.fragment = ArticleFragment.Abstract
      self.AddResult((False, line))
    else:
      self.last_element = ArticleElement.Content
      self.AddResult((False, line))

  def HandleMemoStatus(self, line):
    if (line == "Copyright Notice"):
      self.last_element = ArticleElement.Title
      self.fragment = ArticleFragment.Copyright
      self.AddResult((False, line))
    else:
      self.last_element = ArticleElement.Content
      self.CombineLine(line)
  
  def HandleAbstract(self, line):
    if (line == "Status of This Memo"):
      self.last_element = ArticleElement.Title
      self.fragment = ArticleFragment.MemoStatus
      self.AddResult((False, line))
    else:
      self.last_element = ArticleElement.Content
      self.CombineLine(line)
  
  def HandleCopyright(self, line):
    if (line == "Table of Contents"):
      self.last_element = ArticleElement.Title
      self.fragment = ArticleFragment.ContentsTable
      self.AddResult((False, line))
    else:
      self.last_element = ArticleElement.Content
      self.CombineLine(line)

  # 目录也不需要翻译
  def HandleContentsTable(self, line):
    if (self.IsHeadingLevelTitle(line)):
      self.last_element = ArticleElement.Title
      self.fragment = ArticleFragment.Contents
      # 标题不做翻译，为了有更好的辨识度，也可以减少翻译的次数
      self.AddResult((False, line))
    else:
      self.last_element = ArticleElement.Content
      self.AddResult((False, line))

  def HandleContents(self, line):
    if re.match('^(\d+\.)+\s*References', line) is not None:
      self.last_element = ArticleElement.Title
      self.fragment = ArticleFragment.References
      self.AddResult((False, line))
    elif (self.IsHeadingLevelTitle(line)):
      self.last_element = ArticleElement.Title
      self.fragment = ArticleFragment.Contents
      # 标题不做翻译，为了有更好的辨识度，也可以减少翻译的次数
      self.AddResult((False, line))
    else:
      self.last_element = ArticleElement.Content
      self.CombineLine(line)

  def HandleReferences(self, line):
    pass

  def ProcessLine(self, line):
    self.current_page_lines += 1
    # 换页符 ^L :help diagraph-table
    if (self.IsNewPage(line)):
      self.current_page_lines = 0
      self.current_page_count += 1
      return

    # 页眉页脚
    if self.IsPageHeader(line) or self.IsPageFooter(line):
      self.last_element = ArticleElement.PageFooterAndHeader
      return

    # 空白行
    if line == EMPTY_LINE:
      self.InputEmpty()
    else:
      # 正常文本
      self.status_handler[self.fragment](line)

    self.last_line = line
    return
  
  def SubmitCompletedLine(self):
    if self.IsSpecialForm(self.line_cache):
      # 如果为特殊格式，如表格等，则将合并后的还原，且不翻译
      for line in self.combine_line:
        self.AddResult((False, line))
    else:
      self.AddResult((True, self.line_cache[:]))
    self.line_cache = EMPTY_LINE
    self.combine_line = []

  # 处理接收到空白行后的逻辑
  def InputEmpty(self):
    if (self.line_cache == EMPTY_LINE or self.fragment == ArticleFragment.ContentsTable):
      # 目录中的空白行不保留
      return
    if  self.line_cache.endswith(LINE_END) or \
        self.line_cache.endswith(LINE_COLON):
      if (self.last_line != EMPTY_LINE):
        # 说明其已经拼装结束，入列，并开始新行
        self.SubmitCompletedLine()

    elif self.IsSpecialForm(self.line_cache):
      self.SubmitCompletedLine()

    elif self.IsFootnote(self.line_cache):
      # 如果有图片或表格的注脚
      self.SubmitCompletedLine()

  # 是否为页脚
  def IsPageFooter(self, line):
    if self.current_page_count == 0:
      if self.current_page_lines == self.first_page_fix_length:
        return True 
      return False
    elif self.current_page_lines == self.page_fix_length:
      return True

    return False

  # 是否为图片或表格的注脚
  def IsFootnote(self, line):
    tmp_line = line.strip()
    table_footnot = r'^Table\s+\d+\.'
    figure_footnot = r'^Figure\s+\d+\.'
    if re.match(table_footnot, tmp_line) or \
      re.match(figure_footnot, tmp_line):
      return True
    return False

  # 是否为页眉
  def IsPageHeader(self, line):
    if self.current_page_count == 0:
      return False
    elif self.current_page_lines == 1:
      return True

    return False

  # 是否为换页符
  def IsNewPage(self, line):
    if line == NEW_PAGE_SYMBOL:
      return True
    return False

  # 是否为顶级标题
  def IsHeadingLevelTitle(self, line):
    return re.match(r'^(\d+\.)+', line) != None
  
  # 是否为特殊形式
  def IsSpecialForm(self, line):
    # 是否为表格
    if len(re.findall(r'\+|\|', line)) >= 3:
      return True

    if len(re.findall(r'([\-|\.])\1{5,}', line)):
      return True
    
    return False

  def PushRawLine(self, line):
    self.ProcessLine(line)

  def GetFormattedLine(self):
    if self.result_list.empty():
      return None
    else:
      return self.result_list.get()
