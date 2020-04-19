import Vue from 'vue'
import App from './App.vue'
// import router from './router'

Vue.config.productionTip = false

// 此処が分からん
new Vue({
  render: h => h(App),
}).$mount('#app')

// new Vue({
//   el: '#app',
//   // router: { router },
//   compontents: { App },
//   template: '<App/>',
// })
