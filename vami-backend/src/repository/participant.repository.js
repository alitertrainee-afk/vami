import ConversationParticipant from "../models/ConversationParticipant.js";

/**
 * Create participant records for all users in a conversation.
 */
export const createParticipants = async (conversationId, userIds) => {
    const docs = userIds.map((userId) => ({
        conversation: conversationId,
        user: userId,
        unreadCount: 0,
    }));

    return ConversationParticipant.insertMany(docs, { ordered: false });
};

/**
 * Get a user's participant record for a specific conversation.
 */
export const findParticipant = async (conversationId, userId) => {
    return ConversationParticipant.findOne({
        conversation: conversationId,
        user: userId,
    });
};

/**
 * Increment unread count for all participants in a conversation except the sender.
 */
export const incrementUnreadForOthers = async (conversationId, senderUserId) => {
    return ConversationParticipant.updateMany(
        {
            conversation: conversationId,
            user: { $ne: senderUserId },
        },
        { $inc: { unreadCount: 1 } },
    );
};

/**
 * Reset unread count and update lastReadAt for a specific user in a conversation.
 */
export const markConversationAsRead = async (conversationId, userId, messageId = null) => {
    const update = {
        unreadCount: 0,
        lastReadAt: new Date(),
    };

    if (messageId) {
        update.lastMessageSeenId = messageId;
    }

    return ConversationParticipant.findOneAndUpdate(
        { conversation: conversationId, user: userId },
        update,
        { new: true },
    );
};

/**
 * Get all participant records for a user (for sidebar with unread counts).
 */
export const findUserParticipantRecords = async (userId) => {
    return ConversationParticipant.find({ user: userId })
        .select("conversation unreadCount isPinned isArchived isMuted lastReadAt")
        .lean();
};

/**
 * Delete all participant records for a conversation.
 */
export const deleteParticipants = async (conversationId) => {
    return ConversationParticipant.deleteMany({ conversation: conversationId });
};

/**
 * Add a single participant to a conversation (for group chat add member).
 */
export const addParticipant = async (conversationId, userId) => {
    return ConversationParticipant.create({
        conversation: conversationId,
        user: userId,
        unreadCount: 0,
    });
};

/**
 * Remove a single participant from a conversation.
 */
export const removeParticipant = async (conversationId, userId) => {
    return ConversationParticipant.findOneAndDelete({
        conversation: conversationId,
        user: userId,
    });
};
