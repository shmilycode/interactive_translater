let backgroundPort = chrome.runtime.connect({name: "content"});

function onCompletedHandler() {
  let translation_result_button = $('button.lmt__translations_as_text__text_btn:first')
  result = translation_result_button.text()
  console.log("Translate result: " + result)
  if (result != "")
    backgroundPort.postMessage(translation_result_button.text())
}

function onErrorOccurredHandler() {}

function onBackgroundMessage(message) {
  switch(message.event) {
    case "onCompleted":
      onCompletedHandler()
      break
    case "onErrorOccurred":
      onErrorOccurredHandler()
      break;
  }
}

backgroundPort.onMessage.addListener(onBackgroundMessage);
console.log("Walle tag")