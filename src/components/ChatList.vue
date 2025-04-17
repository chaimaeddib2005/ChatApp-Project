<template>
    <div>
      <h1>Page d'accueil</h1>
      <button @click="goToChat('YZmtqeT5SWtoJ1usWaCu', 'NVpBtbGsqjMMyylcq7BmqNOWaZy2')">Aller au chat</button>
    </div>
  </template>
  
  <script setup>
  import { useRouter } from 'vue-router';
  
  const router = useRouter();
  
  function goToChat(user1, user2) {
    router.push({ name: 'ChatPage', params: { user1, user2 } });
  }
  </script>
  