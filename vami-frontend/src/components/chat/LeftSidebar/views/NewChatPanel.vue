<script setup>
import { ref } from "vue";
import {
  UserGroupIcon,
  UserAdd01Icon,
  UserMultipleIcon,
  // Removed Search01Icon - the Molecule handles this now
} from "hugeicons-vue";

// Components
import SidebarPanelLayout from "../../layout/SidebarPanelLayout.vue";
import ActionListItem from "../../../ui/molecules/ActionListItem.vue";
import ContactListItem from "../../../ui/molecules/ContactListItem.vue";
import SearchInput from "../../../ui/molecules/SearchInput.vue"; // <-- Imported Molecule

const searchQuery = ref("");

const MENU_OPTIONS = [
  {
    id: "new_group",
    label: "New group",
    icon: UserGroupIcon,
    action: () => console.log("New Group"),
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
  <SidebarPanelLayout title="New chat">
    <template #subheader>
      <div class="px-3 py-2 border-b border-white/5">
        <SearchInput
          v-model="searchQuery"
          placeholder="Search users"
          :noMargin="true"
        />
      </div>
    </template>

    <div class="py-2">
      <ActionListItem
        v-for="item in MENU_OPTIONS"
        :key="item.id"
        :label="item.label"
        :icon="item.icon"
        @click="item.action"
      />
    </div>

    <div class="px-8 py-4 text-[#8696a0] text-[15px] font-normal mt-2">
      Contacts on WhatsApp
    </div>

    <div class="flex flex-col pb-6">
      <ContactListItem
        v-for="contact in CONTACTS"
        :key="contact.id"
        :name="contact.name"
        :subtitle="contact.subtitle"
        :avatar="contact.avatar"
      />

      <div
        class="px-8 py-4 text-[#8696a0] text-[15px] font-normal uppercase mt-2"
      >
        #
      </div>

      <ContactListItem
        name="Another User"
        subtitle="Available"
        avatar="https://i.pravatar.cc/150?u=another"
      />
    </div>
  </SidebarPanelLayout>
</template>
