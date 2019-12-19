import 'vuetify/dist/vuetify.min.css';

import Vue from 'vue';
import App from './App.vue';
import router from './router';
import store from './store';

Vue.config.productionTip = false;

import Vuetify from 'vuetify';

Vue.use(Vuetify);

import VueSplit from 'vue-split-panel';

Vue.use(VueSplit);

new Vue({
    router,
    store,
    render: h => h(App)
}).$mount('#app');
