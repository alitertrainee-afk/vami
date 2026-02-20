<script setup>
import { computed } from "vue";
import { usePanelManager } from "../../../hooks/usePanelManager.js";

const props = defineProps({
  side: {
    type: String,
    required: true,
    validator: (value) => ["left", "right"].includes(value),
  },
});

const { panelStacks } = usePanelManager();

const currentPanel = computed(() => {
  const stack = panelStacks.value[props.side];
  return stack.length ? stack[stack.length - 1] : null;
});

const transitionClasses = computed(() => {
  const isLeft = props.side === "left";
  return {
    enterFrom: isLeft ? "-translate-x-full" : "translate-x-full",
    leaveTo: isLeft ? "-translate-x-full" : "translate-x-full",
  };
});
</script>

<template>
  <div class="h-full w-full bg-white flex flex-col overflow-hidden relative">
    <Transition
      enter-active-class="transition-transform duration-300 ease-out"
      :enter-from-class="transitionClasses.enterFrom"
      enter-to-class="translate-x-0"
      leave-active-class="transition-transform duration-300 ease-in"
      leave-from-class="translate-x-0"
      :leave-to-class="transitionClasses.leaveTo"
      mode="out-in"
    >
      <component
        v-if="currentPanel"
        :is="currentPanel.component"
        :key="currentPanel.id"
        v-bind="currentPanel.props"
        class="h-full w-full absolute inset-0 bg-white"
      />
    </Transition>
  </div>
</template>
