<script setup>
// libs imports
import { computed } from "vue";

const props = defineProps({
  // Content Props
  title: { type: String, required: true },
  subtitle: { type: String, default: "" },

  // Media Props (Provide one of these)
  icon: { type: [Object, Function], default: null },
  avatarUrl: { type: String, default: null },

  // Styling Props
  hoverBgClass: { type: String, default: "hover:bg-gray-100" },
  titleClass: { type: String, default: "text-gray-900" },
  subtitleClass: { type: String, default: "text-gray-500" },
  iconBgClass: { type: String, default: "bg-indigo-100" },
  iconColorClass: { type: String, default: "text-indigo-600" },

  // Layout Props
  showBorder: { type: Boolean, default: true },
});

defineEmits(["click"]);

// Determine what type of leading graphic to show if slots aren't used
const initial = computed(() =>
  props.title ? props.title.charAt(0).toUpperCase() : "?",
);
</script>

<template>
  <button
    @click="$emit('click')"
    :class="[
      'w-full px-2 flex items-center transition-colors focus:outline-none',
      hoverBgClass,
    ]"
  >
    <div class="shrink-0 mr-4">
      <slot name="leading">
        <div
          v-if="icon"
          :class="[
            'w-12 h-12 rounded-full flex items-center justify-center',
            iconBgClass,
            iconColorClass,
          ]"
        >
          <component :is="icon" :size="24" variant="solid" />
        </div>

        <div
          v-else-if="avatarUrl !== null"
          class="w-12 h-12 rounded-full overflow-hidden bg-gray-300 flex items-center justify-center text-white text-lg font-medium"
        >
          <img
            v-if="avatarUrl"
            :src="avatarUrl"
            :alt="title"
            class="w-full h-full object-cover"
          />
          <span v-else>{{ initial }}</span>
        </div>
      </slot>
    </div>

    <div
      :class="[
        'flex-1 min-w-0 text-left flex flex-col justify-center pb-3 mt-3',
        showBorder ? 'border-b border-gray-100' : '',
      ]"
    >
      <div class="flex justify-between items-baseline">
        <slot name="title">
          <span
            :class="[
              'text-[17px] font-normal tracking-wide truncate',
              titleClass,
            ]"
          >
            {{ title }}
          </span>
        </slot>

        <div class="ml-2 shrink-0">
          <slot name="trailing"></slot>
        </div>
      </div>

      <slot name="subtitle">
        <span
          v-if="subtitle"
          :class="['text-[14px] truncate mt-0.5', subtitleClass]"
        >
          {{ subtitle }}
        </span>
      </slot>
    </div>
  </button>
</template>
