import { createRouter, createWebHistory } from 'vue-router';
import LoginPage from './components/LoginPage.vue';
import RegisterPage from './components/RegisterPage.vue';
import WelcomingPage from './components/WelcomingPage.vue';
import HomeView from './components/HomeView.vue';
import ChatPage from './components/ChatPage.vue';
const routes = [
  { path: '/',name: 'Welcoming', component: WelcomingPage },
  
  { path: '/register', name: 'RegisterPage',component: RegisterPage,},
  { path: '/login', component:LoginPage },
  {
    path: '/home',
    name: 'Home',
    component: HomeView,
  },
  {
    path: '/chat/:user1/:user2',
    name: 'ChatPage',
    component: ChatPage,
    props: true  // Permet de passer les paramètres de l'URL comme props dans le composant
  }
  
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
  scrollBehavior() {
    return { top: 0 };
  },
});

import { getAuth } from 'firebase/auth';

router.beforeEach((to, from, next) => {
  const hasVisited = localStorage.getItem('hasVisited');
  const auth = getAuth();
  const user = auth.currentUser;

  if (!hasVisited && to.name !== 'Welcoming') {
    localStorage.setItem('hasVisited', true);
    return next({ name: 'Welcoming' });
  }

  if (to.name === 'Welcoming' && user) {
    // if already logged in, skip the welcoming page
    return next({ name: 'Home' });
  }

  next();
});
export default router;
