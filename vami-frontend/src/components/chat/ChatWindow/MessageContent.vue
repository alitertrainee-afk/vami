<script setup>
import { computed } from "vue";
import { DocumentAttachmentIcon, PlayIcon } from "hugeicons-vue";

const props = defineProps({
  message: { type: Object, required: true },
});

// --- SCALABLE PARSER ---
// This computed property standardizes the message into an array of "Blocks".
// Future-proof: If your backend sends a complex array of blocks, you just return it here.
const contentBlocks = computed(() => {
  const blocks = [];

  // 1. Check for media/attachments first (Images, Videos, Documents)
  if (props.message.attachments && props.message.attachments.length > 0) {
    const images = props.message.attachments.filter((a) =>
      a.type.startsWith("image/"),
    );
    const files = props.message.attachments.filter(
      (a) => !a.type.startsWith("image/"),
    );

    if (images.length > 0) blocks.push({ type: "image_gallery", data: images });
    if (files.length > 0) blocks.push({ type: "file_list", data: files });
  }

  // 2. Check for Text / Markdown / Code
  if (props.message.content) {
    // Basic check to see if it contains a code block (e.g., ```javascript)
    const hasCode = props.message.content.includes("```");
    blocks.push({
      type: hasCode ? "markdown" : "plain_text",
      data: props.message.content,
    });
  }

  return blocks;
});
</script>

<template>
  <div class="flex flex-col gap-1.5 w-full">
    <template v-for="(block, index) in contentBlocks" :key="index">
      <p
        v-if="block.type === 'plain_text'"
        class="text-[15px] leading-relaxed whitespace-pre-wrap break-words text-[#111b21]"
      >
        {{ block.data }}
      </p>

      <div
        v-else-if="block.type === 'markdown'"
        class="text-[14px] bg-[#f0f2f5] p-2 rounded-md font-mono text-gray-800 break-words overflow-x-auto"
      >
        {{ block.data }}
      </div>

      <div
        v-else-if="block.type === 'image_gallery'"
        class="grid gap-1 rounded-lg overflow-hidden"
        :class="block.data.length > 1 ? 'grid-cols-2' : 'grid-cols-1'"
      >
        <div
          v-for="(img, i) in block.data.slice(0, 4)"
          :key="i"
          class="relative aspect-square bg-gray-200 cursor-pointer"
        >
          <img
            :src="img.url"
            class="w-full h-full object-cover hover:opacity-90 transition-opacity"
          />
          <div
            v-if="i === 3 && block.data.length > 4"
            class="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xl font-medium"
          >
            +{{ block.data.length - 4 }}
          </div>
        </div>
      </div>

      <div v-else-if="block.type === 'file_list'" class="flex flex-col gap-1">
        <div
          v-for="(file, i) in block.data"
          :key="i"
          class="flex items-center gap-3 p-3 bg-black/5 rounded-lg cursor-pointer hover:bg-black/10 transition-colors"
        >
          <div
            class="w-10 h-10 shrink-0 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center"
          >
            <DocumentAttachmentIcon :size="24" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-[14px] font-medium text-gray-800 truncate">
              {{ file.name }}
            </p>
            <p class="text-[12px] text-gray-500 uppercase">
              {{ file.size }} • {{ file.extension }}
            </p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
