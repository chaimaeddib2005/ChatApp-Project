<template>
    <div class="container">
      <h2>Chat between {{ user1 }} and {{ user2 }}</h2>
      <ul>
        <li v-for="msg in messageList" :key="msg.message" :class="msg.sender === currentUser?.uid ? 'sent' : 'received'">
          {{ msg.message }}
          <small class="timestamp">{{ formatTimestamp(msg.timestamp) }}</small>
        </li>
      </ul>
      <div class="input-area">
          <input type="text" v-model="newMessage">
        <button @click.prevent="sendMessage">
              <i class="fas fa-paper-plane"></i>
          </button>

      </div>
      

    </div>
  </template>
  <script setup>
  import { ref, onBeforeUnmount, onMounted } from 'vue';
  import { doc, getDoc, onSnapshot, addDoc, updateDoc, arrayUnion, collection, serverTimestamp, getDocs } from 'firebase/firestore';
  import { db } from '../firebase';
  import { useRoute } from 'vue-router';
  import { getAuth } from 'firebase/auth';
  
  const route = useRoute();
  const user1 = route.params.user1;
  const user2 = route.params.user2;
  
  const auth = getAuth();
  const currentUser = auth.currentUser;
  
  const newMessage = ref("");
  const messageList = ref([]);
  let chatUnsub = null;
  let chatId = null;
  
  // 🔍 Helper to find the existing chat between user1 and user2
  async function findChatId(user1, user2) {
    const chatsRef = collection(db, 'chats');
    const snapshot = await getDocs(chatsRef);
  
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const users = [data.user1, data.user2];
      if (users.includes(user1) && users.includes(user2)) {
        return docSnap.id;
      }
    }
  
    return null;
  }
  
  async function loadMessagesByIds(ids) {
    const messages = [];
    for (const id of ids) {
      const messageDoc = await getDoc(doc(db, 'chatMessages', id));
      if (messageDoc.exists()) {
        messages.push({ id: messageDoc.id, ...messageDoc.data() });
      }
    }
    messageList.value = messages;
  }
  
  // 👇 Load chat on component mount
  onMounted(async () => {
    chatId = await findChatId(user1, user2);
  
    if (!chatId) {
      const newChatRef = await addDoc(collection(db, 'chats'), {
        user1,
        user2,
        messages: []
      });
      chatId = newChatRef.id;
    }
  
    const chatRef = doc(db, 'chats', chatId);
    chatUnsub = onSnapshot(chatRef, (chatSnap) => {
      if (chatSnap.exists()) {
        const chatData = chatSnap.data();
        const messageIds = chatData.messages || [];
        loadMessagesByIds(messageIds);
      } else {
        console.log('Chat does not exist.');
        messageList.value = [];
      }
    });
  });
  
  async function sendMessage() {
    if (!newMessage.value.trim()) return;
  
    try {
      const messageData = {
        sender: currentUser?.uid,  
        receiver: currentUser?.uid === user1 ? user2 : user1,  
        message: newMessage.value,
        timestamp: serverTimestamp()
      };
  
      const newMsgRef = await addDoc(collection(db, 'chatMessages'), messageData);
  
      await updateDoc(doc(db, 'chats', chatId), {
        messages: arrayUnion(newMsgRef.id)
      });
  
      newMessage.value = "";
  
    } catch (error) {
      console.error("Error sending message:", error);
    }
  }
  
  function formatTimestamp(ts) {
    if (!ts) return '';
    const date = ts.toDate();
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  onBeforeUnmount(() => {
    if (chatUnsub) chatUnsub();
  });
  </script>
  

  <style scoped>
 
 .container {
    width: 70%;
    margin: 0 auto;
    padding: 20px;
    display: flex;
    flex-direction: column;
    background-color: #f5f5f5;
    border-radius: 10px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  }
 
  
  ul {
    flex: 1;
    overflow-y: auto;
    padding: 0;
    margin: 0 0 20px 0;
  }
  
 
  li {
    list-style: none;
    margin-bottom: 12px;
    max-width: 50%;
    padding: 12px 16px;
    border-radius: 18px;
    line-height: 1.4;
    position: relative;
    word-wrap: break-word;
  }

  .sent {
    text-align: left;
    background-color: #49df64;
    color: white;
    margin-left: auto;
    border-bottom-right-radius: 4px;
  }
  

  .received {
    text-align: left;
    background-color: #e9ecef;
    color: #333;
    margin-right: auto;
    border-bottom-left-radius: 4px;
  }
  

  .input-area {
    display: flex;
    height: 40px;
    gap: 10px;
  }
  
  input[type="text"] {
    flex: 1;
    border: 1px solid #ddd;
    border-radius: 15px;
    outline: none;
    font-size: 16px;
    height: 45px;
    width: 60%;
    padding: 4px;
  }
  
  input[type="text"]:focus {
    border-color: #49df64;
  }
  

  button {
    background-color: #49df64;
    color: white;
    border: none;
    border-radius: 50%;
    width: 50px;
    height: 50px;
    cursor: pointer;
    transition: background-color 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  button:hover {
    background-color: #4e9a5c;
  }
  
  button i {
    font-size: 18px;
  }

 
  .timestamp {
    font-size: 0.7rem;
    opacity: 0.8;
    margin-top: 4px;
    display: block;
    text-align: right;
  }
  
  .sent .timestamp {
    color: rgba(255, 255, 255, 0.977);
  }
  
  .received .timestamp {
    color: rgba(0,0,0,0.6);
    
  }
  

  </style>