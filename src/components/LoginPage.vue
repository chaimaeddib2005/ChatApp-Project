<template>
    <div class="ghibli-pastel-layout">
      <div class="floating-bubble" v-for="n in 8" :key="'bubble-'+n"></div>
      
      <div class="content-container">
        <div class="header-section">
          <h1 class="main-title">
            <span class="title-text">Welcome Back</span>
            <span class="title-decoration"></span>
          </h1>
          <p class="subtitle">Continue your creative journey</p>
        </div>
        
        <div class="auth-card">
          <AuthForm :isLogin="true" @auth-success="handleLoginSuccess" />
          
          <div class="auth-footer">
            <p>New here? <router-link to="/register" class="auth-link">Create account</router-link></p>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { useRouter } from 'vue-router'
  import AuthForm from '@/components/AuthForm.vue'
  
  const router = useRouter()
  
  const handleLoginSuccess = () => {
    router.push('/')
  }
  </script>
  
  <style scoped>
  .ghibli-pastel-layout {
    min-height: 100vh;
    background: linear-gradient(135deg, #f8f5ff 0%, #f0f9ff 100%);
    padding: 2rem;
    position: relative;
    overflow: hidden;
    font-family: 'Nunito Sans', 'Helvetica Neue', sans-serif;
  }
  
  .content-container {
    max-width: 500px;
    margin: 0 auto;
    position: relative;
    z-index: 2;
  }
  
  .header-section {
    text-align: center;
    margin: 2rem 0 3rem;
  }
  
  .main-title {
    font-size: 2.5rem;
    color: #5a4a42;
    margin-bottom: 0.5rem;
    position: relative;
    display: inline-block;
  }
  
  .title-text {
    position: relative;
    z-index: 2;
  }
  
  .title-decoration {
    position: absolute;
    bottom: 5px;
    left: 0;
    width: 100%;
    height: 12px;
    background: linear-gradient(90deg, 
      rgba(167,210,233,0.4) 0%, 
      rgba(249,213,110,0.4) 50%, 
      rgba(220,182,233,0.4) 100%);
    z-index: 1;
    border-radius: 6px;
  }
  
  .subtitle {
    font-size: 1.2rem;
    color: #8b9bab;
    font-weight: 300;
  }
  
  .auth-card {
    background: white;
    border-radius: 16px;
    padding: 2.5rem;
    box-shadow: 0 5px 20px rgba(0,0,0,0.04);
    border: 1px solid rgba(0,0,0,0.03);
    animation: cardEntrance 0.6s ease-out;
  }
  
  .auth-footer {
    margin-top: 1.5rem;
    text-align: center;
    color: #8b9bab;
    font-size: 0.95rem;
  }
  
  .auth-link {
    color: #8742f5;
    text-decoration: none;
    font-weight: 600;
    transition: all 0.3s ease;
    position: relative;
  }
  
  .auth-link:hover {
    color: #8742f5;
  }
  
  .auth-link::after {
    content: '';
    position: absolute;
    width: 100%;
    height: 2px;
    bottom: -2px;
    left: 0;
    background-color: #8742f5;
    transform: scaleX(0);
    transition: transform 0.3s ease;
  }
  
  .auth-link:hover::after {
    transform: scaleX(1);
  }
  
  /* Button styles that will affect AuthForm */
  .auth-card :deep(.auth-button) {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    width: 100%;
    padding: 16px 24px;
    border: none;
    border-radius: 12px;
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
    position: relative;
    overflow: hidden;
    margin: 12px 0;
  }
  
  .auth-card :deep(.auth-button::before) {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(255,255,255,0.2);
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  .auth-card :deep(.auth-button:hover::before) {
    opacity: 1;
  }
  
  .auth-card :deep(.auth-button:disabled) {
    opacity: 0.7;
    cursor: not-allowed;
    transform: none !important;
  }
  
  /* Login button */
  .auth-card :deep(.login-btn) {
    background-color: #42a5f5;
    color: white;
    box-shadow: 0 4px 12px rgba(66, 165, 245, 0.3);
  }
  
  .auth-card :deep(.login-btn:hover) {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(66, 165, 245, 0.4);
  }
  
  /* Password reset button */
  .auth-card :deep(.reset-btn) {
    background-color: #f5f5f5;
    color: #5a4a42;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }
  
  .auth-card :deep(.reset-btn:hover) {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
    background-color: #eeeeee;
  }
  </style>