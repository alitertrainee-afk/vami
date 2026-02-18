import { onMounted, onUnmounted } from "vue";

export function useClickOutside(componentRef, callback) {
  if (!componentRef) return;

  const listener = (event) => {
    if (
      componentRef.value &&
      !componentRef.value.contains(event.target) &&
      event.target.isConnected
    ) {
      callback();
    }
  };

  onMounted(() => {
    document.addEventListener("click", listener);
  });

  onUnmounted(() => {
    document.removeEventListener("click", listener);
  });
}
