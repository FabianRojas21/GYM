'use strict';

const {defineConfig,devices}=require('@playwright/test');

module.exports=defineConfig({
  testDir:'./e2e',
  fullyParallel:true,
  reporter:'list',
  use:{
    baseURL:'http://127.0.0.1:4173',
    trace:'retain-on-failure',
    serviceWorkers:'block'
  },
  projects:[{
    name:'chromium-mobile',
    use:{...devices['iPhone 13'],browserName:'chromium'}
  }],
  webServer:{
    command:'node test/serve.js',
    url:'http://127.0.0.1:4173',
    reuseExistingServer:!process.env.CI,
    timeout:10000
  }
});
