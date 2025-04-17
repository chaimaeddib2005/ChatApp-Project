<template>
  <div class="container">
    <small v-if="otherUserId" class="status-indicator">
      {{ otherUserStatus === 'online' ? 'Online' : 'Offline' }}
      <span v-if="isOtherUserTyping"> (typing...)</span>
    </small>
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
      <input 
        type="text" 
        v-model="newMessage"
        @input="handleTyping"
        @keyup.enter="sendCombinedMessage"
      >
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
        <button @click="$refs.fileInput.click()" class="icon-button">
          <i class="fas fa-image"></i>
        </button>
      </div>
    </div> 
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { getDatabase, ref as dbRef, set, onDisconnect, onValue, off } from 'firebase/database';
import { useRoute } from 'vue-router';
import { getAuth } from 'firebase/auth';
import {
  doc,
  getDoc,
  onSnapshot,
  addDoc,
  updateDoc,
  arrayUnion,
  collection,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

// Route & Auth
const route = useRoute();
const chatId = route.params.chatId;
const auth = getAuth();
const currentUser = auth.currentUser;

// Refs
const newMessage = ref('');
const messageList = ref([]);
const previewUrl = ref('');
const fileInput = ref(null);
const otherUserStatus = ref('offline');
const isOtherUserTyping = ref(false);
let typingTimeout = null;
let otherUserId = null;
let unsubscribeStatus = null;
let unsubscribeTyping = null;

// Presence System Setup
const setupPresence = async () => {
  const rtdb = getDatabase();
  const user = currentUser;
  if (!user) return;

  // Get chat data to determine the other user
  const chatDoc = await getDoc(doc(db, 'chats', chatId));
  if (!chatDoc.exists()) return;

  const chatData = chatDoc.data();
  otherUserId = chatData.user1 === user.uid ? chatData.user2 : chatData.user1;

  // Current user's status reference
  const userStatusRef = dbRef(rtdb, `status/${user.uid}`);
  const userStatusConnectedRef = dbRef(rtdb, '.info/connected');
  
  // Other user's status reference
  const otherUserStatusRef = dbRef(rtdb, `status/${otherUserId}`);
  const otherUserTypingRef = dbRef(rtdb, `status/${otherUserId}/typing`);

  // Monitor connection state
  onValue(userStatusConnectedRef, (snap) => {
    if (snap.val() === true) {
      // User is connected
      set(userStatusRef, {
        state: 'online',
        last_changed: serverTimestamp(),
      });

      // Setup disconnect handler
      onDisconnect(userStatusRef).set({
        state: 'offline',
        last_changed: serverTimestamp(),
      });
    }
  });

  // Monitor other user's status
  unsubscribeStatus = onValue(otherUserStatusRef, (snapshot) => {
    const status = snapshot.val();
    otherUserStatus.value = status?.state || 'offline';
  });

  // Monitor other user's typing status
  unsubscribeTyping = onValue(otherUserTypingRef, (snapshot) => {
    isOtherUserTyping.value = snapshot.val() || false;
  });
};

// Typing indicator handler
const handleTyping = () => {
  if (!currentUser || !otherUserId) return;
  
  const rtdb = getDatabase();
  const typingRef = dbRef(rtdb, `status/${currentUser.uid}/typing`);
  
  // Set typing to true
  set(typingRef, true);
  
  // Clear any existing timeout
  if (typingTimeout) clearTimeout(typingTimeout);
  
  // Set timeout to set typing to false after 3 seconds of inactivity
  typingTimeout = setTimeout(() => {
    set(typingRef, false);
  }, 3000);
};

// Image check helper
function isImageMessage(message) {
  return typeof message === 'string' &&
    (message.startsWith('data:image') || /\.(jpeg|jpg|gif|png)$/i.test(message));
}

function formatTimestamp(ts) {
  if (!ts) return '';
  
  // Handle all possible timestamp formats:
  const date = ts.toDate?.() ||          // Firestore Timestamp
               new Date(ts.seconds * 1000) ||  // Raw { seconds, nanoseconds } object
               new Date(ts);             // Fallback (JS Date or ISO string)
  
  return date.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}
// Corrected message loading function
async function loadMessagesByIds(ids) {
  const messages = [];
  try {
    // First verify we have a valid chatId
    if (!chatId) {
      console.error("No chatId provided");
      return;
    }

    // Get the chat document first to verify it exists
    const chatDoc = await getDoc(doc(db, 'chats', chatId));
    if (!chatDoc.exists()) {
      console.error("Chat doesn't exist");
      return;
    }

    // Load each message
    for (const id of ids) {
      try {
        // IMPORTANT: Verify the message ID is valid
        if (!id || typeof id !== 'string') {
          console.warn("Invalid message ID:", id);
          continue;
        }

        const messageDoc = await getDoc(doc(db, 'chatMessages', id));
        if (messageDoc.exists()) {
          const messageData = messageDoc.data();
          messages.push({
            id: messageDoc.id,
            ...messageData,
            // Ensure timestamp is properly converted
            timestamp: messageData.timestamp?.toDate?.() || new Date()
          });
        }
      } catch (error) {
        console.error(`Error loading message ${id}:`, error);
      }
    }

    // Sort messages by timestamp (oldest first)
    messages.sort((a, b) => a.timestamp - b.timestamp);
    messageList.value = messages;
  } catch (error) {
    console.error("Error loading messages:", error);
  }
}

// Send message (updated for your structure)
async function sendCombinedMessage() {
  const text = newMessage.value.trim();
  const image = previewUrl.value;

  if (!text && !image) return;

  try {
    // 1. Add the new message to chatMessages collection
    const messageData = {
      sender: currentUser?.uid,
      message: image || text,
      timestamp: serverTimestamp(),
      chatId: chatId // Important: reference which chat this belongs to
    };

    const newMsgRef = await addDoc(collection(db, 'chatMessages'), messageData);

    // 2. Update the chats document with the new message reference
    await updateDoc(doc(db, 'chats', chatId), {
      messages: arrayUnion(newMsgRef.id),
      lastUpdated: serverTimestamp()
    });

    // 3. Clear inputs and typing status
    newMessage.value = '';
    previewUrl.value = '';
    
    if (currentUser) {
      const rtdb = getDatabase();
      const typingRef = dbRef(rtdb, `status/${currentUser.uid}/typing`);
      set(typingRef, false);
    }
  } catch (error) {
    console.error('Error sending message:', error);
  }
}

// Drag & drop handler
const onDrop = (e) => {
  const file = e.dataTransfer.files[0];
  if (file) convertToBase64(file);
};

// File input handler
const onFileChange = (e) => {
  const file = e.target.files[0];
  if (file) convertToBase64(file);
};

// Convert image to base64 for preview
const convertToBase64 = (file) => {
  const reader = new FileReader();
  reader.onload = () => {
    previewUrl.value = reader.result;
  };
  reader.readAsDataURL(file);
};

// Subscribe to chat updates on mount
let chatUnsub = null;
onMounted(async () => {
  await setupPresence();
  
  const chatRef = doc(db, 'chats', chatId);
  chatUnsub = onSnapshot(chatRef, (chatSnap) => {
    if (chatSnap.exists()) {
      const chatData = chatSnap.data();
      const messageIds = chatData.messages || [];
      loadMessagesByIds(messageIds);
    } else {
      console.warn('Chat document does not exist');
      messageList.value = [];
    }
  });
});

// Cleanup on unmount
onBeforeUnmount(() => {
  if (chatUnsub) chatUnsub();
  if (unsubscribeStatus) off(unsubscribeStatus);
  if (unsubscribeTyping) off(unsubscribeTyping);
  if (typingTimeout) clearTimeout(typingTimeout);
  
  // Set offline status when component unmounts
  if (currentUser) {
    const rtdb = getDatabase();
    const userStatusRef = dbRef(rtdb, `status/${currentUser.uid}`);
    set(userStatusRef, {
      state: 'offline',
      last_changed: serverTimestamp(),
    });
  }
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