<script setup>
import { socketClient } from './lib/socket.client.js';

if(import.meta.hot){
  import.meta.hot.dispose(() => {
    console.log("Hot reload");
    socketClient.disconnect();
  });
}
</script>

<template>
  <router-view v-slot="{ Component }">
    <transition name="fade" mode="out-in">
      <component :is="Component" />
    </transition>
  </router-view>
</template>

<style>
/* Subtle page transition for enterprise feel */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
