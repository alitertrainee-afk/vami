<script setup>
import { ref } from "vue";
import { UserGroupIcon, UserAdd01Icon, UserMultipleIcon } from "hugeicons-vue";

// Components
import PanelLayout from "../../layout/PanelLayout.vue";
import BaseListItem from "../../../ui/molecules/BaseListItem.vue"; // <-- Imported unified molecule
import SearchInput from "../../../ui/molecules/SearchInput.vue";

// Hooks
import { usePanelManager } from "../../../../hooks/usePanelManager.js";

const { closePanel } = usePanelManager();

const searchQuery = ref("");

const MENU_OPTIONS = [
  {
    id: "new_group",
    label: "New group",
    icon: UserGroupIcon,
    action: () => console.log("New Group"), // In the future: openPanel('left', NewGroupPanel)
  },
];

const CONTACTS = [
  {
    id: "self",
    name: "Meet Chauhan (You)",
    subtitle: "Message yourself",
    avatar: "https://i.pravatar.cc/150?u=meet",
  },
];
</script>

<template>
  <PanelLayout title="New chat" @back="closePanel('left')">
    <template #subheader>
      <div class="px-3 py-2 border-b border-gray-100">
        <SearchInput
          v-model="searchQuery"
          placeholder="Search users"
          :noMargin="true"
        />
      </div>
    </template>

    <div class="py-2">
      <BaseListItem
        v-for="item in MENU_OPTIONS"
        :key="item.id"
        :title="item.label"
        :icon="item.icon"
        iconBgClass="bg-[#00a884]"
        iconColorClass="text-white"
        :showBorder="false"
        @click="item.action"
      />
    </div>

    <div class="px-8 py-2 text-[#8696a0] text-[15px] font-normal mt-2">
      Contacts on Vami
    </div>

    <div class="flex flex-col pb-6">
      <BaseListItem
        v-for="contact in CONTACTS"
        :key="contact.id"
        :title="contact.name"
        :subtitle="contact.subtitle"
        :avatarUrl="contact.avatar"
        hoverBgClass="hover:bg-gray-50"
      />

      <div
        class="px-8 py-4 text-[#8696a0] text-[15px] font-normal uppercase mt-2"
      >
        #
      </div>

      <BaseListItem
        title="Another User"
        subtitle="Available"
        avatarUrl="https://i.pravatar.cc/150?u=another"
        hoverBgClass="hover:bg-gray-50"
      />
    </div>
  </PanelLayout>
</template>
