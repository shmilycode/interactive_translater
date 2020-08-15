let jiraApi = {
  project: {api: "/rest/api/2/project", type: "GET"},
  issuetype: {api: "/rest/api/2/issuetype", type: "GET"},
  components: {api: "/rest/api/2/project/{projectIdOrKey}/components", type: "GET"},
  issue: {api: "/rest/api/2/issue/", type: "POST"},
  customFieldOption: {api: "/rest/api/2/customFieldOption/", type: "GET"},
  getFields: {api: "/rest/api/2/field", type: "GET"},
  findUsers: {api: "/rest/api/2/user/assignable/multiProjectSearch", type: "GET"},
  addIssueAttachment: {api: "/rest/api/2/issue/{issueIdOrKey}/attachments", type: "POST"}
}

let jiraHost = "https://jira.cvte.com"

class JiraRequestManager {
  requestData(api, type, data, success, error)  {
    var requestContent = {
           timeout: 1000,
           url: api,
           type: type,
      beforeSend: function(xhr){
        xhr.setRequestHeader("Content-Type", "application/json");
      },
      data: data,
      success: function(data){
        success(data);
      },
      error:function(XMLHttpRequest, textStatus, errorThrown){
        error(XMLHttpRequest);
      }
    };
    $.ajax(requestContent);
  }

  requestDataWithXSRF(api, type, data, success, error) {
    var requestContent = {
           timeout: 1000,
           url: api,
           type: type,
           processData: false,
           contentType: false,
      beforeSend: function(xhr){
        xhr.setRequestHeader("X-Atlassian-Token", "no-check");
      },
      data: data,
      success: function(data){
        success(data);
      },
      error:function(XMLHttpRequest, textStatus, errorThrown){
        error(XMLHttpRequest);
      }
    };
    $.ajax(requestContent);

  }

}

class FormView {
  constructor(initData) {
    if ('project' in initData)
      this.initForm(initData)

    this.observers = new Array()
    $('#createIssue').on('click', (event)=>{
      if (!this.CheckInputs())
        return false
      this.enableCreateIssue(false)
      this.showLoading(true)
      let componentsArray = []
      componentsArray.push($('#components').val())
      let pars = {project: $('#project').val(), issueType: $('#issueType').val(),
                  summary: $('#summary').val(), components: componentsArray,
                  resumeType: $('#resumeType').val(), resumeSource: $('#resumeSource').val(),
                  assignee: $('#assignee').val(), description: $('#description').val(),
                  attachment: $('#inputFile').prop('files')[0]}
      this.observers.forEach((item, index, array) =>{
        item.onCreateIssueClick(pars)
          .then((result)=>{
            this.showLoading(false)
            this.enableCreateIssue(true)
            $("#createIssue").attr("disabled", "disabled")
            $('#alertText').html("创建成功")
          })
          .catch((error)=>{
            this.showLoading(false)
            this.enableCreateIssue(true)
            console.log("Create jira task failed, "+error)
            $('#alertText').html("创建失败，请修改后重试")
          })
      })
      return false
    })

    $('#project').blur(()=>{
      if ($('#project').val())
        this.notifyProjectChanged($('#project').val())
    })

    $(".custom-file-input").on("change", function() {
      var fileName = $(this).val().split("\\").pop();
      $(this).siblings(".custom-file-label").addClass("selected").html(fileName);
    });
  }

  initForm(data) {
    $('#project').val(data.project)
    $('#issueType').val(data.issueType)
    $('#components').val(data.components[0])
    $('#resumeType').val(data.resumeType)
    $('#resumeSource').val(data.resumeSource)
    $('#assignee').val(data.assignee)
  }

  show() {
    $('#mainForm').removeAttr("hidden")
  }

  hide() {
    $('#mainForm').attr("hidden", "hidden")
  }

  CheckInputs() {
    let elem = ['#project', '#inputFile', '#summary', '#assignee', '#issueType', '#components', '#resumeType', '#resumeSource'];
    for (let i = 0; i < elem.length; i++) {
      if (!$(elem[i]).val()) {
        $(elem[i]).addClass('is-invalid')
        return false;
      }
      else {
        $(elem[i]).removeClass('is-invalid')
      }
    }
    return true;
  }

  enableCreateIssue(flag) {
    if(flag)
      $('#createIssue').removeAttr("hidden");
    else
      $('#createIssue').attr("hidden","hidden");
  }

  showLoading(flag) {
    if(flag)
      $('#loading').removeAttr("hidden");
    else
      $('#loading').attr("hidden","hidden");
  }

  addListener(observer) {
    this.observers.push(observer)
  }

  notifyProjectChanged(projectName){
    this.observers.forEach((item, index, array)=>{
      item.onProjectChanged(projectName)
    })
  }

