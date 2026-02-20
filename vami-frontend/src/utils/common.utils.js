export function getChatDisplayName(conversation, currentUserId) {
  if (!conversation) return null;

  if (conversation?.isGroupChat) {
    return conversation.chatName || "Unnamed Group";
  }

  const [user1, user2] = conversation.participants || [];

  if (!user1 || !user2) return null;

  return user1?._id === currentUserId ? user2.username : user1.username;
}
