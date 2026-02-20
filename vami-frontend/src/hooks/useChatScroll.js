import { ref, watch, nextTick, onMounted, onUnmounted } from "vue";

export function useChatScroll({ messages, hasNext, loadMore }) {
  // This ref will be bound to our scrollable div in the template
  const messagesContainer = ref(null);
  const isFetchingMore = ref(false);

  const scrollToBottom = async () => {
    await nextTick();
    await new Promise((resolve) => requestAnimationFrame(resolve));

    const container = messagesContainer.value;
    if (!container) return;

    container.scrollTop = container.scrollHeight;
  };

  const handleScroll = async () => {
    const container = messagesContainer.value;
    if (!container) return;

    // Hit the top threshold (100px)
    if (container.scrollTop <= 100) {
      if (isFetchingMore.value || !hasNext.value) return;

      isFetchingMore.value = true;
      const previousHeight = container.scrollHeight;

      // Trigger the parent's loadMore function
      const loaded = await loadMore();
      if (!loaded) {
        isFetchingMore.value = false;
        return;
      }

      await nextTick();
      await new Promise((resolve) => requestAnimationFrame(resolve));

      // Restore scroll position so the user doesn't jump to the top
      const newHeight = container.scrollHeight;
      container.scrollTop = newHeight - previousHeight;

      isFetchingMore.value = false;
    }
  };

  // Lifecycle Bindings
  onMounted(async () => {
    await nextTick();
    messagesContainer.value?.addEventListener("scroll", handleScroll, {
      passive: true,
    });
  });

  onUnmounted(() => {
    messagesContainer.value?.removeEventListener("scroll", handleScroll);
  });

  // Auto-scroll when new messages arrive
  watch(
    () => messages.value?.length,
    async (newVal, oldVal) => {
      const container = messagesContainer.value;
      if (!container) return;

      // Initial load: Snap to bottom
      if (oldVal === 0 && newVal > 0) {
        await scrollToBottom();
        return;
      }

      // If the user was already near the bottom, auto-scroll for the new message
      const isNearBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight <
        100;
      if (isNearBottom) {
        await scrollToBottom();
      }
    },
  );

  return {
    messagesContainer,
    scrollToBottom,
    isFetchingMore,
  };
}
