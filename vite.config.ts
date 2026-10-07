import {defineConfig} from 'vite';
export default defineConfig({
 server:{host:'127.0.0.1',port:5173,strictPort:true,proxy:{'/api':{target:'http://127.0.0.1:4178',changeOrigin:true,configure(proxy){proxy.on('proxyReq',request=>request.removeHeader('origin'));}}}},
 build:{target:'es2022'},
});
