import { ref, shallowRef } from "vue";

// Holds arrays of components for each side
const panelStacks = ref({
  left: [],
  right: [],
});

export function usePanelManager() {
  const openPanel = (side, component, props = {}) => {
    panelStacks.value[side].push({
      id: Date.now(), // Unique ID for Vue to track transitions
      component: shallowRef(component), // shallowRef is better for Vue components
      props,
    });
  };

  const closePanel = (side) => {
    if (panelStacks.value[side].length > 1) {
      panelStacks.value[side].pop();
    }
  };

  const closeAll = (side) => {
    panelStacks.value[side] = [];
  };

  return {
    panelStacks,
    openPanel,
    closePanel,
    closeAll,
  };
}
