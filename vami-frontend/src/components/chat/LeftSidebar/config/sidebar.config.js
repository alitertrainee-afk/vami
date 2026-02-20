// Icons
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
  { label: "Log out", icon: Logout01Icon, action: "logout", danger: true },
];
