// libs imports
import { createApp } from "vue";
import { createPinia } from "pinia";

// local imports
import "./style.css";
import App from "./App.vue";
import router from "./router/index.js";

const pinia = createPinia();
const app = createApp(App);

app.use(pinia);
app.use(router);

router.isReady().then(() => {
  app.mount("#app");
});
