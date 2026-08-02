const { openInChromeOrSystemDefault } = require('./chromeLauncher.cjs');

contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getVersion: () => ipcRenderer.invoke('app:get-version'),

  // Notifications
  showNotification: (title, body) => ipcRenderer.send('app:notification', { title, body }),

  // Window controls
  openExternal: (url) => openInChromeOrSystemDefault(url),
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

  // AI Providers
  aiGetProviders: () => ipcRenderer.invoke('ai:get-providers'),
  aiValidateProvider: (payload) => ipcRenderer.invoke('ai:validate-provider', payload),
  aiSaveProvider: (payload) => ipcRenderer.invoke('ai:save-provider', payload),
  aiResetProvider: (id) => ipcRenderer.invoke('ai:reset-provider', id),

  // Browser Routing
  browserGetDefaultBrowser: () => ipcRenderer.invoke('browser:get-default-browser'),
  browserOpenExternal: (url) => ipcRenderer.invoke('browser:open-external', url),

  // Desktop Automation & OS Control
  desktopLaunchApp: (appName) => ipcRenderer.invoke('desktop:launch-app', appName),
  desktopSystemControl: (action, level) => ipcRenderer.invoke('desktop:system-control', action, level),
  desktopMediaControl: (command) => ipcRenderer.invoke('desktop:media-control', command),
  desktopFocusBrowser: () => ipcRenderer.invoke('desktop:focus-browser'),

  // Windows Auto-Launch
  appGetAutoLaunch: () => ipcRenderer.invoke('app:get-auto-launch'),
  appSetAutoLaunch: (enabled) => ipcRenderer.invoke('app:set-auto-launch', enabled),

  // Vision Intelligence
  vision: {
    getMonitors: () => ipcRenderer.invoke('vision:getMonitors'),
    getCursor: () => ipcRenderer.invoke('vision:getCursor'),
    captureDisplay: (displayIndex) => ipcRenderer.invoke('vision:captureDisplay', displayIndex),
    analyzeScene: (displayIndex) => ipcRenderer.invoke('vision:analyzeScene', displayIndex),
  },

  // Student Brain
  student: {
    executeCommand: (commandStr, inputContent) => ipcRenderer.invoke('student:executeCommand', commandStr, inputContent),
  },

  // AI Workspace
  workspace: {
    get: () => ipcRenderer.invoke('workspace:get'),
    saveTask: (title, category, priority) => ipcRenderer.invoke('workspace:saveTask', title, category, priority),
    toggleTask: (taskId) => ipcRenderer.invoke('workspace:toggleTask', taskId),
    saveScratchpad: (text) => ipcRenderer.invoke('workspace:saveScratchpad', text),
    saveBookmark: (title, url, category) => ipcRenderer.invoke('workspace:saveBookmark', title, url, category),
  },

  // Plugins Architecture
  plugins: {
    get: () => ipcRenderer.invoke('plugins:get'),
    toggle: (id, enabled) => ipcRenderer.invoke('plugins:toggle', id, enabled),
  },

  // Security & Privacy
  security: {
    checkPermission: (permType) => ipcRenderer.invoke('security:checkPermission', permType),
    emergencyStop: () => ipcRenderer.invoke('security:emergencyStop'),
    toggleSafeMode: (active) => ipcRenderer.invoke('security:toggleSafeMode', active),
  },

  // Offline AI & Self-Learning
  offline: {
    getStatus: () => ipcRenderer.invoke('offline:getStatus'),
    getQueue: () => ipcRenderer.invoke('offline:getQueue'),
  },

  learning: {
    getIntel: () => ipcRenderer.invoke('learning:getIntel'),
    recordSolution: (pattern, solution, verified) => ipcRenderer.invoke('learning:recordSolution', pattern, solution, verified),
  },

  // Production Auto-Updater
  updater: {
    check: () => ipcRenderer.invoke('updater:check'),
  },
});