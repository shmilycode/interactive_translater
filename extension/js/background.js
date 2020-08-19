let deepl_root = "https://www.deepl.com/translator#en/zh/"
let current_content = null;
let current_popup = null;

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
        timeout: 5000,
        url: url,
        type: type,
        data: data,
        data_type: "json",
        success: function(data){
          success_callback(data);
        },
        error:function(XMLHttpRequest, textStatus, errorThrown){
          error_callback(textStatus)
        }
    };
    $.ajax(requestContent);
  }

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

  submitDestinationText(text_index, text) {
    let message = {"uuid": this.uuid, 
                  "event": "destination_text", 
                  "text_index": text_index, 
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
    this.tab_id = -1
    this.processing = true
  }

  async doProcess(tab_id) {
    if (!this.processing)
      return

    console.log("doProcess " + tab_id)
    if (tab_id < 0)
      return
    this.tab_id = tab_id
    await this.updateTextFromServer()
        .catch((error)=>{console.log(error)})
    if (this.current_text_to_translate != null)
      postTextToTranslate(this.current_text_to_translate, tab_id)
  }

  stopProcess() {
    this.processing = false
  }

  nextProcess() {
    this.doProcess(this.tab_id)
  }

  async onTranslateCompleted(result) {
    if (result != null && this.current_message_index >= 0) {
      let response = await this.server_manager.submitDestinationText(this.current_message_index, result)
        .catch((error)=>{
          console.log(error)
          return false
        })
      if (response.text_index >= 0)
        return true
      else
        return false
    }
    return true 
  }

  onTranslateErrorOccurred() {
    this.nextProcess()
  }

  async updateTextFromServer() {
    let response = await this.server_manager.requestSourceText()
    this.current_message_index = response.text_index
    this.current_text_to_translate = response.text
    console.log("Update current text to translate: " + this.current_text_to_translate)
  }

  async parseAndHandleContentMessage(message) {
    let event = message.event
    console.log(message)
    if (event == "translation_result") {
      let next = await this.onTranslateCompleted(message.text)
      if (next)
        this.nextProcess()
      else
        this.stopProcess()
    }else if (event == "translation_timeout") {
      this.nextProcess()
    } else {
      console.log("Unknown event " + event)
    }
  }
}

let server = new ServerManager("http://172.20.127.29:6789")
let translateProcessor = new TranslateProcessor(server, 5000)

chrome.runtime.onConnect.addListener((port)=>{
  switch(port.name) {
    case "content":
      if (current_content != null)
        return
      console.log("Content is connected!");
      current_content =port 
      port.onMessage.addListener((message)=>{
        console.log(message)
        translateProcessor.parseAndHandleContentMessage(message)
      });
      break
    case "popup":
      if (current_popup != null)
        return
      console.log("Popup is connected!");
      current_popup = port
      port.onMessage.addListener((message, sender)=>{
        switch (message.event) {
          case "start":
            chrome.tabs.query({active: true}, (tabs)=>{
              if (tabs.length) {
                let currentTabId = tabs[0].id
                translateProcessor.doProcess(currentTabId)
              }
            })
            break;
          case "stop":
            translateProcessor.stopProcess()
            current_popup = null
            break;
          default:
            console.log("Unknown event " + message.event)
        }
      })
    break;
    default:
      console.log("Unknown port name " + port.name)
  }

  port.onDisconnect.addListener((port)=>{
    current_content = null
  });
});

let tab_updated = false 

function postTextToTranslate(text_to_translate, tab_id) {
  encoded_text = encodeURIComponent(text_to_translate)
  chrome.tabs.update(tab_id, {"url": deepl_root + text_to_translate})
  tab_updated = true
}

//chrome.webNavigation.onCompleted.addListener(
//  (details)=>{
//    console.log(details)
//    if (current_content) {
//      current_content.postMessage({event: "onCompleted"})
//    }
//  },
//  {
//    url: [{
//      hostContains: '.deepl.'
//    }]
//  }
//)

chrome.webNavigation.onReferenceFragmentUpdated.addListener(
  (details)=>{
    if (current_content && tab_updated == true) {
      console.log("onReferenceFragmentUpdated")
      current_content.postMessage({event: "onCompleted"})
      tab_updated = false
    }
  },
  {
    url: [{
      hostContains: '.deepl.'
    }]
  }
)

chrome.webNavigation.onErrorOccurred.addListener(
  (details)=>{
    console.log(details)
    translateProcessor.onTranslateErrorOccurred()
  },
  {
    url: [{
      hostContains: '.deepl.'
    }]
  }
);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
});