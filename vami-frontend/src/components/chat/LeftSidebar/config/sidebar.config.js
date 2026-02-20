import {
  UserGroupIcon,
  Archive02Icon,
  StarIcon,
  CheckListIcon,
  TickDouble02Icon,
  LockKeyIcon,
  Logout01Icon,
} from "hugeicons-vue";

export const MAIN_MENU_ACTIONS = [
  { label: "New group", icon: UserGroupIcon, action: "create_group" },
  { label: "Archived", icon: Archive02Icon, action: "view_archived" },
  { label: "Starred messages", icon: StarIcon, action: "view_starred" },
  {
    label: "Select chats",
    icon: CheckListIcon,
    action: "toggle_selection_mode",
  },
  {
    label: "Mark all as read",
    icon: TickDouble02Icon,
    action: "mark_all_read",
  },
  { separator: true },
  { label: "App lock", icon: LockKeyIcon, action: "app_lock" },
  { label: "Log out", icon: Logout01Icon, action: "logout", danger: true },
];
