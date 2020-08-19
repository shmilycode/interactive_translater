class TranslatePageSelector {
  constructor() {
    this.retry_time = 0
  }

  startListening(backgroundPort) {
    this.backgroundPort = backgroundPort
    this.backgroundPort.onMessage.addListener((message)=>{
      this.onBackgroundMessage(message, translatePageSelector)
    });
    console.log("Start listening")
  }

  onCompletedHandler() {
    let translation_result_button = $('button.lmt__translations_as_text__text_btn:first')
    let clean_button = $('button.lmt__clear_text_button:first')
    let result = translation_result_button.text()
    console.log("Translate result: " + result)
    if (result != "") {
      let message = {
        event: "translation_result",
        text: result,
        times: this.retry_time
      }
      this.backgroundPort.postMessage(message)
      clean_button.trigger("click")
      this.retry_time = 0
    }
    else if(this.retry_time < 10){
      // try again.
      setTimeout(()=>{this.onCompletedHandler()}, 1000)
      console.log("Try again!!")
      this.retry_time += 1
    } else {
      let message = {
        event: "translation_timeout",
        times: this.retry_time
      }
      this.backgroundPort.postMessage(message)
      this.retry_time = 0
    }
  }

  onErrorOccurredHandler() {}

  onBackgroundMessage(message) {
    switch(message.event) {
      case "onCompleted":
        this.onCompletedHandler()
        break
      case "onErrorOccurred":
        this.onErrorOccurredHandler()
        break;
    }
  }
}

let backgroundPort = chrome.runtime.connect({name: "content"});
let translatePageSelector = new TranslatePageSelector()
translatePageSelector.startListening(backgroundPort)

console.log("Walle tag")