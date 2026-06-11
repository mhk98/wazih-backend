// Chat module removed — socket is disabled.

let ioInstance = null;

const userRoom = (userId) => `user:${userId}`;
const conversationRoom = (conversationId) => `conversation:${conversationId}`;

const initializeChatSocket = (_server) => {
  // Chat functionality has been removed.
};

const getIO = () => ioInstance;

const emitToUser = (userId, eventName, payload) => {
  if (!ioInstance || !userId) return;
  ioInstance.to(userRoom(userId)).emit(eventName, payload);
};

const emitToConversation = (conversationId, eventName, payload) => {
  if (!ioInstance || !conversationId) return;
  ioInstance.to(conversationRoom(conversationId)).emit(eventName, payload);
};

module.exports = {
  initializeChatSocket,
  getIO,
  emitToUser,
  emitToConversation,
  userRoom,
  conversationRoom,
};