  updateProjectList(projectList) {
    let len = projectList.length
    $('#projectList').empty();
    for(let index = 0; index < len; index++){
      $('#projectList').append('<a class="dropdown-item project-list">'+projectList[index].name+'</a>');
    }
    $('.project-list').on('click', (event)=>{
      let projectName = event.target.innerText
      $('#project').val(projectName)
      this.notifyProjectChanged(projectName)
    })
  }

  updateIssueTypeList(issueTypeList) {
    let len = issueTypeList.length
    $('#issueTypeList').empty();
    for(let index = 0; index < len; index++){
      $('#issueTypeList').append('<a class="dropdown-item issue-type-list">'+issueTypeList[index].name+'</a>');
    }
    $('.issue-type-list').on('click', (event)=>{
      let issueType = event.target.innerText
      $('#issueType').val(issueType)
    })

  }

  updateComponentsList(componentsList) {
    let len = componentsList.length
    $('#componentsList').empty();
    for(let index = 0; index < len; index++){
      $('#componentsList').append('<a class="dropdown-item components-list">'+componentsList[index].name+'</a>');
    }
    $('.components-list').on('click', (event)=>{
      let componentName = event.target.innerText
      $('#components').val(componentName)
    })

  }

  updateResumeTypeList(resumeTypeList) {
    let len = resumeTypeList.length
    $('#resumeTypeList').empty();
    for(let index = 0; index < len; index++){
      $('#resumeTypeList').append('<a class="dropdown-item resume-type-list">'+resumeTypeList[index].name+'</a>');
    }
    $('.resume-type-list').on('click', (event)=>{
      let resumeType = event.target.innerText
      $('#resumeType').val(resumeType)
    })

  }

  updateResumeSourceList(resumeSourceList) {
    let len = resumeSourceList.length
    $('#resumeSourceList').empty();
    for(let index = 0; index < len; index++){
      $('#resumeSourceList').append('<a class="dropdown-item resume-source-list">'+resumeSourceList[index].name+'</a>');
    }
    $('.resume-source-list').on('click', (event)=>{
      let resumeSource = event.target.innerText
      $('#resumeSource').val(resumeSource)
    })
  }

  updateAssigneeList(users) {
    let len = users.length
    $('#assigneeList').empty();
    for(let index = 0; index < len; index++){
      $('#assigneeList').append('<a class="dropdown-item assignee-list">'+users[index].displayName+'</a>');
    }
    $('.assignee-list').on('click', (event)=>{
      let assignee = event.target.innerText
      $('#assignee').val(assignee)
    })
  }

  updateDescription(message) {
    $('#description').val(message)
  }
}

class FormController {
  constructor(formModel, formView) {
    this.formModel = formModel
    this.formView = formView
    this.componentsList = []
    this.assigneeList = []
    this.formModel.getProjects()
      .then((data)=>{
        this.projectList = data
        this.formView.updateProjectList(data)
      })
    this.formModel.getIssueType()
      .then((data)=>{
        this.issueTypeList = data
        this.formView.updateIssueTypeList(data)
      })
    this.formModel.getResumeType()
      .then((data)=>{
        this.resumeTypeList = data
        this.formView.updateResumeTypeList(data)
      })
    this.formModel.getResumeSource()
      .then((data)=>{
        this.resumeSourceList = data
        this.formView.updateResumeSourceList(data)
      })
  }

  getFromListByName(input_list, name) {
    let len = input_list.length
    for(let index = 0; index < len; ++index) {
      if (input_list[index].name == name)
        return input_list[index]
    }
  }


  getComponentsIdArray(componentNames) {
    let components=[]
    let count = componentNames.length
    for(let index = 0; index < count; ++index) {
      let component = this.getFromListByName(this.componentsList, componentNames[index])
      components.push({"id": component.id})
    }
    return components
  }

  getUserName(name) {
    let count = this.assigneeList.length
    for(let index = 0; index < count; ++index) {
      let assignee = this.assigneeList[index]
      if (assignee.displayName == name || 
           assignee.name == name)
        return assignee 
    }
  }

async  onProjectChanged(projectName) {
    //update components
    let projectElem = this.getFromListByName(this.projectList, projectName)
    this.formView.enableCreateIssue(false)
    this.formView.showLoading(true)
    let data = await this.formModel.getComponents(projectElem.id)
    this.componentsList = data
    this.formView.updateComponentsList(data)
    
    data = await this.formModel.getUsers(projectElem.key)
    this.assigneeList = data
    this.formView.updateAssigneeList(data)

    this.formView.showLoading(false)
    this.formView.enableCreateIssue(true)
  }

async onCreateIssueClick(pars){
  let project = this.getFromListByName(this.projectList, pars.project)
  let projectKey = project.key
  let issueTypeId = this.getFromListByName(this.issueTypeList, pars.issueType).id
  if (this.componentsList.length == 0) {
    let data = await this.formModel.getComponents(project.id)
    this.componentsList = data
    this.formView.updateComponentsList(data)
  }
  let componentsIdArray = this.getComponentsIdArray(pars.components)
  let resumeTypeId = this.getFromListByName(this.resumeTypeList, pars.resumeType).id
  let resumeSourceId = this.getFromListByName(this.resumeSourceList, pars.resumeSource).id
  if (this.assigneeList.length == 0) {
    let data = await this.formModel.getUsers(projectKey)
    this.assigneeList = data
    this.formView.updateAssigneeList(data)
  }
  let assigneeName = this.getUserName(pars.assignee).name
  let attachment = pars.attachment
  let requestData = {
    "fields":{
      "project":
      {
        "key": projectKey
      },
      "summary": pars.summary,
      "description": pars.description,
      "issuetype": {
        "id": issueTypeId
      },
      "assignee": {
        "name": assigneeName
      },
      "components": componentsIdArray,
      "customfield_13206": {
        "id": resumeTypeId
      },
      "customfield_13207": {
        "id": resumeSourceId
      }
    }
  };

  this.storeAllSetting(pars)
  let issue = await this.formModel.submitCreateIssue(requestData)
  let response = await this.formModel.uploadAttachment(attachment, issue.id)
  return response
}

