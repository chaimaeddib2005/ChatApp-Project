<template>
    <div class="container">
      <h2>Chat between {{ user1 }} and {{ user2 }}</h2>
      <ul>
        <li
          v-for="msg in messageList"
          :key="msg.id"
          :class="msg.sender === currentUser?.uid ? 'sent' : 'received'"
        >
          <div v-if="isImageMessage(msg.message)">
            <img :src="msg.message" alt="Image" class="chat-image" />
          </div>
          <div v-else>
            {{ msg.message }}
          </div>
          <small class="timestamp">{{ formatTimestamp(msg.timestamp) }}</small>
        </li>

      </ul>
      <div class="input-area">
          <input type="text" v-model="newMessage">
        <button @click.prevent="sendCombinedMessage">
              <i class="fas fa-paper-plane"></i>
        </button>
        <div @drop.prevent="onDrop" @dragover.prevent>
        <input
        type="file"
        ref="fileInput"
        accept="image/*"
        @change="onFileChange"
        style="display: none"
        />
        <div v-if="previewUrl" class="image-preview">
          <img :src="previewUrl" alt="Preview" class="chat-image" />
        </div>

      <!-- Custom upload button -->
        <button @click="$refs.fileInput.click()" class="icon-button">
          <i class="fas fa-image"></i>
        </button>

      </div>

      </div>

     
      

      

    </div>
  </template>
  <script setup>
  import { ref, onBeforeUnmount, onMounted } from 'vue';
  import { doc, getDoc, onSnapshot, addDoc, updateDoc, arrayUnion, collection, serverTimestamp, getDocs } from 'firebase/firestore';
  import { db } from '../firebase';
  import { useRoute } from 'vue-router';
  import { getAuth } from 'firebase/auth';

  const previewUrl = ref('')
  const fileInput = ref(null)

 
  
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

  async function sendCombinedMessage() {
  const text = newMessage.value.trim();
  const image = previewUrl.value;

  // prevent sending nothing
  if (!text && !image) return;

  const messageData = {
    sender: currentUser?.uid,
    receiver: currentUser?.uid === user1 ? user2 : user1,
    message: image || text, // prioritizes image
    timestamp: serverTimestamp(),
  };
  console.log(messageData)
  console.log(previewUrl)
  try {
    const newMsgRef = await addDoc(collection(db, 'chatMessages'), messageData);
    await updateDoc(doc(db, 'chats', chatId), {
      messages: arrayUnion(newMsgRef.id),
    });

    // clear fields
    newMessage.value = "";
    previewUrl.value = "";
  } catch (error) {
    console.error("Error sending message:", error);
  }
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
  
  function isImageMessage(message) {
  return typeof message === 'string' && (message.startsWith('data:image') || /\.(jpeg|jpg|gif|png)$/.test(message));
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
  

  
  function formatTimestamp(ts) {
    if (!ts) return '';
    const date = ts.toDate();
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  const onDrop = (e) => {
    const file = e.dataTransfer.files[0]
    if (file) convertToBase64(file)
  }
  
  const convertToBase64 = (file) => {
    const reader = new FileReader()
    reader.onload = async () => {
      const base64Image = reader.result
      previewUrl.value = base64Image
      
    }
    reader.readAsDataURL(file)
  }
  const onFileChange = async (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = () => {
      previewUrl.value = reader.result;
    };
    reader.readAsDataURL(file);
  }
};



  
  onBeforeUnmount(() => {
    if (chatUnsub) chatUnsub();
  });
  </script>
  

  <style scoped>
 
 .container {
  width: 100%;
  max-width: 600px;
  margin: 40px auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

h2 {
  text-align: center;
  font-size: 1.5rem;
  margin-bottom: 16px;
  color: #333;
}

ul {
  flex: 1;
  overflow-y: auto;
  padding: 0 10px;
  margin-bottom: 20px;
  max-height: 400px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* Message bubble */
li {
  list-style: none;
  max-width: 75%;
  padding: 10px 14px;
  border-radius: 20px;
  position: relative;
  word-wrap: break-word;
  line-height: 1.5;
  font-size: 0.95rem;
  transition: background-color 0.2s;
}

.sent {
  align-self: flex-end;
  background-color: #4caf50;
  color: #fff;
  border-bottom-right-radius: 4px;
}

.received {
  align-self: flex-start;
  background-color: #f0f0f0;
  color: #333;
  border-bottom-left-radius: 4px;
}

.chat-image {
  max-width: 100%;
  border-radius: 10px;
  margin-top: 6px;
}

.timestamp {
  font-size: 0.7rem;
  margin-top: 4px;
  opacity: 0.7;
  text-align: right;
}

.input-area {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px solid #eee;
}

input[type="text"] {
  flex: 1;
  padding: 10px 14px;
  font-size: 16px;
  border: 1px solid #ccc;
  border-radius: 20px;
  outline: none;
  transition: border-color 0.2s;
}

input[type="text"]:focus {
  border-color: #4caf50;
}

button {
  background-color: #4caf50;
  color: #fff;
  border: none;
  border-radius: 50%;
  width: 42px;
  height: 42px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease-in-out;
}

button:hover {
  background-color: #43a047;
}

button i {
  font-size: 18px;
}

.icon-button {
  background-color: #2196f3;
  margin-left: 4px;
}

.icon-button:hover {
  background-color: #1e88e5;
}

.image-preview {
  margin-top: 10px;
  text-align: center;
}

.image-preview img {
  max-width: 120px;
  border-radius: 12px;
  border: 1px solid #ccc;
}

  

  </style>