<template>
    <div>
      <h1>Page d'accueil</h1>
      <button @click="goToChat('WjxOiJJJAwtICOCEOv4M')">Aller au chat</button>
    </div>
  </template>
  
  <script setup>
  import { useRouter } from 'vue-router';
  
  const router = useRouter();
  
  function goToChat(chatId) {
    console.log("Clicked!", chatId); 
    router.push(`/chat/${chatId}`);
  }
  </script>