  storeAllSetting(data) {
    chrome.storage.local.set(data);
  }
}

class FormModel {
  constructor() {
    this.jiraRequestManager = new JiraRequestManager();
  }

  getProjects() {
    const pm = new Promise((resolve, reject) => {
      this.jiraRequestManager.requestData(jiraHost+jiraApi.project.api, 
        jiraApi.project.type, 
        null, 
        resolve, 
        reject)
    })
    return pm;
  }

  getIssueType() {
    const pm = new Promise((resolve, reject) => {
      this.jiraRequestManager.requestData(jiraHost+jiraApi.issuetype.api, 
        jiraApi.issuetype.type, 
        null, 
        resolve, 
        reject)
    })
    return pm;
  }

  getComponents(projectId) {
    const pm = new Promise((resolve, reject) => {
      let request = jiraHost+jiraApi.components.api;
      request = request.replace("\{projectIdOrKey\}", projectId)
      this.jiraRequestManager.requestData(request, 
        jiraApi.components.type, 
        null, 
        resolve, 
        reject)
    })
    return pm;
  }

  getResumeType() {
    const pm = new Promise((resolve, reject) => {
      let result = [
        {name: "内推", id: "14695"},
        {name: "主动投递", id: "14696"},
        {name: "简历搜索", id: "14697"},
        {name: "其他", id: "14698"},
      ]
      resolve(result);
    })
    return pm;
  }

  getResumeSource() {
    const pm = new Promise((resolve, reject) => {
      let result = [
        {name: "BOSS 直聘", id: "14704"}
      ]
      resolve(result)
    })
    return pm;
  }

  getUsers(projectKey) {
    const pm = new Promise((resolve, reject) => {
      this.jiraRequestManager.requestData(jiraHost+jiraApi.findUsers.api+'?projectKeys='+projectKey+'&maxResults=1000',
        jiraApi.findUsers.type, 
        null, 
        resolve, 
        reject)
    })
    return pm;
  }

  submitCreateIssue(data) {
    const pm = new Promise((resolve, reject) => {
      this.jiraRequestManager.requestData(jiraHost+jiraApi.issue.api, 
        jiraApi.issue.type, 
        JSON.stringify(data),
        resolve, 
        reject)
    })
    return pm;
  }

  uploadAttachment(file, issueId) {
    const pm = new Promise((resolve, reject) => {
      var formData = new FormData();
      formData.append("file", file, file.name);
      let request = jiraHost+jiraApi.addIssueAttachment.api;
      request = request.replace("\{issueIdOrKey\}", issueId)
      this.jiraRequestManager.requestDataWithXSRF(request, 
        jiraApi.addIssueAttachment.type, 
        formData,
        resolve, 
        reject)
    })
    return pm;
  }
}


let formModel = new FormModel()
chrome.storage.local.get(['project', 'issueType', 'components', 'resumeType', 'resumeSource', 'assignee'], (result)=>{
  let formView = new FormView(result)
  let formController = new FormController(formModel, formView)
  formView.addListener(formController)

  chrome.runtime.sendMessage("download", (response)=>{
    console.log(response)
  })


  function updateDownloadStatus(status) {
    if(status) {
      $('#downloading').attr("hidden", "hidden")
      formView.show()
    } else {
      $('#downloadingButton').attr("hidden", "hidden")
      $('#downloadFailedButton').removeAttr("hidden")
    }
  }

  chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.status) {
      console.log(message.data);
      sendResponse("thank you!")
      chrome.downloads.download({url: message.data,saveAs: false}, (id)=>{
        updateDownloadStatus(true)
      })
//      formView.updateDescription("请从此地址下载简历： "+message.data)
    } else {
      console.log("fail to get resume url.")
      sendResponse("sad!")
      updateDownloadStatus(false)
    }
  })
});
