let deepl_root = "https://www.deepl.com/translator#en/zh/"
let current_content = null;

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

class ServerManager {
  constructor(server_address){
    this.server_address = server_address
    this.uuid = uuidv4()
  }

  sendRequest(url, type, data, success_callback, error_callback)  {
    var requestContent = {
        timeout: 500,
        url: url,
        type: type,
        data: data,
        data_type: "json",
        success: function(data){
          success_callback(data);
        },
        error:function(XMLHttpRequest, textStatus, errorThrown){
          error_callback(XMLHttpRequest, textStatus, errorThrown);
        }
    };
    $.ajax(requestContent);
  }

  heartBeatRequest() {
    let message = {"uuid": this.uuid, 
                   "event": "alive"}
    const pm = new Promise((resolve, reject)=>{
      this.sendRequest(
          this.server_address,   
          "GET", 
          JSON.stringify(message),
          resolve, reject);
    })
    return pm;
  }

  heartBeatSuccessHandler(data) {}

  requestSourceText() {
    let message = {"uuid": this.uuid, 
                   "event": "source_text"}
    const pm = new Promise((resolve, reject)=>{
      this.sendRequest(
          this.server_address,   
          "GET", 
          JSON.stringify(message),
          resolve, reject);
    })
    return pm;
  }

  submitDestinationText(text_index, text, index) {
    let message = {"uuid": this.uuid, 
                  "event": "destination_text", 
                  "text_index": index, 
                  "text_content": text}
    const pm = new Promise((resolve, reject)=>{
      this.sendRequest(
          this.server_address,   
          "POST", 
          JSON.stringify(message),
          resolve, reject);
    })
    return pm;
  }

  confirmCurrentIndex() {
    let message = {"uuid": this.uuid, 
                  "event": "index"}
    const pm = new Promise((resolve, reject)=>{
      this.sendRequest(
          this.server_address,   
          "GET",
          JSON.stringify(message),
          resolve, reject);
    })
    return pm;
  }
}

class TranslateProcessor {
  constructor(server_manager, delay){
    this.server_manager = server_manager
    this.current_message_index = -1
    this.current_text_to_translate = null
    this.delay = delay
  }

  Process() {
    this.DoProcess()
      .catch((message)=>{console.log(message)})
  }

  async DoProcess() {
    let index = await this.server_manager.confirmCurrentIndex()
    if (index != this.current_message_index) {
      await this.UpdateTextFromServer()
    }
    if (this.current_text_to_translate != null)
      postTextToTranslate(this.current_text_to_translate)
  }

  async onTranslateCompleted(result) {
    if (result != null && this.current_message_index >= 0)
      await this.server_manager.submitDestinationText(result, result, this.current_message_index)
    this.DoProcess()
  }

  onTranslateErrorOccurred() {
    this.DoProcess()
  }

  async UpdateTextFromServer() {
    let response = await this.server_manager.requestSourceText()
    this.current_message_index = response.text_index
    this.current_text_to_translate = response.text
  }
}

let server = new ServerManager("http://172.20.127.29:6789")
let translateProcessor = new TranslateProcessor(server, 5000)

chrome.runtime.onConnect.addListener((port)=>{
  current_content =port 
  console.log("Content port is connected!");
  port.onMessage.addListener((message)=>{
    console.log(message)
    translateProcessor.onTranslateCompleted(message)
      .catch((message)=>{console.log(message)})
  });
  port.onDisconnect.addListener((port)=>{
    current_content = null
  });
});

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse)
{
});

function postTextToTranslate(text_to_translate) {
  encoded_text = encodeURIComponent(text_to_translate)
  chrome.tabs.update({"url": deepl_root + text_to_translate})
}

chrome.webRequest.onCompleted.addListener(
  (details)=>{
    console.log(details)
    if (current_content) {
      current_content.postMessage({event: "onCompleted"})
    }
  },
  {urls: ["<all_urls>"]
});

chrome.webRequest.onErrorOccurred.addListener(
  (details)=>{
      console.log("details")
    if (current_content)
      current_content.postMessage({event: "onErrorOccurred"});
  },
  {urls: ["<all_urls>"]
});

// Start run
translateProcessor.Process()