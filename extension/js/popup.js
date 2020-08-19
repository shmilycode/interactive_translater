let backgroundPort = chrome.runtime.connect({name: "popup"});

backgroundPort.onMessage.addListener((message)=>{
  console.log(message)
});

$('#startButton').on('click', (event)=>{
  console.log("startButton clicked")
  let message = {
    event: "start"
  }
  backgroundPort.postMessage(message)
  return true
})

