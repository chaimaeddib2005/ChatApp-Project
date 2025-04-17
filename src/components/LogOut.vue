<template>
    <button @click="handleLogout">Logout</button>
  </template>
  
  <script setup>
  import { logout } from '@/services/AuthService';
  import { useRouter } from 'vue-router';
  
  const router = useRouter();
  
  const handleLogout = async () => {
    await logout();            // Déconnecte l'utilisateur
    router.push('/login');     // Redirige vers la page de login
  };
  </script>
  