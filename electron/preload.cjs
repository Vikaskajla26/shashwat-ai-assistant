const { contextBridge, ipcRenderer, shell } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getVersion: () => ipcRenderer.invoke('app:get-version'),

  // Notifications
  showNotification: (title, body) => ipcRenderer.send('app:notification', { title, body }),

  // Window controls
  openExternal: (url) => shell.openExternal(url),
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),

  // Generic IPC
  sendIPC: (channel, data) => ipcRenderer.send(channel, data),
  onIPC: (channel, callback) => {
    const subscription = (_event, ...args) => callback(...args);
    ipcRenderer.on(channel, subscription);
    return () => ipcRenderer.removeListener(channel, subscription);
  },

  // Database - User Memory
  dbGetMemory: () => ipcRenderer.invoke('db:get-memory'),
  dbSetMemory: (key, value) => ipcRenderer.invoke('db:set-memory', key, value),
  dbDeleteMemory: (key) => ipcRenderer.invoke('db:delete-memory', key),

  // Database - Settings
  dbGetSettings: () => ipcRenderer.invoke('db:get-settings'),
  dbSetSetting: (key, value) => ipcRenderer.invoke('db:set-setting', key, value),

  // Database - Conversations
  dbGetConversations: (sessionId) => ipcRenderer.invoke('db:get-conversations', sessionId),
  dbAddConversation: (sessionId, role, content) => ipcRenderer.invoke('db:add-conversation', sessionId, role, content),

  // Database - Bookmarks
  dbGetBookmarks: () => ipcRenderer.invoke('db:get-bookmarks'),
  dbAddBookmark: (title, url, description) => ipcRenderer.invoke('db:add-bookmark', title, url, description),
  dbDeleteBookmark: (id) => ipcRenderer.invoke('db:delete-bookmark', id),

  // Database - Study Workspace
  dbGetStudyWorkspace: () => ipcRenderer.invoke('db:get-study-workspace'),
  dbAddStudyItem: (title, content, subject) => ipcRenderer.invoke('db:add-study-item', title, content, subject),
  dbUpdateStudyItem: (id, title, content, subject) => ipcRenderer.invoke('db:update-study-item', id, title, content, subject),
  dbDeleteStudyItem: (id) => ipcRenderer.invoke('db:delete-study-item', id),

  // Database - Task History
  dbGetTaskHistory: () => ipcRenderer.invoke('db:get-task-history'),
  dbAddTaskHistory: (taskName, status, result) => ipcRenderer.invoke('db:add-task-history', taskName, status, result),

  // Database - Automation History
  dbGetAutomationHistory: () => ipcRenderer.invoke('db:get-automation-history'),
  dbAddAutomationHistory: (action, target, parameters, success, result) => ipcRenderer.invoke('db:add-automation-history', action, target, parameters, success, result),

  // Database - Logs
  dbGetLogs: (level, limit) => ipcRenderer.invoke('db:get-logs', level, limit),
  dbAddLog: (level, message, module) => ipcRenderer.invoke('db:add-log', level, message, module),

  // Database - Learning Database (Spaced Repetition)
  dbGetLearningItems: () => ipcRenderer.invoke('db:get-learning-items'),
  dbAddLearningItem: (topic, question, answer) => ipcRenderer.invoke('db:add-learning-item', topic, question, answer),
  dbUpdateLearningItem: (id, easeFactor, interval, repetitions) => ipcRenderer.invoke('db:update-learning-item', id, easeFactor, interval, repetitions),
});